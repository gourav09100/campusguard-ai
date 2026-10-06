import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileText,
  GitMerge,
  Lock,
  MapPin,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
  Sparkles,
  Star,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI complaint analysis",
    body: "Category, sub-category, priority, department, summary and suggested action — assigned the moment a student submits, plus duplicate detection across open reports.",
  },
  {
    icon: Activity,
    title: "5-stage tracking timeline",
    body: "Submitted → Under review → Assigned → In progress → Resolved. Every step timestamped with the actor, notes, photos and resolution proof.",
  },
  {
    icon: Users,
    title: "Three role workspaces",
    body: "Students report and track, teachers and staff resolve with proof, admins run the campus — each with their own dashboard, nav and permissions.",
  },
  {
    icon: MapPin,
    title: "Smart campus map",
    body: "Live colour-coded markers by severity, location search, category filters and a Problem Hotspots ranking across hostels and academic blocks.",
  },
  {
    icon: Siren,
    title: "Campus safety & SOS",
    body: "Confirmation-guarded SOS, emergency contacts, unsafe-zone and suspicious-activity reporting, safety announcements and active alert feed.",
  },
  {
    icon: BarChart3,
    title: "Analytics & gamification",
    body: "Category, location, priority, monthly trend and department performance charts — plus points and badges for responsible reporting.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Report",
    body: "Snap a photo with the camera, pin the hostel/block/floor/room and describe the problem in a sentence.",
  },
  {
    n: "02",
    title: "AI routes",
    body: "CampusGuard AI classifies it, suggests a priority, flags duplicates and routes it to the right department in seconds.",
  },
  {
    n: "03",
    title: "Resolve & verify",
    body: "Staff fixes it and uploads before/after proof. The student rates the fix — “not solved” automatically reopens it.",
  },
];

