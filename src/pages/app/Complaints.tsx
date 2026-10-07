import { useQuery } from "convex/react";
import {
  AlertOctagon,
  FileText,
  Filter,
  Inbox,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ComplaintCard } from "@/components/campus/ComplaintCard";
import { EmptyState, SectionHeader, StatCard } from "@/components/campus/Cards";
import { RequireRole, useAppRole } from "@/components/RequireRole";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  blocksFor,
  dateFilterCutoff,
  floorOptionsFor,
  isFinalStatus,
  isOverdue,
} from "@/lib/campus";
import { computeStats, type ComplaintLike } from "@/lib/stats";
import { initials } from "@/lib/format";

type Tab = "all" | "open" | "attention" | "resolved";

export default function Complaints() {
  return (
    <RequireRole roles={["student", "teacher", "admin"]}>
      <ComplaintsInner />
    </RequireRole>
  );
}

function ComplaintsInner() {
  const role = useAppRole();
  const all = useQuery(api.complaints.list);
  const staff = useQuery(api.complaints.listForStaff);
  const mine = useQuery(api.complaints.listMine);
  const users = useQuery(api.profile.listUsers);

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [building, setBuilding] = useState("all");
  const [block, setBlock] = useState("all");
  const [floor, setFloor] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority">("newest");
  const [staffFilter, setStaffFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Memoized so the loading fallback keeps a stable array identity and the
  // filters below don't recompute on every render.
  const complaints: Doc<"complaints">[] = useMemo(
    () =>
      role === "admin" ? (all ?? []) : role === "teacher" ? (staff ?? []) : (mine ?? []),
    [role, all, staff, mine],
  );

  const loading = role === "admin" ? all === undefined : role === "teacher" ? staff === undefined : mine === undefined;

  const buildings = useMemo(
    () => [...new Set(complaints.map((c) => c.building))].sort(),
    [complaints],
  );

  const blockOptions = useMemo(() => blocksFor(building), [building]);
  const floorOptions = useMemo(
    () => floorOptionsFor(building, block === "all" ? null : block),
    [building, block],
  );

  const staffMembers = useMemo(
    () => (users ?? []).filter((u) => u.role === "teacher"),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints
      .filter((c) => {
        if (tab === "open" && isFinalStatus(c.status)) return false;
        if (tab === "resolved" && !isFinalStatus(c.status)) return false;
        if (
          tab === "attention" &&
          !(
            c.priority === "critical" ||
            (!isFinalStatus(c.status) &&
              isOverdue(c.createdAt, c.resolvedAt, c.priority))
          )
        ) {
          return false;
        }
        if (category !== "all" && c.category !== category) return false;
        if (priority !== "all" && c.priority !== priority) return false;
        if (status !== "all" && c.status !== status) return false;
        if (building !== "all" && c.building !== building) return false;
        if (block !== "all" && c.block !== block) return false;
        if (floor !== "all" && c.floor !== floor) return false;
        if (staffFilter !== "all") {
          if (staffFilter === "unassigned") {
            if (c.assignedTo) return false;
          } else if (c.assignedTo !== staffFilter) {
            return false;
          }
        }
        if (dateFilter !== "all") {
          const cutoff = dateFilterCutoff(dateFilter);
          if (cutoff !== null && !(c.createdAt >= cutoff)) return false;
        }
        if (
          q &&
          !(
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.complaintId.toLowerCase().includes(q) ||
            c.building.toLowerCase().includes(q) ||
            c.reporterName.toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "oldest") return a.createdAt - b.createdAt;
        if (sort === "priority") {
          const rank = { critical: 3, high: 2, medium: 1, low: 0 } as const;
          return (
            rank[b.priority] - rank[a.priority] || b.createdAt - a.createdAt
          );
        }
        return b.createdAt - a.createdAt;
      });
  }, [
    complaints,
    tab,
    search,
    category,
    priority,
    status,
    building,
    block,
    floor,
    sort,
    staffFilter,
    dateFilter,
  ]);

  const stats = computeStats(complaints as ComplaintLike[]);

  const title =
    role === "admin"
      ? "All complaints"
      : role === "teacher"
        ? "Assigned complaints"
        : "My complaints";
  const subtitle =
    role === "admin"
      ? "Search, filter, assign and merge every report on campus"
      : role === "teacher"
        ? "Tasks routed to you and your department"
        : "Every report you've submitted, with live status";

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: complaints.length },
    {
      id: "open",
      label: "Open",
      count: complaints.filter((c) => !isFinalStatus(c.status)).length,
    },
    {
      id: "attention",
      label: "Critical / overdue",
      count: complaints.filter(
        (c) =>
          c.priority === "critical" ||
          (!isFinalStatus(c.status) &&
            isOverdue(c.createdAt, c.resolvedAt, c.priority)),
      ).length,
    },
    {
      id: "resolved",
      label: "Resolved",
      count: complaints.filter((c) => isFinalStatus(c.status)).length,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">Complaint board</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-sky-700">{stats.open}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Open
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-rose-700">{stats.critical}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Critical
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-emerald-700">{stats.resolutionPct}%</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Resolved
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/30"
                  : "bg-white/60 text-muted-foreground hover:bg-white/85"
              }`}
            >
              {t.label} · {t.count}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <SectionHeader title="Filters" subtitle="Narrow down the board" icon={<Filter className="size-4" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, place…"
              className="pl-9 bg-white/70"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={building}
            onValueChange={(v) => {
              setBuilding(v);
              setBlock("all");
              setFloor("all");
            }}
          >
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">All locations</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={block}
            onValueChange={(v) => {
              setBlock(v);
              setFloor("all");
            }}
            disabled={blockOptions.length === 0}
          >
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">
                {blockOptions.length ? "All blocks" : "No blocks"}
              </SelectItem>
              {blockOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={floor}
            onValueChange={setFloor}
            disabled={floorOptions.length === 0}
          >
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">
                {floorOptions.length ? "All floors" : "No floors"}
              </SelectItem>
              {floorOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "oldest" | "priority")}>
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              <SelectItem value="newest">Sort · Newest first</SelectItem>
              <SelectItem value="oldest">Sort · Oldest first</SelectItem>
              <SelectItem value="priority">Sort · Priority</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/70">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === "admin" && (
            <>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="bg-white/70">
                  <SelectValue placeholder="Assigned staff" />
                </SelectTrigger>
                <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
                  <SelectItem value="all">All staff</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staffMembers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name ?? s.email ?? "Staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white/70">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl">
                  <SelectItem value="all">Any date</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="No complaints match"
          description="Try clearing the filters, or report a new problem."
        />
      ) : (
        <div className="space-y-2.5">
          <p className="px-1 text-xs text-muted-foreground">
            Showing {filtered.length} of {complaints.length} complaints
          </p>
          {filtered.map((c) => (
            <div key={c._id}>
              <ComplaintCard
                complaint={c}
                to={`/app/complaints/${c._id}`}
                showReporter={role !== "student"}
                footer={
                  role === "admin" && c.mergedInto ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      Merged into another complaint
                    </span>
                  ) : null
                }
              />
            </div>
          ))}
        </div>
      )}

      {role === "admin" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total in system" value={stats.total} icon={<FileText className="size-5" />} />
          <StatCard
            label="Reopened"
            value={stats.reopened}
            hint="Feedback said not solved"
            icon={<AlertOctagon className="size-5" />}
            tone="warn"
          />
          <StatCard
            label="Avg. rating"
            value={stats.avgRating === null ? "—" : `${stats.avgRating.toFixed(1)}★`}
            hint="Student satisfaction"
            icon={<Inbox className="size-5" />}
            tone="success"
          />
        </div>
      )}

      {role === "admin" && complaints.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <SectionHeader
            title="Quick triage"
            subtitle="Most recent reporters on the board"
            icon={<Search className="size-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {[...new Set(complaints.slice(0, 12).map((c) => c.reporterName))]
              .slice(0, 8)
              .map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-[9px] font-bold text-white">
                    {initials(name)}
                  </span>
                  {name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
