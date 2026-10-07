/**
 * CampusGuard AI — AI analysis service.
 *
 * Single integration seam for everything "AI" in the app:
 *   • analyzeComplaint() — category / sub-category / priority / department /
 *                          summary / suggested action / duplicate count
 *   • detectDuplicates() — possible-duplicate complaint detection
 *   • assistantReply()   — CampusGuard assistant answers
 *
 * V1 ships a deterministic rule-based MOCK provider so the app works with no
 * API key. To connect a real provider, implement `callProvider()` below as a
 * Convex action that reads the key from `process.env.CAMPUSGUARD_AI_API_KEY`
 * (server-side only — never put AI keys in frontend code) and return the same
 * shapes. Nothing else in the app needs to change.
 */

import {
  CATEGORIES,
  findCategory,
  categoryLabel,
  type ComplaintStatus,
  type Priority,
} from "./campus";

export interface AiAnalysis {
  category: string;
  subCategory: string;
  priority: Priority;
  department: string;
  summary: string;
  suggestedAction: string;
  confidence: number;
  duplicateCount: number;
}

export interface AnalyzeInput {
  title: string;
  description: string;
  categoryHint?: string;
  building?: string;
  block?: string;
  floor?: string;
  room?: string;
}

export interface ExistingComplaint {
  id?: string;
  complaintId?: string;
  title: string;
  description: string;
  category: string;
  building: string;
  floor?: string | null;
  status: ComplaintStatus;
  reporterId?: string;
}

export const AI_PROVIDER = {
  name: "CampusGuard Mock AI",
  mode: (typeof globalThis !== "undefined" &&
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.CAMPUSGUARD_AI_API_KEY
    ? "live"
    : "mock") as "live" | "mock",
};

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "in", "of", "on", "to", "and",
  "or", "for", "with", "from", "at", "by", "it", "this", "that", "be", "has",
  "have", "had", "not", "but", "as", "at", "my", "our", "we", "i", "you",
  "they", "he", "she", "it", "there", "here", "very", "continuously", "still",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

function scoreOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach((t) => {
    if (b.has(t)) shared += 1;
  });
  // bonus for shared 4+ char stems (leak/leaking, clean/cleaning …)
  return shared / Math.min(a.size, b.size);
}

const CRITICAL_WORDS = [
  "fire", "smoke", "burning", "spark", "sparking", "shock", "electrocuted",
  "harassment", "harass", "theft", "stolen", "attack", "fight", "gas leak",
  "injured", "injury", "bleeding", "accident", "collapse", "unconscious",
  "stalking", "threat", "emergency",
];

const HIGH_WORDS = [
  "continuous", "continuously", "flooding", "flood", "sewage", "sewer",
  "entire", "whole floor", "all rooms", "burst", "ceiling", "sparking "
  , "mould", "mold", "pest", "cockroach", "unsafe", "dark", "broken gate",
  "unauthorized", "suspicious",
];

/** Pick the category most strongly supported by the free text. */
function inferCategory(input: AnalyzeInput): {
  id: string;
  confidence: number;
} {
  const haystack = `${input.title} ${input.description}`.toLowerCase();

  if (input.categoryHint && input.categoryHint !== "other") {
    const hinted = findCategory(input.categoryHint);
    if (hinted) {
      const hits = hinted.keywords.filter((k) => haystack.includes(k)).length;
      return { id: hinted.id, confidence: hits > 0 ? 0.93 : 0.78 };
    }
  }

  let best = CATEGORIES[CATEGORIES.length - 1];
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (haystack.includes(kw)) score += kw.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  if (bestScore === 0) return { id: "other", confidence: 0.55 };
  return { id: best.id, confidence: Math.min(0.9, 0.65 + bestScore * 0.08) };
}

