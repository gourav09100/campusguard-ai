import { useQuery } from "convex/react";
import { Layers, MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { CategoryIcon, PriorityBadge, StatusBadge } from "@/components/campus/Badges";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { HotspotPanel } from "@/pages/app/dashboard/Shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, formatLocation, statusLabel } from "@/lib/campus";
import { timeAgo } from "@/lib/format";
import { hotspots, type ComplaintLike } from "@/lib/stats";

type Row = {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "submitted" | "under_review" | "assigned" | "in_progress" | "resolved";
  building: string;
  block?: string | null;
  floor?: string | null;
  room?: string | null;
  createdAt: number;
};

const LEGEND = [
  { label: "Critical", className: "bg-rose-500" },
  { label: "High", className: "bg-orange-500" },
  { label: "Medium", className: "bg-amber-400" },
  { label: "Low", className: "bg-sky-500" },
  { label: "Resolved", className: "bg-emerald-500" },
];

function pinColor(row: Row): string {
  if (row.status === "resolved") return "bg-emerald-500";
  return (
    {
      critical: "bg-rose-500",
      high: "bg-orange-500",
      medium: "bg-amber-400",
      low: "bg-sky-500",
    }[row.priority] ?? "bg-sky-500"
  );
}

export default function CampusMap() {
  const locations = useQuery(api.campus.locations);
  const rows = useQuery(api.complaints.listPublic);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ((rows ?? []) as unknown as Row[]).filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (
        q &&
        !(
          r.building.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.complaintId.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [rows, search, category]);

  const visibleBuildings = (locations ?? []).filter(
    (l) => !search.trim() || l.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selected = filtered.find((r) => r.id === selectedId) ?? null;
  const hotspotRows = hotspots(filtered as unknown as ComplaintLike[]);
  const maxCount = Math.max(1, ...visibleBuildings.map((b) => filtered.filter((r) => r.building === b.name).length));

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">Smart campus map</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Every problem, <span className="text-gradient-brand">mapped</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Live markers for open and resolved complaints across hostels, academic blocks and
              facilities — colour-coded by severity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`size-3 rounded-full ${l.className} shadow-sm`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search location or complaint…"
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
        </div>
      </div>

      {/* Map canvas */}
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-3 sm:p-4">
        <div
          className="relative h-[420px] w-full overflow-hidden rounded-2xl sm:h-[520px]"
          style={{
            background:
              "linear-gradient(140deg, rgba(204,242,254,0.75), rgba(220,252,231,0.65) 45%, rgba(219,234,254,0.75))",
          }}
        >
          {/* grid paths */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                "linear-gradient(rgba(11,55,95,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(11,55,95,0.10) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* "road" cross */}
          <div aria-hidden className="absolute top-1/2 right-0 left-0 h-6 -translate-y-1/2 bg-white/55" />
          <div aria-hidden className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-white/55" />

          {/* buildings */}
          {visibleBuildings.map((b) => {
            const count = filtered.filter((r) => r.building === b.name).length;
            const intensity = count / maxCount;
            return (
              <div
                key={b._id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
              >
                <div
                  className="glass flex min-w-24 flex-col items-center rounded-xl px-2.5 py-1.5 text-center shadow-sm"
                  style={{
                    background: `rgba(255,255,255,${0.55 + intensity * 0.35})`,
                    borderColor: count > 0 ? "rgba(14,165,233,0.55)" : "rgba(255,255,255,0.85)",
                  }}
                  title={`${b.name} — ${count} report(s)`}
                >
                  <span className="text-[11px] leading-tight font-bold">{b.name}</span>
                  <span className="text-[10px] text-muted-foreground">{count} reports</span>
                </div>

                {/* pins for complaints in this building */}
                {filtered
                  .filter((r) => r.building === b.name)
                  .slice(0, 6)
                  .map((r, i) => {
                    const dx = (((i * 37) % 21) - 10) * 1.1;
                    const dy = -16 - (((i * 53) % 17) - 8) * 1.1;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-label={r.title}
                        onClick={() => setSelectedId(r.id)}
                        className={`absolute size-5 rounded-full border-2 border-white shadow-md transition hover:scale-125 ${pinColor(r)} ${
                          selectedId === r.id ? "ring-2 ring-sky-600 ring-offset-1" : ""
                        }`}
                        style={{ left: `calc(50% + ${dx}px)`, top: `${dy}px` }}
                      />
                    );
                  })}
              </div>
            );
          })}

          {/* selected complaint summary */}
          {selected && (
            <div className="glass-strong absolute right-3 bottom-3 left-3 max-w-md rounded-2xl p-3 shadow-xl sm:left-auto sm:w-96">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sky-700">
                  <CategoryIcon category={selected.category} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-sky-700">
                      {selected.complaintId}
                    </span>
                    <PriorityBadge priority={selected.priority} />
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold">{selected.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatLocation(selected)} · {timeAgo(selected.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-white/80 text-muted-foreground hover:bg-white"
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <Link
                to={`/app/complaints/${selected.id}`}
                className="mt-2 block rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-3 py-2 text-center text-xs font-bold text-white shadow-md shadow-sky-500/30"
              >
                Open full complaint
              </Link>
            </div>
          )}

          {visibleBuildings.length === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="text-sm text-muted-foreground">No locations match “{search}”.</p>
            </div>
          )}
        </div>

        <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Layers className="size-3.5" />
          {filtered.length} markers shown · tap a dot for a summary, or a building for details.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HotspotPanel hotspots={hotspotRows} limit={8} />

        <div className="glass rounded-2xl p-4">
          <SectionHeader
            title="Markers in view"
            subtitle="Filtered complaints on the map"
            icon={<MapPin className="size-4" />}
          />
          {filtered.length === 0 ? (
            <EmptyState
              icon={<MapPin className="size-5" />}
              title="No markers"
              description="Clear the filters to see every complaint marker."
            />
          ) : (
            <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {filtered.slice(0, 40).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="glass-row flex w-full items-center gap-3 rounded-xl p-2.5 text-left"
                  >
                    <span className={`size-3 shrink-0 rounded-full ${pinColor(r)}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {r.building} · {statusLabel(r.status)} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
