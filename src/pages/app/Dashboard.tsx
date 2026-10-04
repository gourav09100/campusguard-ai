import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Siren,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Link, Navigate } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ComplaintCard } from "@/components/campus/ComplaintCard";
import { PriorityBadge } from "@/components/campus/Badges";
import { CategoryBars, PriorityDonut, TrendChart } from "@/components/campus/Charts";
import { EmptyState, SectionHeader, StatCard } from "@/components/campus/Cards";
import { useAuth } from "@/hooks/use-auth";
import { byCategory, byDepartment, computeStats, hotspots, monthlyTrend, type ComplaintLike } from "@/lib/stats";
import { isOverdue } from "@/lib/campus";
import { durationHuman } from "@/lib/format";
import {
  AnnouncementPanel,
  BadgesPanel,
  HotspotPanel,
  LeaderboardPanel,
  MiniBars,
  NotificationPanel,
  QuickAction,
  ResolutionStats,
  SafetyPanel,
} from "./dashboard/Shared";

type Role = "student" | "teacher" | "admin";

type PublicComplaintRows = FunctionReturnType<typeof api.complaints.listPublic>;
type AnnouncementRows = FunctionReturnType<typeof api.announcements.list>;
type NotificationRows = FunctionReturnType<typeof api.notifications.list>;
type AlertRows = FunctionReturnType<typeof api.emergency.activeAlerts>;
type LeaderboardRows = FunctionReturnType<typeof api.profile.leaderboard>;

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass h-64 animate-pulse rounded-2xl" />
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}

/* ================================================================== */
/* STUDENT DASHBOARD                                                   */
/* ================================================================== */