function inferPriority(
  input: AnalyzeInput,
  categoryId: string,
): { priority: Priority; reason: string } {
  const haystack = `${input.title} ${input.description}`.toLowerCase();

  if (CRITICAL_WORDS.some((w) => haystack.includes(w))) {
    return { priority: "critical", reason: "Emergency keywords detected" };
  }
  if (categoryId === "security" || categoryId === "medical") {
    return { priority: "critical", reason: "Safety-related category" };
  }
  if (HIGH_WORDS.some((w) => haystack.includes(w))) {
    return { priority: "high", reason: "Wide-impact / continuous issue keywords" };
  }
  if (categoryId === "electricity" && /no power|entire|block|main|meter|short/.test(haystack)) {
    return { priority: "high", reason: "Major electrical fault" };
  }
  if (categoryId === "water_leakage" || categoryId === "plumbing" || categoryId === "water_shortage") {
    return { priority: "medium", reason: "Utilities issue affecting an area" };
  }
  if (categoryId === "mess_food" || categoryId === "wifi" || categoryId === "garbage") {
    return { priority: "medium", reason: "Service-affecting issue" };
  }
  if (categoryId === "classroom" || categoryId === "furniture" || categoryId === "road_infra") {
    return { priority: "low", reason: "Localized / non-urgent maintenance" };
  }
  return { priority: "medium", reason: "Default assessment" };
}

function pickSubCategory(catId: string, text: string): string {
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat) return "General issue";
  const lowered = text.toLowerCase();
  const match = cat.subCategories.find((s) => {
    const words = s.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => lowered.includes(w));
  });
  return match ?? cat.subCategories[0] ?? "General issue";
}

function buildSummary(input: AnalyzeInput, categoryLabel_: string): string {
  const title = input.title.trim().replace(/\s+/g, " ");
  const locationBits = [input.building, input.block, input.floor, input.room]
    .filter(Boolean)
    .join(" ");
  const subject = title.length > 90 ? `${title.slice(0, 87)}…` : title;
  return `${subject} — ${categoryLabel_}${locationBits ? ` at ${locationBits}` : ""}.`;
}

function buildAction(categoryId: string, priority: Priority): string {
  const base: Record<string, string> = {
    water_leakage: "Plumbing team to inspect the ceiling line and isolate the supply.",
    water_shortage: "Check overhead tank levels and pump schedule; raise tanker request if low.",
    electricity: "Electrician to inspect the circuit and isolate the faulty line before re-energising.",
    fan_light: "Replace the fan regulator / bulb and check the capacitor.",
    plumbing: "Clear the blockage and pressure-test the line.",
    washroom: "Deep clean, deodorise and replace damaged fittings.",
    cleanliness: "Assign housekeeping for a full sweep and verify with a photo.",
    garbage: "Extra collection round and add segregation signage.",
    wifi: "Network team to check the access point and uplink for the floor.",
    furniture: "Carpentry to repair or replace the damaged unit.",
    classroom: "Facilities to fix the equipment before the next class slot.",
    laboratory: "Lab supervisor to tag the equipment and schedule service.",
    hostel: "Hostel warden to coordinate repairs with the maintenance team.",
    mess_food: "Mess supervisor to review food quality and hygiene logs.",
    security: "Security team to increase patrol and review CCTV footage.",
    road_infra: "Civil team to patch the stretch and install warning signage.",
    parking: "Security to re-mark slots and enforce parking discipline.",
    medical: "Medical centre to attend and log the case.",
    other: "Admin to triage and route to the right department.",
  };
  const prefix =
    priority === "critical"
      ? "URGENT: dispatch immediately, "
      : priority === "high"
        ? "Assign within 12 hours: "
        : "";
  return prefix + (base[categoryId] ?? base.other);
}

/** Possible-duplicate detection against existing complaints. */
export function detectDuplicates(
  candidate: { title: string; description: string; category?: string; building?: string },
  existing: ExistingComplaint[],
): { count: number; matches: string[] } {
  const candTokens = tokens(`${candidate.title} ${candidate.description}`);
  const matches: string[] = [];
  for (const c of existing) {
    // Finished complaints (resolved / closed) are not active duplicates —
    // a new report about them is a genuinely new issue.
    if (c.status === "resolved" || c.status === "closed") continue;
    const samePlace = candidate.building
      ? c.building.toLowerCase() === candidate.building.toLowerCase()
      : true;
    const sameCategory = candidate.category
      ? c.category.toLowerCase() === candidate.category.toLowerCase()
      : false;
    const overlap = scoreOverlap(candTokens, tokens(`${c.title} ${c.description}`));
    const related =
      overlap >= 0.34 || (samePlace && sameCategory && overlap >= 0.18);
    if (related) matches.push(c.complaintId ?? c.id ?? c.title);
  }
  return { count: matches.length, matches: matches.slice(0, 5) };
}

