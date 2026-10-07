import {
  Armchair,
  Bath,
  BedDouble,
  Car,
  ClipboardList,
  Construction,
  Droplets,
  FlaskConical,
  HeartPulse,
  Lightbulb,
  Monitor,
  ShieldAlert,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComplaintStatus, Priority } from "@/lib/campus";
import { statusLabel } from "@/lib/campus";

/* ------------------------------------------------------------------ */
/* Priority badges                                                     */
/* ------------------------------------------------------------------ */

export const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-sky-500/12 text-sky-700 border-sky-500/30",
  medium: "bg-amber-500/12 text-amber-700 border-amber-500/30",
  high: "bg-orange-500/14 text-orange-700 border-orange-500/35",
  critical: "bg-rose-500/14 text-rose-700 border-rose-500/35",
};

export const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-sky-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-rose-500 animate-pulse",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${PRIORITY_STYLES[priority]}`}
    >
      <span className={`size-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges                                                       */
/* ------------------------------------------------------------------ */

export const STATUS_STYLES: Record<ComplaintStatus, string> = {
  submitted: "bg-slate-500/12 text-slate-700 border-slate-500/30",
  under_review: "bg-amber-500/12 text-amber-700 border-amber-500/30",
  assigned: "bg-cyan-600/12 text-cyan-700 border-cyan-500/35",
  in_progress: "bg-blue-600/12 text-blue-700 border-blue-500/35",
  resolved: "bg-emerald-600/12 text-emerald-700 border-emerald-500/35",
  closed: "bg-zinc-600/12 text-zinc-700 border-zinc-500/35",
};

export const STATUS_ICON_BG: Record<ComplaintStatus, string> = {
  submitted: "bg-slate-500/12 text-slate-600",
  under_review: "bg-amber-500/12 text-amber-600",
  assigned: "bg-cyan-500/12 text-cyan-600",
  in_progress: "bg-blue-500/12 text-blue-600",
  resolved: "bg-emerald-500/12 text-emerald-600",
  closed: "bg-zinc-500/12 text-zinc-600",
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Role chip                                                           */
/* ------------------------------------------------------------------ */

export const ROLE_STYLES: Record<string, string> = {
  admin: "bg-rose-500/12 text-rose-700 border-rose-500/30",
  teacher: "bg-indigo-500/12 text-indigo-700 border-indigo-500/30",
  student: "bg-cyan-500/12 text-cyan-700 border-cyan-500/30",
  user: "bg-slate-500/12 text-slate-700 border-slate-500/30",
  member: "bg-slate-500/12 text-slate-700 border-slate-500/30",
};

export function RoleChip({ role }: { role?: string | null }) {
  const label =
    role === "admin"
      ? "Admin"
      : role === "teacher"
        ? "Teacher / Staff"
        : role === "student"
          ? "Student"
          : "No role";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${ROLE_STYLES[role ?? "user"]}`}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Category icons                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  water_leakage: Droplets,
  water_shortage: Droplets,
  electricity: Zap,
  fan_light: Lightbulb,
  plumbing: Wrench,
  washroom: Bath,
  cleanliness: Sparkles,
  garbage: Trash2,
  wifi: Wifi,
  furniture: Armchair,
  classroom: Monitor,
  laboratory: FlaskConical,
  hostel: BedDouble,
  mess_food: UtensilsCrossed,
  security: ShieldAlert,
  road_infra: Construction,
  parking: Car,
  medical: HeartPulse,
  other: ClipboardList,
};

export function CategoryIcon({
  category,
  className = "size-4",
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? ClipboardList;
  return <Icon className={className} />;
}

/** Map-style coloured pin classes per priority/status. */
export const MARKER_CLASSES: Record<string, string> = {
  critical: "bg-rose-500 text-white shadow-rose-500/50",
  high: "bg-orange-500 text-white shadow-orange-500/50",
  medium: "bg-amber-400 text-white shadow-amber-400/50",
  low: "bg-sky-500 text-white shadow-sky-500/50",
  resolved: "bg-emerald-500 text-white shadow-emerald-500/50",
};
