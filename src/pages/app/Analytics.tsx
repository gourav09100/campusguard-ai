import { useQuery } from "convex/react";
import {
  AlertOctagon,
  Building2,
  Clock,
  Flame,
  MessageSquare,
  Percent,
  Star,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { ComplaintCard } from "@/components/campus/ComplaintCard";
import { SectionHeader, StatCard } from "@/components/campus/Cards";
import {
  CategoryBars,
  MonthlyBars,
  PriorityDonut,
  TrendChart,
} from "@/components/campus/Charts";
import { RequireRole } from "@/components/RequireRole";
import { durationHuman } from "@/lib/format";
import {
  byBuilding,
  byCategory,
  byDepartment,
  computeStats,
  departmentPerformance,
  monthlyTrend,
  satisfaction,
  topIssue,
  type ComplaintLike,
} from "@/lib/stats";

export default function Analytics() {
  return (
    <RequireRole roles={["admin"]}>
      <AnalyticsInner />
    </RequireRole>
  );
}

function AnalyticsInner() {
  const complaints = useQuery(api.complaints.list);
  const departments = useQuery(api.campus.departments);

  // Memoized so the loading fallback keeps a stable identity — otherwise every
  // derived chart below recomputes on each render while queries are in flight.
  const rows = useMemo(
    () => (complaints ?? []) as unknown as ComplaintLike[],
    [complaints],
  );
  const stats = useMemo(() => computeStats(rows), [rows]);
  const trend = useMemo(() => monthlyTrend(rows, 6), [rows]);
  const categoryRows = useMemo(
    () => byCategory(rows).map((r) => ({ name: r.name.replace(/_/g, " "), count: r.count })),
    [rows],
  );
  const locationRows = useMemo(
    () => byBuilding(rows).map((r) => ({ name: r.name, count: r.count })),
    [rows],
  );
  const deptRows = useMemo(
    () => byDepartment(rows).map((r) => ({ name: r.name, count: r.count })),
    [rows],
  );
  const perf = useMemo(() => departmentPerformance(rows), [rows]);
  const sat = useMemo(() => satisfaction(rows), [rows]);
  const issue = useMemo(() => topIssue(rows), [rows]);
  const priorityRows = ["critical", "high", "medium", "low"].map((p) => ({
    name: p,
    count: rows.filter((r) => r.priority === p).length,
  }));

  const criticalIncidents = rows
    .filter((r) => r.priority === "critical")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const loading = complaints === undefined;

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-sky-700">Analytics & reports</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Campus insights, <span className="text-gradient-brand">measured</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every chart below is computed from live complaint data — categories, locations,
          priorities, monthly trends, department performance and student satisfaction.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass h-72 animate-pulse rounded-2xl" />
          <div className="glass h-72 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total reports" value={stats.total} hint="All time" icon={<TrendingUp className="size-5" />} />
            <StatCard
              label="Resolution rate"
              value={`${stats.resolutionPct}%`}
              hint={`${stats.resolved} resolved`}
              icon={<Percent className="size-5" />}
              tone="success"
            />
            <StatCard
              label="Avg. resolution"
              value={stats.avgResolutionHours === null ? "—" : durationHuman(stats.avgResolutionHours * 3600_000)}
              hint="Report → fixed"
              icon={<Clock className="size-5" />}
              tone="info"
            />
            <StatCard
              label="Most common issue"
              value={issue ? issue.name.replace(/_/g, " ") : "—"}
              hint={issue ? `${issue.count} reports` : "No data"}
              icon={<Flame className="size-5" />}
              tone="warn"
            />
            <StatCard
              label="Critical incidents"
              value={stats.critical}
              hint={`${stats.overdue} overdue`}
              icon={<AlertOctagon className="size-5" />}
              tone="danger"
            />
            <StatCard
              label="Satisfaction"
              value={sat.count ? `${sat.avg}★` : "—"}
              hint={sat.count ? `${sat.count} reviews · ${sat.solvedPct}% solved` : "No reviews yet"}
              icon={<Star className="size-5" />}
              tone="success"
            />
            <StatCard
              label="Reopened"
              value={stats.reopened}
              hint="Feedback rejected the fix"
              icon={<MessageSquare className="size-5" />}
              tone="warn"
            />
            <StatCard
              label="Problem hotspot"
              value={locationRows[0]?.name ?? "—"}
              hint={locationRows[0] ? `${locationRows[0].count} reports` : "No data"}
              icon={<Building2 className="size-5" />}
            />
            <StatCard
              label="Departments active"
              value={(departments ?? []).length}
              hint="Routing targets"
              icon={<Percent className="size-5" />}
              tone="info"
            />
            <StatCard
              label="Open complaints"
              value={stats.open}
              hint={`${stats.pending} pending review`}
              icon={<Clock className="size-5" />}
              tone="warn"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-2xl p-4 lg:col-span-2">
              <SectionHeader
                title="Monthly complaint trend"
                subtitle="Reported vs resolved"
                icon={<TrendingUp className="size-4" />}
              />
              <TrendChart data={trend} height={250} />
            </div>
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Priority mix" subtitle="All complaints" icon={<Flame className="size-4" />} />
              <PriorityDonut rows={priorityRows} height={250} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Complaints by category" subtitle="Top 8 categories" icon={<AlertOctagon className="size-4" />} />
              <CategoryBars rows={categoryRows} />
            </div>
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Complaints by location" subtitle="Buildings & hostels" icon={<Building2 className="size-4" />} />
              <CategoryBars rows={locationRows} color="#0d9488" />
            </div>
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Complaints by department" subtitle="Routing load" icon={<Percent className="size-4" />} />
              <CategoryBars rows={deptRows} color="#6366f1" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Monthly volume" subtitle="Stacked by outcome" icon={<TrendingUp className="size-4" />} />
              <MonthlyBars data={trend} height={250} />
            </div>

            <div className="glass rounded-2xl p-4 lg:col-span-2">
              <SectionHeader
                title="Department performance"
                subtitle="Resolution rate & average time"
                icon={<Percent className="size-4" />}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      <th className="pb-2">Department</th>
                      <th className="pb-2">Total</th>
                      <th className="pb-2">Resolved</th>
                      <th className="pb-2">Rate</th>
                      <th className="pb-2">Avg. time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.map((p) => (
                      <tr key={p.name} className="glass-row border-t border-white/60">
                        <td className="py-2 pr-3 font-semibold">{p.name}</td>
                        <td className="py-2 pr-3">{p.total}</td>
                        <td className="py-2 pr-3">{p.resolved}</td>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/70">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"
                                style={{ width: `${p.resolutionPct}%` }}
                              />
                            </span>
                            {p.resolutionPct}%
                          </span>
                        </td>
                        <td className="py-2">
                          {p.avgHours === null ? "—" : durationHuman(p.avgHours * 3600_000)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Critical incidents"
              subtitle="Latest critical reports across campus"
              icon={<AlertOctagon className="size-4" />}
              action={
                <Link to="/app/complaints" className="text-xs font-semibold text-sky-700 hover:underline">
                  Manage all
                </Link>
              }
            />
            <div className="space-y-2.5">
              {criticalIncidents.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No critical incidents recorded.
                </p>
              ) : (
                criticalIncidents.map((c) => (
                  <ComplaintCard
                    key={c._id}
                    complaint={(complaints ?? []).find((x) => x._id === c._id)!}
                    to={`/app/complaints/${c._id}`}
                    showReporter
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