/** Full AI analysis of a new complaint. */
export function analyzeComplaint(
  input: AnalyzeInput,
  existing: ExistingComplaint[] = [],
): AiAnalysis {
  const { id: categoryId, confidence } = inferCategory(input);
  const cat = findCategory(categoryId);
  const { priority } = inferPriority(input, categoryId);
  const text = `${input.title} ${input.description}`;
  const dups = detectDuplicates(
    {
      title: input.title,
      description: input.description,
      category: categoryId,
      building: input.building ?? "",
    },
    existing,
  );

  return {
    category: categoryLabel(categoryId),
    subCategory: pickSubCategory(categoryId, text),
    priority,
    department: cat?.department ?? "Administration",
    summary: buildSummary(input, categoryLabel(categoryId)),
    suggestedAction: buildAction(categoryId, priority),
    confidence: Number(confidence.toFixed(2)),
    duplicateCount: dups.count,
  };
}

export const PRIORITY_RULES = [
  { match: "Water leakage affecting one area", priority: "Medium" },
  { match: "Major electrical problem", priority: "High" },
  { match: "Fire / security / emergency issue", priority: "Critical" },
];

/* ------------------------------------------------------------------ */
/* CampusGuard Assistant (mock)                                       */
/* ------------------------------------------------------------------ */

export interface AssistantContext {
  userName?: string;
  recentComplaints?: {
    complaintId: string;
    title: string;
    status: ComplaintStatus;
    building: string;
  }[];
}

export const ASSISTANT_SUGGESTIONS = [
  "How do I report a water leakage?",
  "Where can I report a hostel problem?",
  "What is the status of my complaint?",
  "Who should I contact for an electrical emergency?",
  "Where is the medical centre?",
  "How do I use the SOS button?",
];

function statusHuman(s: ComplaintStatus): string {
  return {
    submitted: "Submitted (awaiting review)",
    under_review: "Under review by admin",
    assigned: "Assigned to a department",
    in_progress: "Work in progress",
    resolved: "Resolved",
    closed: "Closed",
  }[s];
}

/**
 * Rule-based assistant. Replace with a provider call (server-side) later —
 * the input/output contract stays identical.
 */