const ROLES = [
  {
    icon: FileText,
    tone: "from-sky-500 to-cyan-600",
    title: "Student",
    body: "Report problems with photos, track every complaint, get notifications, earn badges and rate resolutions.",
    points: ["Report Problem with camera", "Live tracking & feedback", "Points, badges & leaderboard"],
  },
  {
    icon: UserCog,
    tone: "from-indigo-500 to-blue-600",
    title: "Teacher / Staff",
    body: "Work your department queue: update status, add work notes, upload resolution proof and escalate to admin.",
    points: ["Assigned complaint board", "Proof uploads & work notes", "Escalation to admin"],
  },
  {
    icon: Shield,
    tone: "from-rose-500 to-orange-500",
    title: "Admin",
    body: "Full campus control: triage, assign staff, merge duplicates, publish announcements, manage users and safety reports.",
    points: ["Analytics & department KPIs", "Assign, merge, delete, reopen", "Safety desk & announcements"],
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="brand-orb -top-32 -left-24 size-[26rem] bg-sky-300/70" />
        <div className="brand-orb top-1/4 -right-40 size-[30rem] bg-cyan-200/70" />
        <div className="brand-orb bottom-0 left-1/3 size-[24rem] bg-indigo-200/60" />
      </div>

      {/* Nav */}
      <header className="glass sticky top-0 z-40 border-b border-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
              <img src={logo} alt="" className="size-6 brightness-0 invert" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight">
                CAMPUSGUARD <span className="text-gradient-brand">AI</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Report · Resolve · Protect
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/75 md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#roles" className="transition hover:text-foreground">Roles</a>
            <a href="#safety" className="transition hover:text-foreground">Safety</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="glass-soft border-white/80" onClick={() => navigate("/auth?returnTo=%2Fapp")}>
              Sign in
            </Button>
            <Button
              className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30 hover:from-sky-600 hover:to-cyan-700"
              onClick={() => navigate("/auth?returnTo=%2Fapp")}
            >
              Get started <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="glass-soft inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide text-sky-700 uppercase">
              <Cpu className="size-3.5" /> Smart campus management platform
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Report. Resolve.{" "}
              <span className="text-gradient-brand">Protect.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CampusGuard AI turns campus complaints into a tracked, AI-triaged workflow —
              from a student&apos;s camera shot to a staff member&apos;s before/after proof, with
              live analytics, a problem map and an emergency SOS for the whole campus.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-xl shadow-sky-500/30 hover:from-sky-600 hover:to-cyan-700"
                onClick={() => navigate("/auth?returnTo=%2Fapp")}
              >
                Open the dashboard <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button size="lg" variant="outline" className="glass border-white/80" onClick={() => navigate("/auth?returnTo=%2Fapp")}>
                <Lock className="mr-2 size-4" /> Try demo logins
              </Button>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 sm:max-w-lg">
              {[
                { k: "3", v: "role workspaces" },
                { k: "19", v: "problem categories" },
                { k: "5", v: "stage workflow" },
              ].map((s) => (
                <div key={s.v} className="glass-soft rounded-2xl p-3 text-center">
                  <dt className="text-2xl font-extrabold text-sky-700">{s.k}</dt>
                  <dd className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero preview card */}
          <div className="relative">
            <div className="glass-strong glass-edge rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
                    <Radar className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold">CAMPUSGUARD DASHBOARD</p>
                    <p className="text-[10px] text-muted-foreground">Live campus operations</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase">
                  Live
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { l: "Open", v: "18", c: "text-amber-700" },
                  { l: "Critical", v: "3", c: "text-rose-700" },
                  { l: "Resolved", v: "82%", c: "text-emerald-700" },
                ].map((m) => (
                  <div key={m.l} className="glass-soft rounded-xl p-2.5 text-center">
                    <p className={`text-xl font-extrabold ${m.c}`}>{m.v}</p>
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {m.l}
                    </p>
                  </div>
                ))}
              </div>

              <ul className="mt-3 space-y-2">
                {[
                  { id: "CG-2026-0142", t: "Water leaking from HR2 3rd floor ceiling", p: "HIGH", s: "In Progress", pc: "bg-orange-500/15 text-orange-700", sc: "bg-blue-500/15 text-blue-700" },
                  { id: "CG-2026-0141", t: "Library Wi-Fi dropping every few minutes", p: "MEDIUM", s: "Assigned", pc: "bg-amber-500/15 text-amber-700", sc: "bg-cyan-500/15 text-cyan-700" },
                  { id: "CG-2026-0140", t: "Unauthorised person at Main Gate", p: "CRITICAL", s: "Under Review", pc: "bg-rose-500/15 text-rose-700", sc: "bg-amber-500/15 text-amber-700" },
                ].map((c) => (
                  <li key={c.id} className="glass-soft flex items-center gap-3 rounded-xl p-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/80 text-sky-700">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{c.t}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${c.pc}`}>{c.p}</span>
                    <span className={`hidden rounded-full px-2 py-0.5 text-[9px] font-bold sm:block ${c.sc}`}>
                      {c.s}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300/50 bg-sky-500/10 p-2.5">
                <Sparkles className="size-4 shrink-0 text-sky-700" />
                <p className="text-[11px] leading-snug text-sky-800">
                  <strong>AI:</strong> Continuous ceiling leakage at HR2 · priority{" "}
                  <strong>HIGH</strong> · routed to <strong>Plumbing &amp; Water Works</strong> ·
                  4 similar open reports found.
                </p>
              </div>
            </div>

            <div className="glass absolute -right-3 -bottom-5 hidden rounded-2xl px-3.5 py-2.5 shadow-xl sm:block">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="size-4" /> Resolved in 6h 12m
              </p>
              <p className="text-[10px] text-muted-foreground">Before + after proof verified</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-sky-700 uppercase">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything a campus needs to{" "}
            <span className="text-gradient-brand">close the loop</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built as a real full-stack app — authentication, roles, database, uploads, analytics
            and a mock AI service ready to swap for a production model.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass lift glass-edge rounded-2xl p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sky-700">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-3 text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="glass-strong glass-edge rounded-3xl p-6 sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold tracking-wide text-sky-700 uppercase">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              From report to resolution in{" "}
              <span className="text-gradient-brand">three moves</span>
            </h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative glass rounded-2xl p-5">
                <span className="text-3xl font-extrabold text-sky-500/40">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-sky-700 uppercase">Role-based access</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One platform, <span className="text-gradient-brand">three workspaces</span>
          </h2>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.title} className="glass glass-edge lift flex flex-col rounded-3xl p-6">
              <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${r.tone} text-white shadow-lg`}>
                <r.icon className="size-6" />
              </span>
              <h3 className="mt-4 text-xl font-extrabold">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {p}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-5 w-full glass-soft border-white/80"
                onClick={() => navigate("/auth?returnTo=%2Fapp")}
              >
                Open {r.title} demo <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-16 -right-12 size-52 rounded-full bg-rose-300/40 blur-3xl" />
            <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
              <ShieldAlert className="size-6" />
            </span>
            <h2 className="relative mt-4 text-3xl font-extrabold tracking-tight">
              CampusGuard <span className="text-gradient-brand">safety net</span>
            </h2>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
              An emergency SOS with confirmation step (so it never fires by accident), direct-dial
              contacts for security, medical and fire, unsafe-zone reporting, suspicious-activity
              reports and live campus safety alerts.
            </p>
            <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Siren, l: "SOS" },
                { icon: MapPin, l: "Zones" },
                { icon: Shield, l: "Contacts" },
              ].map((i) => (
                <div key={i.l} className="glass-soft rounded-xl p-3">
                  <i.icon className="mx-auto size-5 text-rose-600" />
                  <p className="mt-1 text-xs font-bold">{i.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold tracking-wide text-sky-700 uppercase">Campus safety</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Every student <span className="text-gradient-brand">looking out</span> for the campus
            </h2>
            <ul className="mt-5 space-y-3">
              {[
                "Confirmation-guarded SOS with a simulated control-room alert",
                "Report unsafe / dark zones and suspicious activity in seconds",
                "Emergency contacts for security, medical and fire on one screen",
                "Safe-zone guidance plus admin safety desk to acknowledge reports",
                "Emergency announcements pushed to every notification centre",
              ].map((t) => (
                <li key={t} className="glass-soft flex items-start gap-3 rounded-xl p-3 text-sm">
                  <Star className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-sky-300/40 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full bg-cyan-300/40 blur-3xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to guard your <span className="text-gradient-brand">campus?</span>
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign in with your campus email, or jump straight into one of the three demo
            workspaces — student, teacher/staff and admin — with realistic seeded data.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-xl shadow-sky-500/30 hover:from-sky-600 hover:to-cyan-700"
              onClick={() => navigate("/auth?returnTo=%2Fapp")}
            >
              Get started free <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="outline" className="glass border-white/80" onClick={() => navigate("/auth?returnTo=%2Fapp")}>
              <Bot className="mr-2 size-4" /> Meet the AI assistant
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-white/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600">
              <img src={logo} alt="" className="size-5 brightness-0 invert" />
            </span>
            <div className="text-xs">
              <p className="font-extrabold">CAMPUSGUARD AI</p>
              <p className="text-muted-foreground">Report. Resolve. Protect.</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#roles" className="hover:text-foreground">Roles</a>
            <a href="#safety" className="hover:text-foreground">Safety</a>
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> Role-based access
            </span>
            <span className="inline-flex items-center gap-1">
              <GitMerge className="size-3" /> AI duplicate detection
            </span>
            <span className="inline-flex items-center gap-1">
              <Trophy className="size-3" /> Gamified reporting
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