function StudentView({
  user,
  complaints,
  publicRows,
  announcements,
  notifications,
  alerts,
  leaderboard,
}: {
  user: Doc<"users">;
  complaints: Doc<"complaints">[];
  publicRows: PublicComplaintRows;
  announcements: AnnouncementRows;
  notifications: NotificationRows;
  alerts: AlertRows;
  leaderboard: LeaderboardRows;
}) {
  const stats = computeStats(complaints);
  const recent = [...complaints]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  const campusHotspots = hotspots(publicRows as ComplaintLike[]);
  const duplicateInsights = complaints
    .filter((c) => c.status !== "resolved" && (c.ai?.duplicateCount ?? 0) > 0)
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-sky-300/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              {greeting}, {user.name?.split(" ")[0] ?? "student"} 👋
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Your campus, <span className="text-gradient-brand">guarded</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Report hostel or campus problems, track every fix with photo proof and earn
              badges for keeping the campus safe.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-sky-700">{user.points ?? 0}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Points
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-emerald-700">
                {user.badges?.length ?? 0}
              </p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Badges
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/app/report"
            title="Report Problem"
            subtitle="Photo · location · AI priority"
            icon={<AlertOctagon className="size-5" />}
            tone="primary"
          />
          <QuickAction
            to="/app/safety"
            title="Emergency SOS"
            subtitle="Alert the control room"
            icon={<Siren className="size-5" />}
            tone="danger"
          />
          <QuickAction
            to="/app/track"
            title="Track Complaint"
            subtitle="Enter your CG tracking ID"
            icon={<Target className="size-5" />}
            tone="soft"
          />
          <QuickAction
            to="/app/map"
            title="Campus Map"
            subtitle="Live problem hotspots"
            icon={<MapPin className="size-5" />}
            tone="soft"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total complaints"
          value={stats.total}
          hint="All your reports"
          icon={<FileText className="size-5" />}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          hint="Awaiting review"
          icon={<Clock className="size-5" />}
          tone="warn"
        />
        <StatCard
          label="In progress"
          value={stats.assigned + stats.inProgress}
          hint="Team is working"
          icon={<Loader2 className="size-5" />}
          tone="info"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          hint={`${stats.resolutionPct}% resolution rate`}
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          hint={stats.overdue > 0 ? `${stats.overdue} overdue` : "Within SLA"}
          icon={<Siren className="size-5" />}
          tone="danger"
        />
      </div>

      {/* Resolution stats + AI insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ResolutionStats stats={stats} />
        </div>
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <SectionHeader
            title="CampusGuard AI insights"
            subtitle="Automatic analysis of your reports"
            icon={<Sparkles className="size-4" />}
          />
          {duplicateInsights.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              AI analyses every submission — category, priority, department and similar open
              reports. Submit a report to see insights here.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {duplicateInsights.map((c) => (
                <li key={c._id} className="glass-soft rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-sky-700">
                      {c.complaintId}
                    </span>
                    <PriorityBadge priority={c.priority} />
                    <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      Possible duplicate complaints: {c.ai?.duplicateCount ?? 0}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.ai?.summary}</p>
                  <p className="mt-1 text-xs text-sky-700">
                    Suggested: {c.ai?.suggestedAction}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent complaints */}
      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Recent complaints"
          subtitle="Your latest campus reports"
          icon={<FileText className="size-4" />}
          action={
            <Link
              to="/app/complaints"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState
            icon={<AlertOctagon className="size-5" />}
            title="No complaints yet"
            description="Spotted a leak, a dead fan or a dark corridor? Report it in under a minute."
            action={
              <Link
                to="/app/report"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30"
              >
                Report your first problem <ArrowRight className="size-4" />
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {recent.map((c) => (
              <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} />
            ))}
          </div>
        )}
      </div>

      {/* Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NotificationPanel notifications={notifications} />
        <AnnouncementPanel announcements={announcements} />
        <HotspotPanel hotspots={campusHotspots} />
        <SafetyPanel alertCount={alerts.length} />
        <BadgesPanel
          points={user.points ?? 0}
          badges={user.badges ?? []}
          validReports={user.validReports ?? 0}
          resolvedReports={user.resolvedReports ?? 0}
        />
        <LeaderboardPanel rows={leaderboard} currentName={user.name} />
      </div>
    </div>
  );
}

/* ================================================================== */
/* TEACHER / STAFF DASHBOARD                                           */
/* ================================================================== */

function StaffView({
  user,
  complaints,
  publicRows,
  announcements,
  notifications,
}: {
  user: Doc<"users">;
  complaints: Doc<"complaints">[];
  publicRows: PublicComplaintRows;
  announcements: AnnouncementRows;
  notifications: NotificationRows;
}) {
  const stats = computeStats(complaints);
  const open = complaints.filter((c) => c.status !== "resolved");
  const newAssignments = open.filter((c) => c.status === "assigned");
  const queue = [...open].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt;
  });
  const recentlyResolved = complaints
    .filter((c) => c.status === "resolved")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
    .slice(0, 4);
  const priorityCount = open.filter(
    (c) => c.priority === "critical" || c.priority === "high",
  ).length;

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-indigo-300/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              Staff workspace · {user.department ?? "Campus Maintenance"}
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Resolve what matters, <span className="text-gradient-brand">first</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {user.name} ({user.designation ?? "Staff"}) — tasks routed to your department,
              work notes, resolution proofs and escalation in one place.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-indigo-700">{open.length}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Open tasks
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-rose-700">{priorityCount}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                High priority
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid gap-2.5 sm:grid-cols-3">
          <QuickAction
            to="/app/complaints"
            title="My assignments"
            subtitle={`${newAssignments.length} new · ${open.length} open`}
            icon={<FileText className="size-5" />}
            tone="primary"
          />
          <QuickAction
            to="/app/notifications"
            title="Assignment alerts"
            subtitle="New tasks from admin"
            icon={<Activity className="size-5" />}
            tone="soft"
          />
          <QuickAction
            to="/app/assistant"
            title="AI Assistant"
            subtitle="SOPs, contacts & guidance"
            icon={<Sparkles className="size-5" />}
            tone="soft"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="New assignments" value={newAssignments.length} hint="Waiting to start" icon={<FileText className="size-5" />} tone="info" />
        <StatCard label="Under review" value={stats.underReview} hint="Validate first" icon={<Clock className="size-5" />} tone="warn" />
        <StatCard label="In progress" value={stats.inProgress} hint="Work underway" icon={<Loader2 className="size-5" />} />
        <StatCard label="Resolved" value={stats.resolved} hint={`${stats.resolutionPct}% of yours`} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatCard label="Critical / High" value={priorityCount} hint="Needs attention" icon={<Siren className="size-5" />} tone="danger" />
        <StatCard label="Overdue" value={stats.overdue} hint="Past priority SLA" icon={<Timer className="size-5" />} tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Priority queue"
              subtitle="Sorted by severity, then age"
              icon={<TrendingUp className="size-4" />}
              action={
                <Link to="/app/complaints" className="text-xs font-semibold text-sky-700 hover:underline">
                  Open board
                </Link>
              }
            />
            {queue.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-5" />}
                title="Queue is clear"
                description="No open tasks in your department right now."
              />
            ) : (
              <div className="space-y-2.5">
                {queue.slice(0, 6).map((c) => (
                  <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} showReporter />
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Recently resolved"
              subtitle="Proof uploads & feedback"
              icon={<CheckCircle2 className="size-4" />}
            />
            {recentlyResolved.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                Resolved tasks will show here with their proof photos.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentlyResolved.map((c) => (
                  <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} showReporter />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ResolutionStats stats={stats} />
          <div className="glass rounded-2xl p-4">
            <SectionHeader title="Your workload" subtitle="By category" icon={<BarChart3 className="size-4" />} />
            <MiniBars rows={byCategory(complaints as ComplaintLike[]).map((r) => ({ name: r.name, count: r.count }))} />
          </div>
          <AnnouncementPanel announcements={announcements} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NotificationPanel notifications={notifications} />
        <HotspotPanel hotspots={hotspots(publicRows as ComplaintLike[])} />
      </div>
    </div>
  );
}

/* ================================================================== */
/* ADMIN DASHBOARD                                                     */
/* ================================================================== */

function AdminView({
  complaints,
  publicRows,
  announcements,
  notifications,
  alerts,
}: {
  complaints: Doc<"complaints">[];
  publicRows: PublicComplaintRows;
  announcements: AnnouncementRows;
  notifications: NotificationRows;
  alerts: AlertRows;
}) {
  const stats = computeStats(complaints);
  const trend = useMemo(() => monthlyTrend(complaints as ComplaintLike[], 6), [complaints]);
  const prio = ["critical", "high", "medium", "low"].map((p) => ({
    name: p,
    count: complaints.filter((c) => c.priority === p).length,
  }));
  const categoryRows = byCategory(complaints as ComplaintLike[]).map((r) => ({
    name: r.name.replace(/_/g, " "),
    count: r.count,
  }));
  const deptRows = byDepartment(complaints as ComplaintLike[])
    .slice(0, 6)
    .map((r) => ({ name: r.name, count: r.count }));

  const attention = complaints
    .filter(
      (c) =>
        c.status !== "resolved" &&
        (c.priority === "critical" || isOverdue(c.createdAt, c.resolvedAt, c.priority)),
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5);

  const recent = [...complaints].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-sky-300/45 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">Command centre · North Metropolitan University</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Campus operations <span className="text-gradient-brand">at a glance</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Live complaints, SLA breaches, department performance and safety alerts across
              every block and hostel.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-sky-700">{stats.resolutionPct}%</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Resolved
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-indigo-700">
                {stats.avgResolutionHours === null ? "—" : `${stats.avgResolutionHours.toFixed(1)}h`}
              </p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Avg. resolution
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/app/complaints" title="Manage complaints" subtitle="Assign, merge, resolve" icon={<FileText className="size-5" />} tone="primary" />
          <QuickAction to="/app/analytics" title="Analytics & reports" subtitle="Trends, SLA, satisfaction" icon={<BarChart3 className="size-5" />} tone="soft" />
          <QuickAction to="/app/manage" title="Users & roles" subtitle="Students, staff, admins" icon={<Activity className="size-5" />} tone="soft" />
          <QuickAction to="/app/safety" title="Safety desk" subtitle={`${alerts.length} active alerts`} icon={<Siren className="size-5" />} tone="danger" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total complaints" value={stats.total} hint="All time" icon={<FileText className="size-5" />} />
        <StatCard label="Pending" value={stats.pending} hint={`${stats.underReview} under review`} icon={<Clock className="size-5" />} tone="warn" />
        <StatCard label="Assigned" value={stats.assigned} hint="Routed to departments" icon={<Target className="size-5" />} tone="info" />
        <StatCard label="In progress" value={stats.inProgress} hint="Work underway" icon={<Loader2 className="size-5" />} />
        <StatCard label="Resolved" value={stats.resolved} hint={`${stats.resolutionPct}% of total`} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatCard label="Critical open" value={stats.critical} hint="Emergency triage" icon={<Siren className="size-5" />} tone="danger" />
        <StatCard label="Overdue" value={stats.overdue} hint="Past priority SLA" icon={<Timer className="size-5" />} tone="danger" />
        <StatCard label="Avg. resolution" value={stats.avgResolutionHours === null ? "—" : durationHuman(stats.avgResolutionHours * 3600_000)} hint="Report → fixed" icon={<Timer className="size-5" />} tone="info" />
        <StatCard label="Reopened" value={stats.reopened} hint="Feedback rejected" icon={<AlertOctagon className="size-5" />} tone="warn" />
        <StatCard
          label="Satisfaction"
          value={stats.avgRating === null ? "—" : `${stats.avgRating.toFixed(1)}★`}
          hint="Average rating"
          icon={<Star className="size-5" />}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <SectionHeader
            title="Monthly complaint trend"
            subtitle="Reported vs resolved, last 6 months"
            icon={<TrendingUp className="size-4" />}
            action={
              <Link to="/app/analytics" className="text-xs font-semibold text-sky-700 hover:underline">
                Full analytics
              </Link>
            }
          />
          <TrendChart data={trend} height={230} />
        </div>
        <div className="glass rounded-2xl p-4">
          <SectionHeader title="By priority" subtitle="Open + resolved mix" icon={<Siren className="size-4" />} />
          <PriorityDonut rows={prio} height={230} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <SectionHeader title="Top categories" subtitle="Where problems cluster" icon={<BarChart3 className="size-4" />} />
          <CategoryBars rows={categoryRows} height={240} />
        </div>
        <div className="glass rounded-2xl p-4">
          <SectionHeader title="Department load" subtitle="Complaints per team" icon={<Activity className="size-4" />} />
          <MiniBars rows={deptRows} />
        </div>
        <div className="space-y-4">
          <HotspotPanel hotspots={hotspots(publicRows as ComplaintLike[])} limit={5} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <SectionHeader
            title="Needs attention"
            subtitle="Critical & overdue complaints"
            icon={<AlertOctagon className="size-4" />}
            action={
              <Link to="/app/complaints" className="text-xs font-semibold text-sky-700 hover:underline">
                Open board
              </Link>
            }
          />
          {attention.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              Nothing critical or overdue. Great work!
            </p>
          ) : (
            <div className="space-y-2.5">
              {attention.map((c) => (
                <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} showReporter />
              ))}
            </div>
          )}

          <div className="mt-5">
            <SectionHeader title="Latest activity" subtitle="Newest reports across campus" icon={<Clock className="size-4" />} />
            <div className="space-y-2.5">
              {recent.map((c) => (
                <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} showReporter />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SafetyPanel alertCount={alerts.length} />
          <NotificationPanel notifications={notifications} />
          <AnnouncementPanel announcements={announcements} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* ORCHESTRATOR                                                        */
/* ================================================================== */

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  const mine = useQuery(api.complaints.listMine);
  const staffList = useQuery(api.complaints.listForStaff);
  const all = useQuery(api.complaints.list);
  const publicList = useQuery(api.complaints.listPublic);
  const announcements = useQuery(api.announcements.list);
  const notifications = useQuery(api.notifications.list);
  const alerts = useQuery(api.emergency.activeAlerts);
  const leaderboard = useQuery(api.profile.leaderboard);

  const role: Role | null =
    user?.role === "student" || user?.role === "teacher" || user?.role === "admin"
      ? user.role
      : null;

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return <Navigate to="/auth?returnTo=%2Fapp" replace />;
  if (!role) return <Navigate to="/app/setup" replace />;

  const waiting =
    mine === undefined ||
    staffList === undefined ||
    all === undefined ||
    publicList === undefined ||
    announcements === undefined ||
    notifications === undefined ||
    alerts === undefined ||
    leaderboard === undefined;

  if (waiting) return <DashboardSkeleton />;

  const complaints =
    role === "admin" ? all! : role === "teacher" ? staffList! : mine!;

  if (role === "student") {
    return (
      <StudentView
        user={user}
        complaints={complaints}
        publicRows={publicList!}
        announcements={announcements!}
        notifications={notifications!}
        alerts={alerts!}
        leaderboard={leaderboard!}
      />
    );
  }
  if (role === "teacher") {
    return (
      <StaffView
        user={user}
        complaints={complaints}
        publicRows={publicList!}
        announcements={announcements!}
        notifications={notifications!}
      />
    );
  }
  return (
    <AdminView
      complaints={complaints}
      publicRows={publicList!}
      announcements={announcements!}
      notifications={notifications!}
      alerts={alerts!}
    />
  );
}
