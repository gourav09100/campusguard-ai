/**
 * Analytics computed from real application data (no hard-coded numbers).
 * Used by the student / staff / admin dashboards and the admin charts.
 */

import type { ComplaintStatus, Priority } from "./campus";
import { prioritySlaHours } from "./campus";

export interface ComplaintLike {
  id?: string;
  _id?: string;
  complaintId: string;
  title: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  building: string;
  createdAt: number;
  resolvedAt?: number | null;
  assignedDepartment?: string | null;
  reporterName?: string;
  feedback?: { rating: number; solved: boolean } | null;
  reopenedCount?: number;
}

export interface Stats {
  total: number;
  pending: number; // submitted + under review
  underReview: number;
  submitted: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  /** resolved + closed — everything that reached a final state */
  done: number;
  open: number;
  critical: number;
  overdue: number;
  resolutionPct: number;
  avgResolutionHours: number | null;
  avgRating: number | null;
  reopened: number;
}

export function computeStats(
  complaints: ComplaintLike[],
  now = Date.now(),
): Stats {
  const total = complaints.length;
  const submitted = complaints.filter((c) => c.status === "submitted").length;
  const underReview = complaints.filter((c) => c.status === "under_review").length;
  const assigned = complaints.filter((c) => c.status === "assigned").length;
  const inProgress = complaints.filter((c) => c.status === "in_progress").length;
  const resolvedList = complaints.filter(
    (c) => c.status === "resolved" || c.status === "closed",
  );
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const closed = complaints.filter((c) => c.status === "closed").length;
  const openList = complaints.filter(
    (c) => c.status !== "resolved" && c.status !== "closed",
  );
  const critical = openList.filter((c) => c.priority === "critical").length;

  const overdue = openList.filter(
    (c) => now - c.createdAt > prioritySlaHours(c.priority) * 3600_000,
  ).length;

  const durations = resolvedList
    .filter((c) => c.resolvedAt)
    .map((c) => (c.resolvedAt as number) - c.createdAt);
  const avgResolutionHours = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length / 3600_000
    : null;

  const ratings = complaints
    .map((c) => c.feedback?.rating)
    .filter((r): r is number => typeof r === "number");
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const reopened = complaints.filter((c) => (c.reopenedCount ?? 0) > 0).length;

  return {
    total,
    pending: submitted + underReview,
    underReview,
    submitted,
    assigned,
    inProgress,
    resolved,
    closed,
    done: resolved + closed,
    open: openList.length,
    critical,
    overdue,
    resolutionPct: total
      ? Math.round(((resolved + closed) / total) * 100)
      : 0,
    avgResolutionHours,
    avgRating,
    reopened,
  };
}

function countBy<T extends string>(
  complaints: ComplaintLike[],
  key: (c: ComplaintLike) => T,
): { name: T; count: number; open: number }[] {
  const map = new Map<string, { name: T; count: number; open: number }>();
  for (const c of complaints) {
    const k = key(c);
    const entry = map.get(k) ?? { name: k, count: 0, open: 0 };
    entry.count += 1;
    if (c.status !== "resolved" && c.status !== "closed") entry.open += 1;
    map.set(k, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export const byCategory = (c: ComplaintLike[]) => countBy(c, (x) => x.category);
export const byBuilding = (c: ComplaintLike[]) => countBy(c, (x) => x.building);
export const byPriority = (c: ComplaintLike[]) => countBy(c, (x) => x.priority);
export const byDepartment = (c: ComplaintLike[]) =>
  countBy(c, (x) => x.assignedDepartment ?? "Unassigned");

/** Complaint count per workflow status (admin analytics chart). */
export function byStatus(complaints: ComplaintLike[]) {
  const order: ComplaintStatus[] = [
    "submitted",
    "under_review",
    "assigned",
    "in_progress",
    "resolved",
    "closed",
  ];
  return order.map((s) => ({
    name: s,
    count: complaints.filter((c) => c.status === s).length,
    open: 0,
  }));
}

export const hotspots = (c: ComplaintLike[]) =>
  byBuilding(c).map((h) => {
    const rows = c.filter((x) => x.building === h.name);
    return {
      ...h,
      critical: rows.filter((x) => x.priority === "critical").length,
      resolved: rows.filter((x) => x.status === "resolved" || x.status === "closed")
        .length,
    };
  });

/** Last `months` months of complaint volume, including empty months. */
export function monthlyTrend(
  complaints: ComplaintLike[],
  months = 6,
  now = Date.now(),
) {
  const out: { month: string; total: number; resolved: number }[] = [];
  const base = new Date(now);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const rows = complaints.filter((c) => c.createdAt >= d.getTime() && c.createdAt < end);
    out.push({
      month: label,
      total: rows.length,
      resolved: rows.filter((c) => c.status === "resolved" || c.status === "closed")
        .length,
    });
  }
  return out;
}

/** Per-department resolution performance for the admin chart. */
export function departmentPerformance(complaints: ComplaintLike[]) {
  const groups = new Map<string, ComplaintLike[]>();
  for (const c of complaints) {
    const key = c.assignedDepartment ?? "Unassigned";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()]
    .map(([name, rows]) => {
      const resolved = rows.filter(
        (r) => r.status === "resolved" || r.status === "closed",
      );
      const durations = resolved
        .filter((r) => r.resolvedAt)
        .map((r) => ((r.resolvedAt as number) - r.createdAt) / 3600_000);
      return {
        name,
        total: rows.length,
        resolved: resolved.length,
        resolutionPct: rows.length
          ? Math.round((resolved.length / rows.length) * 100)
          : 0,
        avgHours: durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Most common issue + most problematic location, for analytics copy. */
export function topIssue(complaints: ComplaintLike[]) {
  return byCategory(complaints)[0] ?? null;
}

export function satisfaction(complaints: ComplaintLike[]) {
  const withFeedback = complaints.filter((c) => c.feedback);
  if (!withFeedback.length) return { avg: 0, count: 0, solvedPct: 0 };
  const avg =
    withFeedback.reduce((a, c) => a + (c.feedback?.rating ?? 0), 0) /
    withFeedback.length;
  const solved =
    withFeedback.filter((c) => c.feedback?.solved).length / withFeedback.length;
  return { avg: Math.round(avg * 10) / 10, count: withFeedback.length, solvedPct: Math.round(solved * 100) };
}
