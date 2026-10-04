import { ChevronRight, Clock, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatLocation, prioritySlaHours } from "@/lib/campus";
import { timeAgo } from "@/lib/format";
import { CategoryIcon, PriorityBadge, StatusBadge } from "./Badges";

export function ComplaintCard({
  complaint,
  to,
  showReporter = false,
  footer,
}: {
  complaint: Doc<"complaints">;
  to?: string;
  showReporter?: boolean;
  footer?: ReactNode;
}) {
  const overdue =
    complaint.status !== "resolved" &&
    Date.now() - complaint.createdAt > prioritySlaHours(complaint.priority) * 3600_000;

  const body = (
    <div className="glass lift group flex w-full items-start gap-3 rounded-2xl p-3.5 text-left">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sky-700">
        <CategoryIcon category={complaint.category} className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold tracking-tight text-sky-700">
            {complaint.complaintId}
          </span>
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
              <Clock className="size-3" /> Overdue
            </span>
          )}
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">
          {complaint.title}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {formatLocation(complaint)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {timeAgo(complaint.createdAt)}
          </span>
          {showReporter && complaint.reporterName && (
            <span className="font-medium">{complaint.reporterName}</span>
          )}
        </div>
        {footer}
      </div>

      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-sky-700" />
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{body}</Link>;
  }
  return body;
}
