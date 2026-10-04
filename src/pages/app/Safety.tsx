import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  HeartPulse,
  MapPin,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { useAppRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EMERGENCY_CONTACTS, SOS_DEMO_NOTE, ZONE_INFO } from "@/lib/campus";
import { timeAgo } from "@/lib/format";

const ZONE_TONE = {
  safe: { label: "Safe zone", cls: "border-emerald-400/50 bg-emerald-500/10 text-emerald-700" },
  caution: { label: "Caution", cls: "border-amber-400/50 bg-amber-500/10 text-amber-700" },
  unsafe: { label: "Unsafe zone", cls: "border-rose-400/50 bg-rose-500/10 text-rose-700" },
};

export default function Safety() {
  const role = useAppRole();
  const alerts = useQuery(api.emergency.activeAlerts);
  const createReport = useMutation(api.emergency.create);

  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [kind, setKind] = useState<"unsafe_zone" | "suspicious">("unsafe_zone");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function fireSos() {
    setBusy(true);
    try {
      await createReport({
        kind: "sos",
        title: "EMERGENCY SOS triggered",
        details: "Student triggered the simulated SOS button from the Campus Safety page.",
        location: "Reported from mobile device (student app)",
      });
      setSent(true);
      toast.success("Simulated SOS sent to the control room", {
        description: "Demo mode: real emergency services are NOT contacted.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send SOS");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    if (title.trim().length < 5 || location.trim().length < 3) {
      toast.error("Add a short title and the location.");
      return;
    }
    setBusy(true);
    try {
      await createReport({ kind, title, details, location });
      setTitle("");
      setDetails("");
      setLocation("");
      toast.success("Safety report sent", { description: "Campus security will review it." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* SOS hero */}
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-20 -right-14 size-64 rounded-full bg-rose-300/40 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-600">CampusGuard safety desk</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Help is <span className="text-gradient-brand">one tap away</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Trigger a simulated emergency alert, report an unsafe zone or suspicious activity,
              and reach campus security, medical and fire services instantly.
            </p>
            <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-amber-300/50 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="size-3.5" /> {SOS_DEMO_NOTE}
            </p>
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSent(false); }}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group relative grid size-40 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_24px_60px_-18px_rgba(225,29,72,0.7)] transition hover:from-rose-600 hover:to-red-700 sm:size-44"
                aria-label="Emergency SOS"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" />
                <span className="relative flex flex-col items-center">
                  <Siren className="size-10" />
                  <span className="mt-1 text-lg font-extrabold tracking-widest">SOS</span>
                  <span className="text-[10px] font-semibold tracking-wide text-white/85">
                    TAP TO CONFIRM
                  </span>
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 backdrop-blur-xl">
              {!sent ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Siren className="size-5 text-rose-600" /> Confirm emergency SOS
                    </DialogTitle>
                    <DialogDescription>
                      This sends an alert with your identity and location to the CampusGuard
                      control room. Only continue if you genuinely need help.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-xl border border-amber-300/50 bg-amber-400/10 p-3 text-xs font-semibold text-amber-800">
                    {SOS_DEMO_NOTE}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-rose-600 hover:bg-rose-700"
                      disabled={busy}
                      onClick={fireSos}
                    >
                      {busy ? "Sending…" : "Yes, send SOS alert"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-emerald-600" /> Simulated alert sent
                    </DialogTitle>
                    <DialogDescription>
                      The control room has received your SOS and will call you back within 60
                      seconds. Stay where you are and keep your phone reachable.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-xl border border-emerald-300/50 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800">
                    Demo mode — no real emergency services were contacted.
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setOpen(false); setSent(false); }}>Close</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Emergency contacts */}
      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Emergency contacts"
          subtitle="Tap any number to call"
          icon={<Phone className="size-4" />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EMERGENCY_CONTACTS.map((c, i) => {
            const Icon = i === 1 ? HeartPulse : i === 2 ? Flame : ShieldAlert;
            return (
              <a
                key={c.label}
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="glass-soft lift rounded-2xl p-3.5"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
                  <Icon className="size-4" />
                </div>
                <p className="mt-2 text-sm font-bold">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.person}</p>
                <p className="mt-1 font-mono text-sm font-extrabold text-sky-700">{c.phone}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{c.note}</p>
              </a>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Report unsafe / suspicious */}
        <div className="glass rounded-2xl p-4">
          <SectionHeader
            title="Report a safety concern"
            subtitle="Unsafe zones & suspicious activity"
            icon={<ShieldAlert className="size-4" />}
          />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Concern type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger className="bg-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl">
                  <SelectItem value="unsafe_zone">Unsafe / dark zone</SelectItem>
                  <SelectItem value="suspicious">Suspicious activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-title">Title</Label>
              <Input
                id="s-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broken street light on the back lane"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-loc">Location</Label>
              <Input
                id="s-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Water Tank Area — back lane"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-details">Details</Label>
              <Textarea
                id="s-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What did you see? When? Who else is affected?"
              />
            </div>
            <Button className="w-full" onClick={submitReport} disabled={busy}>
              <Send className="mr-1.5 size-4" /> Send to security
            </Button>
          </div>
        </div>

        {/* Zones + alerts */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Safe & unsafe zones"
              subtitle="Know before you go"
              icon={<ShieldCheck className="size-4" />}
            />
            <ul className="space-y-2">
              {ZONE_INFO.map((z) => (
                <li
                  key={z.zone}
                  className={`rounded-xl border p-3 ${ZONE_TONE[z.status].cls}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold">{z.zone}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {ZONE_TONE[z.status].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs opacity-90">{z.note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Active campus alerts"
              subtitle="Simulated demo safety feed"
              icon={<Clock className="size-4" />}
            />
            {alerts === undefined ? (
              <div className="h-20 animate-pulse rounded-xl bg-white/50" />
            ) : alerts.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="size-5" />}
                title="All clear"
                description="No safety reports on campus right now."
              />
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="glass-soft rounded-xl p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          a.status === "resolved"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : a.status === "acknowledged"
                              ? "bg-amber-500/15 text-amber-700"
                              : "bg-rose-500/15 text-rose-700"
                        }`}
                      >
                        {a.kind.replace("_", " ")} · {a.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{a.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {a.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {role === "admin" && <AdminSafetyDesk />}
    </div>
  );
}

function AdminSafetyDesk() {
  const reports = useQuery(api.emergency.list);
  const setStatus = useMutation(api.emergency.setStatus);

  return (
    <div className="glass-strong glass-edge rounded-2xl p-4">
      <SectionHeader
        title="Admin safety desk"
        subtitle="Acknowledge and resolve safety reports"
        icon={<ShieldAlert className="size-4" />}
      />
      {reports === undefined ? (
        <div className="h-24 animate-pulse rounded-xl bg-white/50" />
      ) : reports.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">No safety reports yet.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r._id} className="glass-soft flex flex-wrap items-center gap-3 rounded-xl p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.location} · reported by {r.reporterName} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  r.status === "resolved"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : r.status === "acknowledged"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-rose-500/15 text-rose-700"
                }`}
              >
                {r.status}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="glass-soft border-white/80"
                  disabled={r.status !== "new"}
                  onClick={() => setStatus({ id: r._id, status: "acknowledged" })}
                >
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="glass-soft border-white/80"
                  disabled={r.status === "resolved"}
                  onClick={() => setStatus({ id: r._id, status: "resolved" })}
                >
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