export function assistantReply(
  message: string,
  ctx: AssistantContext = {},
): string {
  const q = message.toLowerCase().trim();
  const name = ctx.userName?.split(" ")[0] ?? "there";

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("status", "track", "where is my", "update on")) {
    const recent = ctx.recentComplaints ?? [];
    if (recent.length === 0) {
      return `Hi ${name} — you don't have any complaints logged yet. Head to **Report Problem** in the sidebar and describe the issue with a photo; I'll analyse it and give you a tracking ID like CG-2026-0001.`;
    }
    const lines = recent
      .slice(0, 3)
      .map(
        (c) =>
          `• ${c.complaintId} — ${c.title} (${statusHuman(c.status)}) at ${c.building}`,
      )
      .join("\n");
    return `Here's where your latest reports stand:\n${lines}\n\nOpen **My Complaints → Track** for the full timeline, photos and resolution proof.`;
  }

  if (has("leak", "leaking", "water", "plumbing", "shortage")) {
    return `To report a water leakage:\n1. Open **Report Problem** in the sidebar.\n2. Pick category **Water Leakage** (or Water Shortage / Plumbing).\n3. Set the location: Building → Block → Floor → Room — e.g. Boys Hostel · HR2 · 3rd Floor.\n4. Capture a photo with your camera so the plumbing team can see the exact spot.\n5. Submit — AI assigns a priority (a continuous ceiling leak usually comes back as **High**) and routes it to **Plumbing & Water Works**.`;
  }

  if (has("hostel", "room", "mess water")) {
    return `Hostel problems go through the same **Report Problem** form — choose the **Hostel** or **Mess / Food** category, then pick your building and block (e.g. Boys Hostel → HR2), the floor (floors start at **1st Floor**) and your room. Hostel Maintenance gets it instantly, and your warden is notified. You can also check live issues on the **Campus Map** before reporting to avoid duplicates.`;
  }

  if (has("electrical", "electricity", "power", "shock", "spark", "fan", "light")) {
    if (has("emergency", "shock", "spark", "fire", "burning")) {
      return `For an electrical emergency:\n• Campus Security control room: **1800-102-4455** (24×7)\n• Electrical Maintenance duty officer: **1800-102-0001**\nDo not touch wires or switch panels yourself. If someone is injured, call the Medical Centre at **1800-102-8899** and use the **SOS** button on the Campus Safety page — it instantly alerts the control room (demo mode).`;
    }
    return `Report it under **Electricity** or **Fan / Light**, with the exact room and a photo of the switch board. AI flags major faults (whole-block outages, short circuits) as **High** and routes them to Electrical Maintenance. Minor items like a single bulb are marked **Low**.`;
  }

  if (has("medical", "clinic", "hospital", "ambulance", "sick", "injured", "fever")) {
    return `The **Medical Centre** is next to the Food Court on the student zone side of campus — open 8 AM to 8 PM with a duty doctor, and an ambulance bay for emergencies.\n• Medical emergency: **1800-102-8899**\n• Emergency number: **108**\nFor a campus emergency, use the **SOS** button under Campus Safety so the control room can reach you faster.`;
  }

  if (has("sos", "emergency", "panic", "danger", "attack", "harass")) {
    return `Go to **Campus Safety** and hold the red **SOS** button — a confirmation step prevents accidental activation. Once confirmed, a simulated alert (demo mode, no real emergency services are contacted) is sent to the control room with your location, and Campus Security calls you back. You can also report suspicious activity or an unsafe zone from the same page.`;
  }

  if (has("duplicate", "same issue", "already reported")) {
    return `When you submit, AI compares your report against open complaints using location, category and wording. If it finds related issues you'll see a strip like **"Possible duplicate complaints: 7"**, and admins can merge them so one work order covers everyone. Related reports still count towards your points — only spam or false reports are penalised.`;
  }

  if (has("point", "badge", "reward", "gamif", "guardian")) {
    return `Responsible reporting earns points: Low +5, Medium +10, High +15, Critical +25 once a report is verified. Badges include **First Valid Report**, **Helpful Reporter** (5 valid reports), **Safety Contributor** and **Campus Guardian** (10 valid reports with 80%+ satisfaction). Spam, false or duplicate spam reports earn nothing.`;
  }

  if (has("announc", "notice", "water supply", "maintenance window")) {
    return `Campus announcements — water supply cuts, electricity maintenance, events and emergency notices — appear in your **Notifications** and on the dashboard announcement strip. Admins publish them for students, staff or everyone.`;
  }

  if (has("hello", "hi ", "hey", "who are you", "what can you do")) {
    return `Hi ${name}! I'm the **CampusGuard Assistant**. I can explain how to report problems, check your complaint status, find emergency contacts, locate campus facilities and walk you through badges and SOS. Ask me anything about the campus.`;
  }

  if (has("map", "hotspot", "where are most")) {
    return `Open **Campus Map** for a live view of every open report: red = critical, orange = high, amber = medium, blue = low, green = resolved. The **Problem Hotspots** panel ranks locations by report volume — hostel blocks and the academic block usually lead, which helps admin target patrols and maintenance.`;
  }

  if (has("feedback", "rate", "satisfied", "not solved")) {
    return `After a complaint is resolved you'll get a **Before + After** proof card. Rate it 1–5 stars, leave a comment and tell us *was the problem actually solved?* If you answer **No**, the complaint automatically reopens and is flagged for admin review.`;
  }

  return `I can help with that. Try asking me about:\n• Reporting a problem (leakage, electricity, Wi-Fi, washroom…)\n• Your complaint status and tracking timeline\n• Emergency contacts and the SOS button\n• Campus map, hotspots and announcements\n• Points, badges and feedback\n\nOr jump straight to **Report Problem** in the sidebar to log an issue.`;
}
