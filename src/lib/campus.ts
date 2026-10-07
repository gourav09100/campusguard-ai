/**
 * CampusGuard AI — shared campus domain data.
 *
 * Pure data + pure helpers only (no DOM, no React) so this module can be
 * imported from both the frontend and Convex backend functions.
 * The AI service lives in `./ai.ts`.
 */

export type Priority = "low" | "medium" | "high" | "critical";
export type ComplaintStatus =
  | "submitted"
  | "under_review"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export interface CategoryDef {
  id: string;
  label: string;
  department: string;
  subCategories: string[];
  /** keyword hints used by the AI service */
  keywords: string[];
}

/** The 19 official complaint categories. */
export const CATEGORIES: CategoryDef[] = [
  {
    id: "water_leakage",
    label: "Water Leakage",
    department: "Plumbing & Water Works",
    subCategories: ["Ceiling leakage", "Pipe leakage", "Tap leakage", "Roof leakage", "Wall seepage"],
    keywords: ["leak", "leaking", "leakage", "dripping", "seepage", "ceiling", "wet"],
  },
  {
    id: "water_shortage",
    label: "Water Shortage",
    department: "Plumbing & Water Works",
    subCategories: ["No water supply", "Low pressure", "Hot water", "Tanker needed"],
    keywords: ["no water", "water shortage", "supply", "pressure", "dry tap", "hot water"],
  },
  {
    id: "electricity",
    label: "Electricity",
    department: "Electrical Maintenance",
    subCategories: ["Power cut", "Socket failure", "Short circuit", "Meter issue", "Switch board"],
    keywords: ["electric", "power", "socket", "switch", "short circuit", "shock", "wire", "outlet"],
  },
  {
    id: "fan_light",
    label: "Fan / Light",
    department: "Electrical Maintenance",
    subCategories: ["Fan not working", "Fan noise", "Light bulb", "Flickering light", "AC"],
    keywords: ["fan", "bulb", "light", "flicker", "ac", "cooler", "rotating"],
  },
  {
    id: "plumbing",
    label: "Plumbing",
    department: "Plumbing & Water Works",
    subCategories: ["Blocked drain", "Burst pipe", "Flush issue", "Sink blockage"],
    keywords: ["pipe", "drain", "flush", "sink", "block", "clog", "plumbing"],
  },
  {
    id: "washroom",
    label: "Washroom",
    department: "Sanitation & Hygiene",
    subCategories: ["Unclean", "Blocked", "No water", "Broken fitting", "Smell"],
    keywords: ["washroom", "toilet", "restroom", "urinal", "dirty washroom", "commode"],
  },
  {
    id: "cleanliness",
    label: "Cleanliness",
    department: "Sanitation & Hygiene",
    subCategories: ["Room cleaning", "Corridor", "Floor", "Dusting", "Sweeping"],
    keywords: ["dirty", "clean", "dust", "sweep", "mop", "unhygienic", "stain"],
  },
  {
    id: "garbage",
    label: "Garbage",
    department: "Sanitation & Hygiene",
    subCategories: ["Overflowing bin", "Not collected", "Segregation", "Mess waste"],
    keywords: ["garbage", "trash", "bin", "waste", "smelly", "rubbish", "dustbin"],
  },
  {
    id: "wifi",
    label: "Wi-Fi / Internet",
    department: "IT & Network Services",
    subCategories: ["No connectivity", "Slow speed", "Dropped connection", "Login portal", "Cable"],
    keywords: ["wifi", "wi-fi", "internet", "network", "slow", "router", "proxy", "lan"],
  },
  {
    id: "furniture",
    label: "Furniture",
    department: "General Maintenance",
    subCategories: ["Broken chair", "Broken desk", "Door", "Window", "Cupboard"],
    keywords: ["chair", "desk", "table", "bench", "broken", "window", "door", "drawer"],
  },
  {
    id: "classroom",
    label: "Classroom",
    department: "General Maintenance",
    subCategories: ["Projector", "Board", "Seating", "AC", "Classroom equipment"],
    keywords: ["classroom", "projector", "whiteboard", "blackboard", "marker", "seating"],
  },
  {
    id: "laboratory",
    label: "Laboratory",
    department: "General Maintenance",
    subCategories: ["Equipment", "Chemicals", "Instrument", "Safety gear", "Workstation"],
    keywords: ["lab", "laboratory", "equipment", "instrument", "chemical", "microscope"],
  },
  {
    id: "hostel",
    label: "Hostel",
    department: "Hostel Maintenance",
    subCategories: ["Room repair", "Bed", "Mess water", "Common area", "Hostel gate"],
    keywords: ["hostel", "room", "mess water", "warden", "residence", "h1", "h2", "hr"],
  },
  {
    id: "mess_food",
    label: "Mess / Food",
    department: "Mess & Catering",
    subCategories: ["Food quality", "Hygiene", "Menu", "Timing", "Water in mess"],
    keywords: ["mess", "food", "canteen", "quality", "stale", "menu", "cook", "eating"],
  },
  {
    id: "security",
    label: "Security",
    department: "Campus Security",
    subCategories: ["Unauthorized access", "Harassment", "Gate issue", "Suspicious person", "Lighting dark"],
    keywords: ["security", "suspicious", "theft", "harass", "intruder", "gate", "stalking", "unsafe"],
  },
  {
    id: "road_infra",
    label: "Road / Infrastructure",
    department: "General Maintenance",
    subCategories: ["Pothole", "Street light", "Footpath", "Drainage", "Signage"],
    keywords: ["road", "pothole", "street light", "footpath", "path", "construction", "pit"],
  },
  {
    id: "parking",
    label: "Parking",
    department: "Campus Security",
    subCategories: ["Two wheeler", "Four wheeler", "Space shortage", "Parking rule"],
    keywords: ["parking", "vehicle", "bike", "car", "scooter", "slot"],
  },
  {
    id: "medical",
    label: "Medical",
    department: "Health & Wellness",
    subCategories: ["First aid", "Injury", "Illness", "Ambulance", "Medical centre"],
    keywords: ["medical", "injury", "injured", "sick", "fever", "ambulance", "clinic", "health"],
  },
  {
    id: "other",
    label: "Other",
    department: "Administration",
    subCategories: ["General issue", "Feedback", "Suggestion"],
    keywords: ["other", "general", "misc"],
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function findCategory(idOrLabel: string): CategoryDef | undefined {
  const lowered = idOrLabel.toLowerCase();
  return CATEGORIES.find((c) => c.id === lowered || c.label.toLowerCase() === lowered);
}

/** Priority metadata — badge classes live in components/Badges.tsx. */
export const PRIORITIES: { id: Priority; label: string; slaHours: number; points: number }[] = [
  { id: "low", label: "Low", slaHours: 120, points: 5 },
  { id: "medium", label: "Medium", slaHours: 72, points: 10 },
  { id: "high", label: "High", slaHours: 36, points: 15 },
  { id: "critical", label: "Critical", slaHours: 8, points: 25 },
];

export const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "critical"];

export function prioritySlaHours(p: Priority): number {
  return PRIORITIES.find((x) => x.id === p)?.slaHours ?? 72;
}

/** Status workflow — SUBMITTED → UNDER REVIEW → ASSIGNED → IN PROGRESS → RESOLVED */
export const STATUSES: {
  id: ComplaintStatus;
  label: string;
  step: number;
  description: string;
}[] = [
  { id: "submitted", label: "Submitted", step: 1, description: "Complaint received by CampusGuard" },
  { id: "under_review", label: "Under Review", step: 2, description: "Admin is reviewing the report" },
  { id: "assigned", label: "Assigned", step: 3, description: "Assigned to a department / staff member" },
  { id: "in_progress", label: "In Progress", step: 4, description: "Work is underway on site" },
  { id: "resolved", label: "Resolved", step: 5, description: "Fixed and verified with proof" },
  { id: "closed", label: "Closed", step: 6, description: "Verified by admin and archived" },
];

export function statusStep(s: ComplaintStatus): number {
  return STATUSES.find((x) => x.id === s)?.step ?? 1;
}

export function statusLabel(s: ComplaintStatus): string {
  return STATUSES.find((x) => x.id === s)?.label ?? s;
}

export const STATUS_FLOW: ComplaintStatus[] = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

/** Statuses that count as "done" (resolved and/or archived). */
export function isFinalStatus(s: ComplaintStatus): boolean {
  return s === "resolved" || s === "closed";
}

/** Departments seeded into the database. */
export const DEPARTMENTS: { name: string; description: string; color: string; head: string }[] = [
  { name: "Hostel Maintenance", description: "Hostel rooms, blocks, common areas and mess utilities", color: "#0ea5e9", head: "R. Kulkarni" },
  { name: "Electrical Maintenance", description: "Power supply, wiring, fans, lighting and AC", color: "#f59e0b", head: "S. Iyer" },
  { name: "Plumbing & Water Works", description: "Water supply, leakage, drainage and fittings", color: "#06b6d4", head: "M. Das" },
  { name: "Sanitation & Hygiene", description: "Cleaning, washrooms, garbage and pest control", color: "#10b981", head: "A. Fernandes" },
  { name: "IT & Network Services", description: "Wi-Fi, LAN, portal and lab workstations", color: "#6366f1", head: "P. Nair" },
  { name: "General Maintenance", description: "Furniture, classrooms, roads and infrastructure", color: "#8b5cf6", head: "V. Singh" },
  { name: "Campus Security", description: "Safety, gates, patrols, parking and surveillance", color: "#ef4444", head: "D. Rathore" },
  { name: "Mess & Catering", description: "Mess operations, food quality and hygiene", color: "#f97316", head: "K. Bose" },
  { name: "Health & Wellness", description: "Medical centre, first aid and ambulances", color: "#ec4899", head: "Dr. S. Menon" },
  { name: "Administration", description: "General escalation and cross-department issues", color: "#64748b", head: "Dr. P. Sharma" },
];

export const DEPARTMENT_NAMES = DEPARTMENTS.map((d) => d.name);

/** Campus locations (buildings) with stylised map coordinates (% of map box). */
export const LOCATIONS: {
  name: string;
  kind: "hostel" | "academic" | "facility" | "utility";
  area: string;
  description: string;
  x: number;
  y: number;
}[] = [
  { name: "Boys Hostel", kind: "hostel", area: "Hostel Zone — North", description: "Boys hostel — HR1 (4 floors) and HR2 (8 floors)", x: 24, y: 26 },
  { name: "Girls Hostel", kind: "hostel", area: "Hostel Zone — North", description: "Girls hostel residence — 6 floors", x: 24, y: 62 },
  { name: "Atrium Building", kind: "academic", area: "Academic Zone — Centre", description: "Open atrium, studios and offices — 5 floors", x: 38, y: 54 },
  { name: "Galaria Building", kind: "academic", area: "Student Zone", description: "Galleries and exhibition spaces — 5 floors", x: 62, y: 64 },
  { name: "Lecture Hall Complex", kind: "academic", area: "Academic Zone — East", description: "Lecture theatres and tutorial rooms — 6 floors", x: 70, y: 40 },
  { name: "Indoor Stadium", kind: "facility", area: "East Ground", description: "Indoor courts and arena — no floors", x: 90, y: 64 },
  { name: "Academic Block", kind: "academic", area: "Academic Zone — Centre", description: "Classrooms, faculty offices, seminar halls", x: 52, y: 40 },
  { name: "Library", kind: "academic", area: "Academic Zone — Centre", description: "Central library, reading halls, digital lab", x: 68, y: 24 },
  { name: "Laboratory Block", kind: "academic", area: "Academic Zone — East", description: "CS, Electronics, Mechanical & Chemistry labs", x: 78, y: 52 },
  { name: "Food Court", kind: "facility", area: "Student Zone", description: "Cafeteria, juke counter and open seating", x: 44, y: 72 },
  { name: "Main Gate", kind: "facility", area: "Perimeter — South", description: "Primary entrance, security cabin, visitor desk", x: 58, y: 90 },
  { name: "Medical Centre", kind: "facility", area: "Student Zone", description: "Infirmary, first aid, ambulance bay", x: 34, y: 84 },
  { name: "Sports Complex", kind: "facility", area: "East Ground", description: "Gym, courts, stadium and swimming pool", x: 86, y: 78 },
  { name: "Water Tank Area", kind: "utility", area: "Utility Zone", description: "Overhead tanks and pump room", x: 12, y: 46 },
];

/* ------------------------------------------------------------------ */
/* Floor structure                                                     */
/* ------------------------------------------------------------------ */

/**
 * Floor numbering ALWAYS starts at 1st Floor. CampusGuard has no 0th floor
 * and never shows a "ground floor" label anywhere in the application.
 */
export interface BuildingFloorPlan {
  /** Buildings split into blocks (e.g. Boys Hostel HR1 / HR2), each with its own floor count. */
  blocks?: { name: string; floors: number }[];
  /** Total floors for buildings without blocks — 0 means the location has no floors at all. */
  floors?: number;
}

/** Exact floor structure of every campus location. */
export const FLOOR_PLANS: Record<string, BuildingFloorPlan> = {
  "Boys Hostel": {
    blocks: [
      { name: "HR1", floors: 4 },
      { name: "HR2", floors: 8 },
    ],
  },
  "Girls Hostel": { floors: 6 },
  "Atrium Building": { floors: 5 },
  "Galaria Building": { floors: 5 },
  "Lecture Hall Complex": { floors: 6 },
  "Indoor Stadium": { floors: 0 },
  "Academic Block": { floors: 4 },
  Library: { floors: 3 },
  "Laboratory Block": { floors: 3 },
  "Medical Centre": { floors: 2 },
  "Sports Complex": { floors: 2 },
  "Food Court": { floors: 1 },
  "Main Gate": { floors: 1 },
  "Water Tank Area": { floors: 1 },
};

/** Ordinal floor label: 1 → "1st Floor", 2 → "2nd Floor", … (never a ground-floor label). */
export function ordinalFloor(n: number): string {
  const rem100 = n % 100;
  const rem10 = n % 10;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : rem10 === 1
        ? "st"
        : rem10 === 2
          ? "nd"
          : rem10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix} Floor`;
}

export function floorPlanFor(building: string): BuildingFloorPlan | undefined {
  return FLOOR_PLANS[building];
}

/** Block options for a building (only Boys Hostel has blocks: HR1 / HR2). */
export function blocksFor(building: string): string[] {
  return floorPlanFor(building)?.blocks?.map((b) => b.name) ?? [];
}

/**
 * Valid floor options for a building (+block), starting at 1st Floor.
 * Returns [] for locations with no floors (Indoor Stadium) and for block
 * buildings before a block has been chosen.
 */
export function floorOptionsFor(building: string, block?: string | null): string[] {
  const plan = floorPlanFor(building);
  if (!plan) return [];
  let count: number;
  if (plan.blocks) {
    if (!block) return [];
    count = plan.blocks.find((b) => b.name === block)?.floors ?? 0;
  } else {
    count = plan.floors ?? 0;
  }
  if (count < 1) return [];
  return Array.from({ length: count }, (_, i) => ordinalFloor(i + 1));
}

/**
 * Shared frontend/backend location validation for complaint creation.
 * Returns an error message, or null when the building/block/floor combination
 * is valid. Invalid combos (HR1 → 5th Floor, HR2 → 9th Floor, Girls → 7th,
 * Atrium → 6th, Galaria → 6th, Lecture → 7th, Indoor Stadium + any floor,
 * and any ground-floor value) are always rejected.
 */
export function validateCampusLocation(args: {
  building: string;
  block?: string | null;
  floor?: string | null;
}): string | null {
  const building = args.building?.trim();
  const block = args.block?.trim() || undefined;
  const floor = args.floor?.trim() || undefined;
  const plan = floorPlanFor(building);
  if (!plan) return "Please choose a valid campus location.";
  if (plan.blocks) {
    if (!block) return `Please choose a block for ${building}.`;
    if (!plan.blocks.some((b) => b.name === block)) {
      return `${block} is not a valid block of ${building}.`;
    }
  }
  const options = floorOptionsFor(building, block);
  if (options.length === 0) {
    if (floor) return `${building} has no floors — the location is stored without a floor.`;
    return null;
  }
  if (floor && !options.includes(floor)) {
    return `Invalid floor for ${building}${block ? ` · ${block}` : ""}. Valid floors: ${options[0]} to ${options[options.length - 1]}.`;
  }
  return null;
}

export const CAMPUS_NAME = "North Metropolitan University";
export const CAMPUS_SHORT = "NMU";

/** Gamification badges — earned through valid, non-duplicate reports. */
export const BADGES: { id: string; name: string; description: string; points: number }[] = [
  { id: "first_report", name: "First Valid Report", description: "Submitted your first verified campus report", points: 10 },
  { id: "helpful_reporter", name: "Helpful Reporter", description: "5 valid reports accepted by the campus team", points: 25 },
  { id: "safety_contributor", name: "Safety Contributor", description: "Reported a safety or security concern", points: 20 },
  { id: "campus_guardian", name: "Campus Guardian", description: "10 valid reports with 80%+ resolution feedback", points: 50 },
  { id: "feedback_hero", name: "Feedback Hero", description: "Reviewed a resolved complaint with feedback", points: 5 },
  { id: "quick_responder", name: "Quick Responder", description: "Staff: resolved a complaint inside its SLA", points: 30 },
];

export function badgeById(id: string) {
  return BADGES.find((b) => b.id === id);
}

/** Emergency contacts shown on the Campus Safety page. */
export const EMERGENCY_CONTACTS: {
  label: string;
  person: string;
  phone: string;
  note: string;
}[] = [
  { label: "Campus Security", person: "Control Room", phone: "1800-102-4455", note: "24×7 guard control room at Main Gate" },
  { label: "Medical Emergency", person: "Dr. S. Menon", phone: "1800-102-8899", note: "Medical Centre, ambulance bay" },
  { label: "Fire Emergency", person: "Fire Station", phone: "101", note: "Assembly point: Sports Complex lawn" },
  { label: "CampusGuard Helpline", person: "Duty Officer", phone: "1800-102-0001", note: "Complaint escalation & SOS desk" },
];

/** Safe / unsafe zone guidance for the safety page. */
export const ZONE_INFO: { zone: string; status: "safe" | "caution" | "unsafe"; note: string }[] = [
  { zone: "Academic Block & Library", status: "safe", note: "Well lit, CCTV covered, security patrol every 30 min" },
  { zone: "Hostel perimeters", status: "safe", note: "Biometric entry, warden on duty until 11 PM" },
  { zone: "Water Tank back lane", status: "caution", note: "Dim lighting after 9 PM — report immediately if unsafe" },
  { zone: "Sports Complex east path", status: "caution", note: "Unlit stretch under repair — use the main path" },
  { zone: "Construction stretch (Lab Block rear)", status: "unsafe", note: "Restricted area — do not enter, report trespassing" },
];

export const SOS_DEMO_NOTE =
  "Demo mode: SOS does not contact real emergency services. A simulated alert is sent to the CampusGuard control room.";

/** Location display helper. */
export function formatLocation(c: {
  building: string;
  block?: string | null;
  floor?: string | null;
  room?: string | null;
}): string {
  const parts = [c.building];
  if (c.block) parts.push(c.block);
  if (c.floor) parts.push(c.floor);
  if (c.room) parts.push(c.room);
  return parts.join(" · ");
}

/** Overdue = unresolved and past its priority SLA. */
export function isOverdue(
  createdAt: number,
  resolvedAt: number | null | undefined,
  priority: Priority,
  now = Date.now(),
): boolean {
  if (resolvedAt) return false;
  return now - createdAt > prioritySlaHours(priority) * 3600_000;
}

/**
 * Cutoff timestamp for the complaint board date filter
 * ("today" / "7" / "30" day presets). Returns null when the range is "all".
 */
export function dateFilterCutoff(range: string, now = Date.now()): number | null {
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days = Number(range);
  if (!Number.isFinite(days) || days <= 0) return null;
  return now - days * 86_400_000;
}
