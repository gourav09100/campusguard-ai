import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  ChevronRight,
  Crown,
  MapPin,
  Megaphone,
  Phone,
  ShieldAlert,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { BADGES, EMERGENCY_CONTACTS } from "@/lib/campus";
import { timeAgo } from "@/lib/format";
import type { Stats } from "@/lib/stats";

/* ------------------------------------------------------------------ */
/* Quick action tiles                                                  */
/* ------------------------------------------------------------------ */

export function QuickAction({
  to,
  title,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  to?: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: "primary" | "danger" | "soft" | "success";
  onClick?: () => void;
}) {
  const tones = {
    primary:
      "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30",
    danger:
      "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30",
    success:
      "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30",
    soft: "bg-white/70 text-sky-700 shadow-sm ring-1 ring-white/80",
  };
  const content = (
    <div className={`lift flex items-center gap-3 rounded-2xl p-3.5 ${tones[tone]}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur-sm">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span
          className={`block truncate text-xs ${tone === "soft" ? "text-muted-foreground" : "text-white/85"}`}
        >
          {subtitle}
        </span>
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 opacity-80" />
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Resolution statistics                                               */
/* ------------------------------------------------------------------ */

export function ResolutionStats({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const avg = stats.avgResolutionHours;
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Resolution statistics"
        subtitle="Computed from your live complaint data"
        icon={<Target className="size-4" />}
      />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-extrabold tracking-tight">{stats.resolutionPct}%</p>
          <p className="text-xs text-muted-foreground">
            {stats.resolved} of {stats.total} resolved
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            {avg === null ? "—" : `${avg.toFixed(1)}h`}
          </p>
          <p>avg. resolution time</p>
          {stats.avgRating !== null && (
            <p className="mt-1 flex items-center justify-end gap-1 font-semibold text-foreground">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {stats.avgRating.toFixed(1)} rating
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-700"
          style={{ width: `${stats.resolutionPct}%` }}
        />
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="glass-soft rounded-xl p-2">
            <p className="font-bold text-amber-700">{stats.pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </div>
          <div className="glass-soft rounded-xl p-2">
            <p className="font-bold text-blue-700">{stats.inProgress + stats.assigned}</p>
            <p className="text-muted-foreground">Working</p>
          </div>
          <div className="glass-soft rounded-xl p-2">
            <p className="font-bold text-rose-700">{stats.reopened}</p>
            <p className="text-muted-foreground">Reopened</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

const ANNOUNCEMENT_TONE: Record<string, string> = {
  maintenance: "bg-amber-500/12 text-amber-700",
  emergency: "bg-rose-500/12 text-rose-700",
  event: "bg-indigo-500/12 text-indigo-700",
  notice: "bg-cyan-500/12 text-cyan-700",
  general: "bg-slate-500/12 text-slate-700",
};

export interface AnnouncementRow {
  _id: string;
  title: string;
  body: string;
  kind: string;
  audience: string;
  pinned: boolean;
  createdAt: number;
  createdBy: string;
}

export function AnnouncementList({
  announcements,
  emptyHint = "No announcements right now.",
}: {
  announcements: AnnouncementRow[];
  emptyHint?: string;
}) {
  if (announcements.length === 0) {
    return <p className="px-1 py-3 text-sm text-muted-foreground">{emptyHint}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {announcements.slice(0, 4).map((a) => (
        <li key={a._id} className="glass-soft rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${ANNOUNCEMENT_TONE[a.kind] ?? ANNOUNCEMENT_TONE.general}`}
            >
              {a.kind}
            </span>
            {a.pinned && (
              <span className="rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold text-sky-700 uppercase">
                Pinned
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold leading-snug">{a.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementPanel({ announcements }: { announcements: AnnouncementRow[] }) {
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Campus announcements"
        subtitle="Water, power, events & notices"
        icon={<Megaphone className="size-4" />}
        action={
          <Link to="/app/announcements" className="text-xs font-semibold text-sky-700 hover:underline">
            View all
          </Link>
        }
      />
      <AnnouncementList announcements={announcements} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notification preview                                                */
/* ------------------------------------------------------------------ */

const NOTIF_TONE: Record<string, string> = {
  submitted: "bg-sky-500/12 text-sky-700",
  reviewed: "bg-amber-500/12 text-amber-700",
  assigned: "bg-cyan-500/12 text-cyan-700",
  status: "bg-indigo-500/12 text-indigo-700",
  resolved: "bg-emerald-500/12 text-emerald-700",
  closed: "bg-zinc-500/12 text-zinc-700",
  reopened: "bg-rose-500/12 text-rose-700",
  announcement: "bg-violet-500/12 text-violet-700",
  emergency: "bg-red-500/12 text-red-700",
  badge: "bg-orange-500/12 text-orange-700",
  system: "bg-slate-500/12 text-slate-700",
};

export interface NotificationRow {
  _id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: number;
}

export function NotificationPanel({
  notifications,
  emptyHint = "You're all caught up.",
}: {
  notifications: NotificationRow[];
  emptyHint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Notifications"
        subtitle="Complaint updates & alerts"
        icon={<Bell className="size-4" />}
        action={
          <Link to="/app/notifications" className="text-xs font-semibold text-sky-700 hover:underline">
            Open centre
          </Link>
        }
      />
      {notifications.length === 0 ? (
        <p className="px-1 py-3 text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="space-y-2.5">
          {notifications.slice(0, 4).map((n) => (
            <li
              key={n._id}
              className={`glass-soft flex gap-2.5 rounded-xl p-3 ${n.read ? "opacity-75" : ""}`}
            >
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${NOTIF_TONE[n.type] ?? NOTIF_TONE.system}`}
              >
                <Bell className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Safety card                                                         */
/* ------------------------------------------------------------------ */

export function SafetyPanel({ alertCount = 0 }: { alertCount?: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Campus safety"
        subtitle="Emergency contacts on speed dial"
        icon={<ShieldAlert className="size-4" />}
        action={
          <Link
            to="/app/safety"
            className="rounded-full bg-rose-500/12 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-500/20"
          >
            Open SOS
          </Link>
        }
      />
      <ul className="space-y-2">
        {EMERGENCY_CONTACTS.slice(0, 3).map((c) => (
          <li key={c.label} className="glass-soft flex items-center gap-3 rounded-xl p-3">
            <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
              <Phone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{c.label}</p>
              <p className="truncate text-xs text-muted-foreground">{c.note}</p>
            </div>
            <a
              href={`tel:${c.phone.replace(/\s/g, "")}`}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              {c.phone}
            </a>
          </li>
        ))}
      </ul>
      {alertCount > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertTriangle className="size-3.5" />
          {alertCount} active safety alert{alertCount > 1 ? "s" : ""} on campus
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Problem hotspots                                                    */
/* ------------------------------------------------------------------ */

export function HotspotPanel({
  hotspots,
  limit = 5,
}: {
  hotspots: { name: string; count: number; open: number; critical: number }[];
  limit?: number;
}) {
  const top = hotspots.slice(0, limit);
  const max = Math.max(1, ...top.map((h) => h.count));
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Problem hotspots"
        subtitle="Locations with the most reports"
        icon={<MapPin className="size-4" />}
        action={
          <Link to="/app/map" className="text-xs font-semibold text-sky-700 hover:underline">
            Campus map
          </Link>
        }
      />
      {top.length === 0 ? (
        <p className="px-1 py-3 text-sm text-muted-foreground">No reports yet.</p>
      ) : (
        <ul className="space-y-3">
          {top.map((h) => (
            <li key={h.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold">{h.name}</span>
                <span className="text-muted-foreground">
                  {h.count} report{h.count > 1 ? "s" : ""}
                  {h.critical > 0 && (
                    <span className="ml-1 font-bold text-rose-600">· {h.critical} critical</span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400"
                  style={{ width: `${(h.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gamification                                                        */
/* ------------------------------------------------------------------ */

export function BadgesPanel({
  points,
  badges,
  validReports,
  resolvedReports,
}: {
  points: number;
  badges: string[];
  validReports: number;
  resolvedReports: number;
}) {
  const nextBadge = BADGES.find((b) => !badges.includes(b.id));
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Responsible reporting"
        subtitle="Points & badges for valid reports"
        icon={<Award className="size-4" />}
      />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass-soft rounded-xl p-2.5">
          <p className="text-lg font-extrabold text-sky-700">{points}</p>
          <p className="text-[11px] text-muted-foreground">Points</p>
        </div>
        <div className="glass-soft rounded-xl p-2.5">
          <p className="text-lg font-extrabold text-emerald-700">{validReports}</p>
          <p className="text-[11px] text-muted-foreground">Valid reports</p>
        </div>
        <div className="glass-soft rounded-xl p-2.5">
          <p className="text-lg font-extrabold text-cyan-700">{resolvedReports}</p>
          <p className="text-[11px] text-muted-foreground">Resolved</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {BADGES.map((b) => {
          const earned = badges.includes(b.id);
          return (
            <span
              key={b.id}
              title={b.description}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                earned
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-800"
                  : "border-border bg-white/50 text-muted-foreground"
              }`}
            >
              <Award className="size-3" />
              {b.name}
            </span>
          );
        })}
      </div>
      {nextBadge && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Next badge: <strong>{nextBadge.name}</strong> — {nextBadge.description}.
        </p>
      )}
    </div>
  );
}

export function LeaderboardPanel({
  rows,
  currentName,
}: {
  rows: {
    id: string;
    name: string;
    department: string;
    points: number;
    validReports: number;
    badges: string[];
  }[];
  currentName?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <SectionHeader
        title="Campus guardian leaderboard"
        subtitle="Top reporters this semester"
        icon={<Trophy className="size-4" />}
      />
      {rows.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">No reporters yet.</p>
      ) : (
        <ol className="space-y-2">
          {rows.slice(0, 5).map((row, i) => (
            <li
              key={row.id}
              className={`glass-soft flex items-center gap-3 rounded-xl p-2.5 ${
                row.name === currentName ? "ring-1 ring-sky-400/60" : ""
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${
                  i === 0
                    ? "bg-amber-400/25 text-amber-700"
                    : i === 1
                      ? "bg-slate-400/20 text-slate-600"
                      : i === 2
                        ? "bg-orange-400/20 text-orange-700"
                        : "bg-white/70 text-muted-foreground"
                }`}
              >
                {i === 0 ? <Crown className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.department} · {row.validReports} valid reports
                </p>
              </div>
              <span className="text-sm font-extrabold text-sky-700">{row.points}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini bar list                                                       */
/* ------------------------------------------------------------------ */

export function MiniBars({ rows }: { rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-5" />}
        title="No data yet"
        description="Charts appear once complaints start flowing in."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {rows.slice(0, 6).map((r) => (
        <li key={r.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold capitalize">{r.name.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">{r.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-600"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
