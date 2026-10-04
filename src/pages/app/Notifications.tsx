import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";

const NOTIF_TONE: Record<string, string> = {
  submitted: "bg-sky-500/12 text-sky-700",
  reviewed: "bg-amber-500/12 text-amber-700",
  assigned: "bg-cyan-500/12 text-cyan-700",
  status: "bg-indigo-500/12 text-indigo-700",
  resolved: "bg-emerald-500/12 text-emerald-700",
  reopened: "bg-rose-500/12 text-rose-700",
  announcement: "bg-violet-500/12 text-violet-700",
  emergency: "bg-red-500/12 text-red-700",
  badge: "bg-orange-500/12 text-orange-700",
  system: "bg-slate-500/12 text-slate-700",
};

export default function Notifications() {
  const notifications = useQuery(api.notifications.list);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const rows = (notifications ?? []).filter((n) =>
    filter === "unread" ? !n.read : true,
  );
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">Notification centre</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Stay <span className="text-gradient-brand">in the loop</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complaint updates, assignments, announcements and safety alerts in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="glass-soft border-white/80"
              onClick={() => setFilter(filter === "all" ? "unread" : "all")}
            >
              {filter === "all" ? `Unread (${unread})` : "Show all"}
            </Button>
            <Button
              size="sm"
              disabled={unread === 0}
              onClick={async () => {
                await markAllRead({});
              }}
            >
              <CheckCheck className="mr-1.5 size-4" /> Mark all read
            </Button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title={filter === "unread" ? "Unread" : "All notifications"}
          subtitle={`${rows.length} item${rows.length === 1 ? "" : "s"}`}
          icon={<Bell className="size-4" />}
        />
        {notifications === undefined ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/50" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="Nothing here yet"
            description="You'll get an alert the moment your complaint is reviewed, assigned or resolved."
          />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!n.read) await markRead({ id: n._id });
                    if (n.link) navigate(n.link);
                  }}
                  className={`glass-soft flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/75 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${NOTIF_TONE[n.type] ?? NOTIF_TONE.system}`}
                  >
                    <Bell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read && (
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700 uppercase">
                          New
                        </span>
                      )}
                      {n.complaintCode && (
                        <span className="font-mono text-[11px] font-bold text-sky-700">
                          {n.complaintCode}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
