import { Check, Circle, Dot, Loader2 } from "lucide-react";
import type { ComplaintStatus } from "@/lib/campus";
import { STATUSES, statusLabel } from "@/lib/campus";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface HistoryEntry {
  _id: string;
  status: ComplaintStatus;
  previousStatus?: ComplaintStatus;
  note: string;
  actorName: string;
  actorRole: string;
  createdAt: number;
}

/**
 * Visual workflow timeline:
 * ✓ Submitted ✓ Under Review ✓ Assigned ✓ In Progress ○ Resolved
 * plus the detailed activity feed underneath.
 */
export function StatusTimeline({
  status,
  entries,
}: {
  status: ComplaintStatus;
  entries: HistoryEntry[];
}) {
  const currentStep = STATUSES.find((s) => s.id === status)?.step ?? 1;
  const stepTone = (step: number, state: "done" | "current" | "pending") => {
    if (state === "pending") return "border-border bg-white/60 text-muted-foreground";
    if (state === "current")
      return "border-sky-400/60 bg-sky-500 text-white shadow-md shadow-sky-500/30";
    return "border-emerald-400/50 bg-emerald-500 text-white";
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-bold tracking-tight">Complaint timeline</h3>
      <ol className="relative space-y-0">
        {STATUSES.map((s, i) => {
          const state =
            s.step < currentStep
              ? "done"
              : s.step === currentStep
                ? "current"
                : "pending";
          const history = entries.find((e) => e.status === s.id);
          return (
            <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STATUSES.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-7 left-[13px] h-[calc(100%-16px)] w-0.5 ${
                    state === "done" ? "bg-emerald-400/70" : "bg-border"
                  }`}
                />
              )}
              <span
                className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 ${stepTone(
                  s.step,
                  state,
                )}`}
              >
                {state === "done" ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : state === "current" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Circle className="size-2 fill-current" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-semibold ${
                    state === "pending" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {s.label}
                  {state === "current" && (
                    <span className="ml-2 rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold tracking-wide text-sky-700 uppercase">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {history
                    ? `${history.note} · ${history.actorName}`
                    : s.description}
                </p>
                {history && (
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-sky-700">
                    {history.previousStatus && history.previousStatus !== history.status ? (
                      <>
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-600">
                          {statusLabel(history.previousStatus)}
                        </span>
                        <span aria-hidden>→</span>
                        <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-emerald-700">
                          {statusLabel(history.status)}
                        </span>
                      </>
                    ) : (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-700">
                        {statusLabel(history.status)}
                      </span>
                    )}
                  </p>
                )}
                {history && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {formatDateTime(history.createdAt)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Chronological activity feed (history + comments). */
export function ActivityFeed({
  items,
}: {
  items: {
    id: string;
    body: string;
    actor: string;
    role: string;
    createdAt: number;
    kind: "history" | "comment" | "internal" | "staff" | "admin";
    /** previous → new status when this entry records a status change */
    transition?: { from: ComplaintStatus; to: ComplaintStatus };
  }[];
}) {
  const tone: Record<string, string> = {
    history: "bg-sky-500/12 text-sky-700",
    comment: "bg-white/70 text-slate-600",
    internal: "bg-rose-500/12 text-rose-700",
    staff: "bg-indigo-500/12 text-indigo-700",
    admin: "bg-cyan-500/12 text-cyan-700",
  };
  const label: Record<string, string> = {
    history: "Update",
    comment: "Comment",
    internal: "Internal note",
    staff: "Staff update",
    admin: "Admin update",
  };
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[10px] font-bold tracking-wide uppercase ${tone[item.kind]}`}
          >
            {label[item.kind]}
          </span>
          <div className="min-w-0 flex-1">
            {item.transition && item.transition.from !== item.transition.to && (
              <p className="mb-1 inline-flex flex-wrap items-center gap-1 text-[11px] font-bold">
                <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-600">
                  {statusLabel(item.transition.from)}
                </span>
                <span aria-hidden>→</span>
                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-emerald-700">
                  {statusLabel(item.transition.to)}
                </span>
              </p>
            )}
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {item.body}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Dot className="size-3" />
              {item.actor} · {timeAgo(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
