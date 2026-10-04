import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  CATEGORIES,
  DEPARTMENTS,
  LOCATIONS,
  type ComplaintStatus,
  type Priority,
} from "../lib/campus";

/* ------------------------------------------------------------------ */
/* Demo photo placeholders (self-contained SVG data URIs)             */
/* ------------------------------------------------------------------ */

function svgPhoto(label: string, variant: "before" | "after" | "issue"): string {
  const palettes = {
    before: ["#7c2d12", "#b45309", "#334155"],
    after: ["#0f766e", "#0891b2", "#155e75"],
    issue: ["#1e3a8a", "#4338ca", "#0f766e"],
  } as const;
  const [c1, c2, c3] = palettes[variant];
  const tag =
    variant === "before"
      ? "BEFORE · reported issue"
      : variant === "after"
        ? "AFTER · resolution proof"
        : "REPORT PHOTO";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="560" fill="url(#g)"/>
  <rect width="800" height="560" fill="url(#grid)"/>
  <circle cx="660" cy="110" r="160" fill="rgba(255,255,255,0.10)"/>
  <circle cx="120" cy="470" r="130" fill="rgba(255,255,255,0.08)"/>
  <rect x="48" y="48" width="240" height="40" rx="20" fill="rgba(255,255,255,0.22)"/>
  <text x="70" y="74" font-family="Inter,Segoe UI,sans-serif" font-size="20" font-weight="700" fill="#ffffff">${tag}</text>
  <text x="48" y="300" font-family="Inter,Segoe UI,sans-serif" font-size="44" font-weight="800" fill="#ffffff">${label.slice(0, 34)}</text>
  <text x="48" y="352" font-family="Inter,Segoe UI,sans-serif" font-size="26" font-weight="500" fill="rgba(255,255,255,0.85)">${label.slice(34, 74)}</text>
  <text x="48" y="512" font-family="Inter,Segoe UI,sans-serif" font-size="20" font-weight="600" fill="rgba(255,255,255,0.75)">CampusGuard AI · ${new Date().getFullYear()}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const urlPhoto = (label: string, variant: "before" | "after" | "issue") => ({
  kind: "url" as const,
  url: svgPhoto(label, variant),
});

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random                                         */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 3600_000;

/* ------------------------------------------------------------------ */
/* Demo accounts                                                       */
/* ------------------------------------------------------------------ */

const DEMO_STUDENTS = [
  { name: "Aarav Mehta", email: "aarav.student@campusguard.app", profileId: "NMU2023CS1042", department: "Computer Science", year: "3rd Year", hostel: "HR2 Hostel", room: "C-312", phone: "+91 98100 11223" },
  { name: "Sneha Iyer", email: "sneha.student@campusguard.app", profileId: "NMU2024EC0871", department: "Electronics", year: "2nd Year", hostel: "HR1 Hostel", room: "B-204", phone: "+91 98100 22334" },
  { name: "Kabir Singh", email: "kabir.student@campusguard.app", profileId: "NMU2022ME0455", department: "Mechanical", year: "4th Year", hostel: "HR2 Hostel", room: "A-118", phone: "+91 98100 33445" },
  { name: "Diya Nair", email: "diya.student@campusguard.app", profileId: "NMU2023CE0612", department: "Civil", year: "3rd Year", hostel: "HR1 Hostel", room: "D-401", phone: "+91 98100 44556" },
  { name: "Rohan Das", email: "rohan.student@campusguard.app", profileId: "NMU2024CS0998", department: "Computer Science", year: "2nd Year", hostel: "HR2 Hostel", room: "B-227", phone: "+91 98100 55667" },
  { name: "Meera Joshi", email: "meera.student@campusguard.app", profileId: "NMU2025MB0117", department: "Management", year: "1st Year", hostel: "HR1 Hostel", room: "A-106", phone: "+91 98100 66778" },
];

const DEMO_STAFF = [
  { name: "Prof. Rahul Kulkarni", email: "rkulkarni.staff@campusguard.app", profileId: "NMU-ST-2211", department: "Hostel Maintenance", designation: "Assistant Engineer" },
  { name: "Prof. Sneha Rajan", email: "srajan.staff@campusguard.app", profileId: "NMU-ST-2245", department: "Electrical Maintenance", designation: "Electrical Supervisor" },
  { name: "Prof. Imran Qureshi", email: "iqureshi.staff@campusguard.app", profileId: "NMU-ST-2290", department: "IT & Network Services", designation: "Network Engineer" },
];

const DEMO_ADMIN = {
  name: "Dr. Priya Sharma",
  email: "admin.demo@campusguard.app",
  profileId: "NMU-AD-0001",
  department: "Administration",
  designation: "Campus Administrator",
};

/* ------------------------------------------------------------------ */
/* Demo complaints                                                     */
/* ------------------------------------------------------------------ */

interface ComplaintSpec {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  priority: Priority;
  status: ComplaintStatus;
  building: string;
  block?: string;
  floor?: string;
  room?: string;
  ageDays: number;
  reporterIndex: number;
  assignedDepartment?: string;
  assignedToName?: string;
  resolution?: string;
  feedback?: { rating: number; comment: string; solved: boolean };
  photos?: boolean;
}

const DETAILED: ComplaintSpec[] = [
  {
    title: "Water continuously leaking from HR2 third floor ceiling",
    description:
      "Water is continuously leaking from the ceiling of Hostel HR2 third floor near room 312. The corridor is wet and students are slipping. Leakage has spread to the staircase wall since last night.",
    category: "water_leakage",
    subCategory: "Ceiling leakage",
    priority: "high",
    status: "in_progress",
    building: "HR2 Hostel",
    block: "Block C",
    floor: "3rd Floor",
    room: "Room 312 / Corridor",
    ageDays: 4,
    reporterIndex: 0,
    assignedDepartment: "Plumbing & Water Works",
    assignedToName: "M. Das",
    photos: true,
  },
  {
    title: "Two ceiling fans in Lecture Hall 204 not working",
    description:
      "Both ceiling fans at the back of Lecture Hall 204 in the Academic Block have stopped working. The hall gets very warm during afternoon classes and around 60 students attend here.",
    category: "fan_light",
    subCategory: "Fan not working",
    priority: "medium",
    status: "assigned",
    building: "Academic Block",
    floor: "2nd Floor",
    room: "Lecture Hall 204",
    ageDays: 2,
    reporterIndex: 2,
    assignedDepartment: "Electrical Maintenance",
    assignedToName: "S. Iyer",
    photos: true,
  },
  {
    title: "Library Wi-Fi dropping every few minutes",
    description:
      "The library reading hall Wi-Fi disconnects every 5–10 minutes since Monday. Portal login loops back to the sign-in page. Students cannot access journals or submit assignments.",
    category: "wifi",
    subCategory: "Dropped connection",
    priority: "medium",
    status: "under_review",
    building: "Library",
    floor: "2nd Floor",
    room: "Reading Hall B",
    ageDays: 1,
    reporterIndex: 4,
    assignedDepartment: "IT & Network Services",
    photos: true,
  },
  {
    title: "Power cut in HR1 Block B since early morning",
    description:
      "Entire Block B of HR1 Hostel has had no electricity since 5 AM. Washroom lights, charging points and water pump are all dead. Nearly 90 students affected.",
    category: "electricity",
    subCategory: "Power cut",
    priority: "high",
    status: "submitted",
    building: "HR1 Hostel",
    block: "Block B",
    floor: "All floors",
    ageDays: 0,
    reporterIndex: 1,
    assignedDepartment: "Electrical Maintenance",
    photos: true,
  },
  {
    title: "Washroom on HR2 second floor very unclean",
    description:
      "The common washroom on HR2 Block A second floor has not been cleaned since yesterday. Bad smell, no cleaning water and one tap is broken. It is used by 40+ students.",
    category: "washroom",
    subCategory: "Unclean",
    priority: "high",
    status: "in_progress",
    building: "HR2 Hostel",
    block: "Block A",
    floor: "2nd Floor",
    room: "Common Washroom",
    ageDays: 3,
    reporterIndex: 4,
    assignedDepartment: "Sanitation & Hygiene",
    assignedToName: "A. Fernandes",
    photos: true,
  },
  {
    title: "Classroom 108 tube light broken",
    description:
      "One tube light in Classroom 108 is broken and the other flickers. Daylight is sufficient for now but it should be replaced before evening classes.",
    category: "fan_light",
    subCategory: "Light bulb",
    priority: "low",
    status: "resolved",
    building: "Academic Block",
    floor: "1st Floor",
    room: "Classroom 108",
    ageDays: 9,
    reporterIndex: 3,
    assignedDepartment: "Electrical Maintenance",
    assignedToName: "S. Iyer",
    resolution:
      "Replaced the tube light with a new LED batten and changed the starter of the flickering one. Verified with the student reporter.",
    feedback: { rating: 5, comment: "Fixed the same evening, thank you!", solved: true },
    photos: true,
  },
  {
    title: "Unauthorised person trying to enter through Main Gate",
    description:
      "A suspicious person without an ID card repeatedly tried to enter through the Main Gate and was filming students near the security cabin. Gate lights are also dim after 8 PM.",
    category: "security",
    subCategory: "Unauthorized access",
    priority: "critical",
    status: "assigned",
    building: "Main Gate",
    room: "Security Cabin",
    ageDays: 1,
    reporterIndex: 5,
    assignedDepartment: "Campus Security",
    assignedToName: "D. Rathore",
    photos: true,
  },
  {
    title: "Garbage bins overflowing at the Food Court",
    description:
      "The three bins outside the Food Court have been overflowing since last evening. Food waste is on the ground and stray dogs are gathering. Very unhygienic for students eating there.",
    category: "garbage",
    subCategory: "Overflowing bin",
    priority: "medium",
    status: "resolved",
    building: "Food Court",
    room: "Outdoor seating",
    ageDays: 6,
    reporterIndex: 1,
    assignedDepartment: "Sanitation & Hygiene",
    assignedToName: "A. Fernandes",
    resolution:
      "Extra collection round added, bins cleared and segregation signage installed. Mess supervisor briefed on hourly checks.",
    feedback: { rating: 4, comment: "Clean now — hope the hourly checks continue.", solved: true },
    photos: true,
  },
];

const GENERATED_TEMPLATES: Omit<
  ComplaintSpec,
  "ageDays" | "reporterIndex" | "status"
>[] = [
  { title: "Damp patch spreading on HR2 Block B ceiling", description: "A damp patch on the Block B ceiling of HR2 is spreading and paint is flaking off above the study desk.", category: "water_leakage", subCategory: "Wall seepage", priority: "high", building: "HR2 Hostel", block: "Block B", floor: "2nd Floor", room: "Room 218", assignedDepartment: "Plumbing & Water Works", assignedToName: "M. Das" },
  { title: "Common washroom not cleaned since morning", description: "The ground floor common washroom of HR1 Block A has not been cleaned since morning and there is no cleaning water.", category: "cleanliness", subCategory: "Sweeping", priority: "medium", building: "HR1 Hostel", block: "Block A", floor: "Ground Floor", assignedDepartment: "Sanitation & Hygiene" },
  { title: "Wi-Fi keeps dropping in the reading hall", description: "Wi-Fi in reading hall drops randomly, especially near the window desks. Online exams are getting interrupted.", category: "wifi", subCategory: "Dropped connection", priority: "medium", building: "Library", floor: "1st Floor", room: "Reading Hall A", assignedDepartment: "IT & Network Services", assignedToName: "I. Qureshi" },
  { title: "Projector bulb dim in seminar hall", description: "The projector in the seminar hall is very dim and the last row cannot read slides.", category: "classroom", subCategory: "Projector", priority: "low", building: "Academic Block", floor: "3rd Floor", room: "Seminar Hall", assignedDepartment: "General Maintenance" },
  { title: "Low water pressure on the second floor", description: "Water pressure on the second floor is very low in the mornings; buckets take forever to fill.", category: "water_shortage", subCategory: "Low pressure", priority: "medium", building: "HR2 Hostel", block: "Block A", floor: "2nd Floor", assignedDepartment: "Plumbing & Water Works" },
  { title: "Street light dead near the water tank path", description: "The street light on the path to the water tank has been dead for three nights making the walk unsafe.", category: "road_infra", subCategory: "Street light", priority: "high", building: "Water Tank Area", assignedDepartment: "Electrical Maintenance" },
  { title: "Scooters blocking the fire lane", description: "Two-wheelers are parked across the fire lane next to the Food Court making it impossible for an ambulance to pass.", category: "parking", subCategory: "Two wheeler", priority: "medium", building: "Food Court", assignedDepartment: "Campus Security" },
  { title: "Power socket sparking at lab workstation 7", description: "The power socket at lab workstation 7 sparks when a laptop charger is plugged in. It smells burnt.", category: "electricity", subCategory: "Short circuit", priority: "critical", building: "Laboratory Block", floor: "2nd Floor", room: "CS Lab 2", assignedDepartment: "Electrical Maintenance", assignedToName: "S. Iyer" },
  { title: "Mess served stale chapatis yesterday", description: "Chapatis at dinner yesterday smelled stale and several students skipped the meal. Please review food quality checks.", category: "mess_food", subCategory: "Food quality", priority: "high", building: "Food Court", room: "Mess Hall", assignedDepartment: "Mess & Catering", assignedToName: "K. Bose" },
  { title: "Pothole growing on the main driveway", description: "A pothole near the main gate driveway has grown after the rain and two-wheelers are skidding on it.", category: "road_infra", subCategory: "Pothole", priority: "medium", building: "Main Gate", assignedDepartment: "General Maintenance" },
  { title: "Blocked drain behind HR1 washing area", description: "The drain behind the HR1 washing area is blocked and dirty water is standing since two days.", category: "plumbing", subCategory: "Blocked drain", priority: "high", building: "HR1 Hostel", block: "Block C", assignedDepartment: "Plumbing & Water Works" },
  { title: "Unknown person loitering near HR1 at night", description: "An unknown person was seen loitering near the HR1 gate past midnight asking students for phone numbers.", category: "security", subCategory: "Suspicious person", priority: "critical", building: "HR1 Hostel", assignedDepartment: "Campus Security", assignedToName: "D. Rathore" },
  { title: "Broken window pane in room 204", description: "The window pane in room 204 is cracked and sharp glass is exposed. Wind breaks it further.", category: "hostel", subCategory: "Room repair", priority: "low", building: "HR2 Hostel", block: "Block A", floor: "2nd Floor", room: "Room 204", assignedDepartment: "General Maintenance" },
  { title: "First aid kit in the lab is empty", description: "During a small cut injury today we found the lab first aid kit completely empty — no bandages or antiseptic.", category: "medical", subCategory: "First aid", priority: "high", building: "Laboratory Block", floor: "Ground Floor", room: "CS Lab 1", assignedDepartment: "Health & Wellness", assignedToName: "Dr. S. Menon" },
  { title: "CCTV camera not recording at the side gate", description: "The CCTV dome above the side gate shows no feed on the control room monitor since last week.", category: "security", subCategory: "Surveillance", priority: "high", building: "Main Gate", assignedDepartment: "Campus Security", assignedToName: "D. Rathore" },
  { title: "Lab machines fail to boot in CS Lab 3", description: "Eight machines in CS Lab 3 hang on the boot screen, wasting the first twenty minutes of every practical.", category: "laboratory", subCategory: "Equipment", priority: "medium", building: "Laboratory Block", floor: "3rd Floor", room: "CS Lab 3", assignedDepartment: "IT & Network Services" },
  { title: "Broken chair in the tutorial room", description: "One chair in the tutorial room has a broken leg and collapses when someone sits.", category: "furniture", subCategory: "Broken chair", priority: "low", building: "Academic Block", floor: "1st Floor", room: "Tutorial Room 12", assignedDepartment: "General Maintenance" },
  { title: "Toilet seat broken in Block C washroom", description: "A toilet seat is broken in the Block C washroom and the cubicle is out of order.", category: "washroom", subCategory: "Broken fitting", priority: "medium", building: "HR2 Hostel", block: "Block C", floor: "1st Floor", assignedDepartment: "Sanitation & Hygiene" },
];

const HISTORY_NOTES: Record<ComplaintStatus, string> = {
  submitted: "Complaint submitted with photo evidence",
  under_review: "Admin reviewed and validated the report",
  assigned: "Assigned to the responsible department",
  in_progress: "Maintenance team started work on site",
  resolved: "Resolved and verified with proof photos",
};

const DEMO_SEED_EMAIL = "demo.student@campusguard.app";
const CLAIMED_POOL_EMAIL = "demo.claimed@campusguard.app";

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

async function ensureDepartmentsAndLocations(ctx: MutationCtx) {
  const existingDepts = await ctx.db.query("departments").collect();
  if (existingDepts.length === 0) {
    for (const d of DEPARTMENTS) {
      await ctx.db.insert("departments", { ...d, createdAt: Date.now() });
    }
  }
  const existingLocs = await ctx.db.query("locations").collect();
  if (existingLocs.length === 0) {
    for (const l of LOCATIONS) {
      await ctx.db.insert("locations", { ...l, createdAt: Date.now() });
    }
  }
}

async function ensureDemoUsers(ctx: MutationCtx) {
  const users = await ctx.db.query("users").collect();
  const byEmail = new Map(users.map((u) => [u.email ?? "", u]));

  let studentId: Id<"users"> | null = (byEmail.get(DEMO_SEED_EMAIL)?._id as Id<"users">) ?? null;
  if (!studentId) {
    const s = DEMO_STUDENTS[0];
    studentId = await ctx.db.insert("users", {
      name: s.name,
      email: DEMO_SEED_EMAIL,
      role: "student",
      profileId: s.profileId,
      department: s.department,
      year: s.year,
      hostel: s.hostel,
      room: s.room,
      phone: s.phone,
      points: 185,
      validReports: 7,
      resolvedReports: 5,
      badges: ["first_report", "helpful_reporter", "safety_contributor"],
      joinedAt: Date.now() - 160 * DAY,
      prefs: {
        complaintUpdates: true,
        announcements: true,
        emergencyAlerts: true,
        emailDigest: false,
      },
    });
  }

  for (const s of DEMO_STUDENTS.slice(1)) {
    if (byEmail.has(s.email)) continue;
    await ctx.db.insert("users", {
      name: s.name,
      email: s.email,
      role: "student",
      profileId: s.profileId,
      department: s.department,
      year: s.year,
      hostel: s.hostel,
      room: s.room,
      phone: s.phone,
      points: 40 + Math.floor(Math.random() * 120),
      validReports: 1 + Math.floor(Math.random() * 5),
      resolvedReports: 1 + Math.floor(Math.random() * 4),
      badges: ["first_report"],
      joinedAt: Date.now() - 150 * DAY,
      prefs: {
        complaintUpdates: true,
        announcements: true,
        emergencyAlerts: true,
        emailDigest: false,
      },
    });
  }

  for (const s of DEMO_STAFF) {
    if (byEmail.has(s.email)) continue;
    await ctx.db.insert("users", {
      name: s.name,
      email: s.email,
      role: "teacher",
      profileId: s.profileId,
      department: s.department,
      designation: s.designation,
      points: 320,
      badges: ["quick_responder"],
      joinedAt: Date.now() - 200 * DAY,
      prefs: {
        complaintUpdates: true,
        announcements: true,
        emergencyAlerts: true,
        emailDigest: true,
      },
    });
  }

  if (!byEmail.has(DEMO_ADMIN.email)) {
    await ctx.db.insert("users", {
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      role: "admin",
      profileId: DEMO_ADMIN.profileId,
      department: DEMO_ADMIN.department,
      designation: DEMO_ADMIN.designation,
      joinedAt: Date.now() - 300 * DAY,
      prefs: {
        complaintUpdates: true,
        announcements: true,
        emergencyAlerts: true,
        emailDigest: true,
      },
    });
  }

  return { studentId };
}

async function insertComplaint(
  ctx: MutationCtx,
  spec: ComplaintSpec,
  reporterId: Id<"users">,
  reporterName: string,
  index: number,
  now: number,
): Promise<Id<"complaints">> {
  const createdAt = now - spec.ageDays * DAY;
  const code = `CG-${new Date(createdAt).getFullYear()}-${String(1000 + index).padStart(6, "0")}`;
  const category = CATEGORIES.find((c) => c.id === spec.category);

  const stepOf: Record<ComplaintStatus, number> = {
    submitted: 1,
    under_review: 2,
    assigned: 3,
    in_progress: 4,
    resolved: 5,
  };
  const step = stepOf[spec.status];

  const photos = spec.photos
    ? [
        urlPhoto(spec.title.replace(/^(Water|Two|Power|Library|Classroom|Unauthorised|Garbage)/, "").trim().slice(0, 34), spec.status === "resolved" ? "before" : "issue"),
      ]
    : [];

  const resolvedAt =
    spec.status === "resolved"
      ? createdAt + Math.max(6, spec.ageDays * 0.4) * 3600_000
      : undefined;

  const id = await ctx.db.insert("complaints", {
    complaintId: code,
    title: spec.title,
    description: spec.description,
    category: spec.category,
    subCategory: spec.subCategory,
    priority: spec.priority,
    status: spec.status,
    campus: "North Metropolitan University",
    building: spec.building,
    block: spec.block,
    floor: spec.floor,
    room: spec.room,
    reporterId,
    reporterName,
    photos,
    ai: {
      category: category?.label ?? spec.category,
      subCategory: spec.subCategory,
      priority: spec.priority,
      department: spec.assignedDepartment ?? category?.department ?? "Administration",
      summary: `${spec.title} — ${category?.label ?? spec.category} at ${spec.building}.`,
      suggestedAction:
        spec.priority === "critical"
          ? "URGENT: dispatch immediately, coordinate with campus security."
          : "Department to inspect, fix and upload proof photos.",
      confidence: 0.86,
      duplicateCount: 0,
    },
    assignedDepartment: spec.assignedDepartment,
    assignedToName: spec.assignedToName,
    resolvedAt,
    resolutionNote: spec.resolution,
    resolvedBy: spec.resolution ? (spec.assignedToName ?? "Campus Team") : undefined,
    resolutionPhotos: spec.resolution
      ? [urlPhoto(`${spec.building} — fixed`, "after")]
      : undefined,
    feedback: spec.feedback
      ? { ...spec.feedback, createdAt: resolvedAt ?? createdAt + DAY }
      : undefined,
    createdAt,
    updatedAt: resolvedAt ?? createdAt,
    reopenedCount: 0,
  });

  const statuses: ComplaintStatus[] = [
    "submitted",
    "under_review",
    "assigned",
    "in_progress",
    "resolved",
  ];
  for (let s = 0; s < step; s++) {
    const status = statuses[s];
    await ctx.db.insert("statusHistory", {
      complaintId: id,
      status,
      note: HISTORY_NOTES[status],
      actorName:
        status === "submitted"
          ? reporterName
          : status === "under_review"
            ? "Dr. Priya Sharma"
            : spec.assignedToName ?? "Campus Team",
      actorRole:
        status === "submitted" ? "student" : status === "under_review" ? "admin" : "teacher",
      createdAt: createdAt + s * 5 * 3600_000,
    });
  }
  if (spec.feedback) {
    await ctx.db.insert("statusHistory", {
      complaintId: id,
      status: "resolved",
      note: `Feedback: ${spec.feedback.rating}★ — ${
        spec.feedback.solved ? "problem solved" : "problem persists"
      }`,
      actorName: reporterName,
      actorRole: "student",
      createdAt: resolvedAt ?? createdAt + DAY,
    });
  }
  return id;
}

export const ensureDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_key", (q) => q.eq("key", "root"))
      .first();
    if (counter?.seeded) return { seeded: true, message: "Demo data already loaded" };

    await ensureDepartmentsAndLocations(ctx);
    const { studentId } = await ensureDemoUsers(ctx);
    if (!studentId) throw new Error("Could not create demo users");

    const reporterNames = DEMO_STUDENTS.map((s) => s.name);
    const now = Date.now();
    const random = rng(20260214);

    // 8 detailed spec complaints first (stable codes CG-…001000+)
    let index = 1000;
    for (const spec of DETAILED) {
      await insertComplaint(
        ctx,
        spec,
        studentId,
        reporterNames[spec.reporterIndex % reporterNames.length],
        index++,
        now,
      );
    }

    // Generated backlog for realistic analytics / hotspots / trends
    const statusPool: ComplaintStatus[] = [
      "resolved",
      "resolved",
      "resolved",
      "resolved",
      "in_progress",
      "assigned",
      "under_review",
      "submitted",
      "resolved",
      "in_progress",
    ];
    for (let i = 0; i < 30; i++) {
      const template = GENERATED_TEMPLATES[i % GENERATED_TEMPLATES.length];
      const ageDays = 3 + Math.floor(random() * 145);
      const status = statusPool[Math.floor(random() * statusPool.length)];
      const reporterIndex = Math.floor(random() * DEMO_STUDENTS.length);
      await insertComplaint(
        ctx,
        { ...template, ageDays, status, reporterIndex },
        studentId,
        reporterNames[reporterIndex],
        index++,
        now,
      );
    }

    // Campus announcements
    const announcements = [
      {
        title: "Water supply interruption — HR1 & HR2, 6 AM to 10 AM",
        body: "Overhead tank cleaning on Saturday. Store water on Friday night. Portable water stations will be placed near each block entrance.",
        kind: "maintenance" as const,
        audience: "students" as const,
        pinned: true,
      },
      {
        title: "Electricity maintenance in Academic Block this weekend",
        body: "Power will be interrupted in the Academic Block from 10 AM to 4 PM on Sunday for DB board servicing. Labs will remain closed.",
        kind: "maintenance" as const,
        audience: "all" as const,
        pinned: false,
      },
      {
        title: "Campus safety drill — Wednesday 11 AM",
        body: "A fire and evacuation drill will run across all hostels and academic buildings. Report to your nearest assembly point. SOS demos will be paused during the drill.",
        kind: "emergency" as const,
        audience: "all" as const,
        pinned: false,
      },
    ];
    const existingAnnouncements = await ctx.db.query("announcements").collect();
    if (existingAnnouncements.length === 0) {
      for (const a of announcements) {
        await ctx.db.insert("announcements", {
          ...a,
          createdBy: DEMO_ADMIN.name,
          createdAt: now - Math.floor(random() * 5) * DAY,
        });
      }
    }

    // Safety reports
    const existingEmergency = await ctx.db.query("emergencyReports").collect();
    if (existingEmergency.length === 0) {
      await ctx.db.insert("emergencyReports", {
        kind: "unsafe_zone",
        title: "Dim lighting on the water tank back lane",
        details: "Two lamps are dead on the back lane. Students report it feels unsafe after 9 PM. Electrical team to replace lamps.",
        location: "Water Tank Area — back lane",
        reporterName: "Campus Patrol",
        status: "acknowledged",
        simulated: true,
        createdAt: now - 2 * DAY,
      });
      await ctx.db.insert("emergencyReports", {
        kind: "suspicious",
        title: "Unknown vehicle circling the hostel gates",
        details: "A grey sedan circled HR1 and HR2 gates repeatedly at night. Gate camera footage shared with security.",
        location: "HR1 / HR2 Hostel gates",
        reporterName: "Gate Security",
        status: "resolved",
        simulated: true,
        createdAt: now - 6 * DAY,
      });
    }

    if (!counter) {
      await ctx.db.insert("counters", {
        key: "root",
        nextComplaint: 1300,
        seeded: true,
      });
    } else {
      await ctx.db.patch(counter._id, { seeded: true, nextComplaint: 1300 });
    }

    return { seeded: true, complaints: index - 1000 };
  },
});

export { DEMO_SEED_EMAIL, CLAIMED_POOL_EMAIL };
