# CampusGuard AI

**AI-powered campus complaint management for colleges and universities.**

Students report problems in seconds, AI triages and de-duplicates every report, and the admin/staff workspaces drive each ticket from submission to verified resolution — with a full timeline, notifications and analytics for everyone involved.

---

## Problem Statement

On most campuses, maintenance and facility complaints travel through WhatsApp groups, phone calls, emails and paper registers. That creates five recurring failures:

1. **No accountability** — nobody owns a complaint, and nobody sees how long it has been open.
2. **Duplicate noise** — 30 students report the same hostel water leak as 30 separate tickets.
3. **No visibility** — students never find out what happened to the problem they reported.
4. **No routing** — reports land in the wrong department and bounce between teams.
5. **No data** — the administration has no idea which building, department or issue type is worst.

**CampusGuard AI** solves this with one structured workflow: every complaint gets a tracking ID, an AI-generated category/priority/department assignment, duplicate detection against open tickets, a status timeline with proof of resolution, and dashboards that turn the ticket stream into operational insight.

---

## Key Features

### Complaint lifecycle
- **Report a problem** — title, description, photo uploads, and a precise campus location (building → block → floor → room) driven by real floor plans (e.g. HR1 = 4 floors, HR2 = 8 floors).
- **Tracking ID** — every submission instantly gets an ID like `CG-2026-0001`, trackable by anyone authorised via the Track page.
- **Six-stage status timeline** — `Submitted → Under Review → Assigned → In Progress → Resolved → Closed`, each transition timestamped and shown on a visual timeline.
- **Assignment & proof** — admin assigns a department/staff member; staff upload resolution proof; admin verifies and closes (or reopens).
- **Duplicate detection** — new reports are compared against open tickets before submission.

### Roles & security
- Three role workspaces: **Student**, **Teacher/Staff**, **Admin**.
- Convex Auth (email OTP) + role-based route protection (`RequireAuth` / `RequireRole`).
- Server-side authorization on every query/mutation: students only read their own complaints, staff only read assigned tickets, admins read everything. Unclaimed users are sent to profile setup; wrong roles get an "Access restricted" screen.

### Workspaces
- **Student dashboard** — status overview, recent complaints, notifications, badges, feedback/rating on resolution.
- **Staff workspace** — assigned tickets queue, status updates, resolution proofs.
- **Admin dashboard** — live KPIs (total, pending, in progress, resolved, critical, resolution rate), complaint management, staff assignment, announcements, emergency alerts.
- **Analytics** — charts for category, building, priority, department, status distribution, hotspots, monthly trend, department performance, satisfaction — all computed from real complaint data.

### Campus & communication
- **Campus map** with building hotspots and zone grouping.
- **Notifications** — in-app bell with unread counts, click-through to the ticket.
- **Announcements** and **emergency alerts** published by admin.
- **Safety** hub and **CampusGuard Assistant** (context-aware help).
- Seeded with realistic demo complaints across the configured campus buildings.

---

## AI Features

All AI logic lives in `src/lib/ai.ts` and runs deterministically on-device (**mock mode**). Setting `CAMPUSGUARD_AI_API_KEY` switches the provider flag to `live` for wiring a real model later — no key is required to run or demo the project.

| Feature | What it does |
|---|---|
| **Auto-categorisation** | Infers category + sub-category (e.g. `water_leakage → Wall seepage`) from the title/description using keyword scoring over the campus category taxonomy. |
| **Priority inference** | Rules-based priority (`low / medium / high / critical`) from severity words, location and impact (e.g. fire, security, block-wide outage → Critical). |
| **Department routing** | Maps the inferred category to one of 10 campus departments (Hostel Maintenance, Electrical, Plumbing, Sanitation, IT & Network, …). |
| **Summary & suggested action** | Generates a one-line triage summary and the recommended first action with an SLA prefix for urgent tickets. |
| **Confidence score** | Every analysis returns a confidence value shown in the UI. |
| **Duplicate detection** | Token-overlap similarity against existing **open** complaints (resolved/closed excluded); surfaces matching ticket IDs in a pre-submit dialog so students can follow the existing ticket instead of creating noise. |
| **CampusGuard Assistant** | Rule-based assistant (`/app/assistant`) that answers "how do I report…", "what is the status of my complaint", etc., using the signed-in user's real recent complaints as context. |

---

## Student Workflow

1. **Sign in** at `/auth` with email OTP — or tap the **Student Demo** button for one-tap access (demo profile: *Aarav Mehta*).
2. **Set up profile** (`/app/setup`) — name, year, hostel/room.
3. **Report a problem** (`/app/report`) — enter title & description, attach photos, pick the location (building → block → floor → room).
4. **AI analysis** appears inline: category, priority, department, summary, suggested action, confidence — plus a **duplicate warning** if similar open tickets exist (view the existing ticket or continue).
5. **Submit** → receive tracking ID `CG-2026-XXXX` and a success confirmation.
6. **Track** from the dashboard, **Complaints** list, or the **Track** page (`/app/track`) — live timeline, status changes and staff updates.
7. **Notifications** keep them informed at every status change, with click-through to the ticket.
8. **Resolution** — when staff resolve with proof, the student reviews it, **rates** the fix, and the admin closes the ticket.
9. Reopen/report-a-new-issue is always available from the ticket page.

## Admin / Staff Workflow

**Admin** (demo: *Dr. Priya Sharma*, setup code `CG-ADMIN-2026`):
1. **Dashboard** (`/app`) — live KPIs: Total, Pending, In Progress, Resolved, Critical, Resolution rate — all computed from actual complaint state.
2. **Manage** (`/app/manage`) — review every complaint, **assign department/staff**, change status, verify proof, **Resolve / Close / Reopen**.
3. **Analytics** (`/app/analytics`) — trend, hotspots, department performance, satisfaction.
4. **Announcements** & **Safety** — publish campus-wide notices and emergency alerts.
5. Every action writes to the ticket **timeline** and notifies the student.

**Teacher/Staff** (demo: *Prof. Sneha Rajan*, Electrical Maintenance):
1. Sees only **assigned** tickets in their workspace.
2. Moves tickets `Assigned → In Progress → Resolved`, attaching resolution notes/proof.
3. Cannot access admin-only areas (analytics/manage are admin-gated).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, React Router v7 |
| Styling | Tailwind CSS v4, shadcn/ui + Radix UI, Framer Motion, Lucide icons |
| Charts | Recharts |
| Forms & validation | React Hook Form + Zod |
| Backend & database | **Convex** (reactive queries, transactions, file storage) |
| Authentication | Convex Auth — email OTP, anonymous demo sessions, role claims |
| AI | Deterministic in-app analysis engine (`src/lib/ai.ts`), live-provider switch |
| Tooling | Bun, ESLint, Prettier |

---

## How to Run the Project

**Prerequisites:** [Bun](https://bun.sh) installed, and a free [Convex](https://convex.dev) account.

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env.local
#   fill in CONVEX_DEPLOYMENT and VITE_CONVEX_URL
#   (running `bunx convex dev` the first time creates these for you)

# 3. Start the Convex backend + codegen (keep running, separate terminal)
bunx convex dev

# 4. Start the frontend dev server (separate terminal)
bun run dev
```

Then open the printed local URL (default `http://localhost:5173`).

**Other commands:**

```bash
bun run build              # type-check + production build
bunx tsc -b --noEmit       # type-check only
bun run lint               # ESLint
bun run format             # Prettier
bunx convex dev --once     # one-shot backend deploy + codegen
```

**Environment variables** (see `.env.example` — never commit real values):

| Variable | Where | Purpose |
|---|---|---|
| `VITE_CONVEX_URL` | client | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | CLI | Deployment used by `bunx convex dev` |
| `CONVEX_SITE_URL` | client | Site URL for auth redirects |
| `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` | Convex backend | Auth signing keys (set in the Convex dashboard) |
| `VLY_INTEGRATION_KEY` | Convex backend | Optional platform integrations |
| `CAMPUSGUARD_AI_API_KEY` | runtime | Optional — switches AI to live mode |

**Demo logins:** the `/auth` page has one-tap buttons for **Student**, **Teacher/Staff** and **Admin** workspaces. Each seeds realistic demo data (complaints, notifications, announcements) so all three dashboards are instantly full.

**Roles:** `student`, `teacher` (staff), `admin` — claimed during profile setup (admin requires the setup code `CG-ADMIN-2026` in demo mode).

---

## Project Structure

```
src/
├── components/          # AppShell, RequireAuth/RequireRole, campus UI (Badges, Timeline, PhotoUpload…)
├── convex/              # Schema, complaints, profile, notifications, announcements, emergency, seed, auth
├── hooks/               # useAuth
├── lib/                 # ai.ts, campus.ts (buildings/floor plans/departments), stats.ts, demo.ts
├── pages/
│   ├── Landing.tsx, Auth.tsx, NotFound.tsx
│   └── app/             # Dashboard, ReportProblem, Complaints, ComplaintDetail, Track, Analytics,
│                        # Manage, CampusMap, Safety, Assistant, Announcements, Notifications, Profile, Settings
└── main.tsx             # routes + providers
```

---

## What's Committed / Not Committed

**Included:** all source code (`src/`), public assets, configuration (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `components.json`, `convex.json`, `postcss.config.cjs`), dependency manifests (`package.json`, `bun.lock`), `.env.example` (placeholders only), and `src/convex/_generated` (regenerated API stubs, so a fresh clone builds without codegen).

**Excluded via `.gitignore`:** `.env`, `.env.*` (except `.env.example`), `.env.local`, `.env.keys`, `node_modules/`, `dist/`, `.convex/`, logs and editor files.

**No secrets are stored in the repository.** Auth keys, deployment URLs and integration tokens live in `.env.local` (git-ignored) and in the Convex dashboard's environment variables.

---

## Future Scope

- **Real LLM backend** — swap the deterministic engine for an LLM (already switchable via `CAMPUSGUARD_AI_API_KEY`) for better categorisation, summarisation and assistant conversations.
- **Vision AI on photos** — auto-detect the issue type/severity from uploaded images.
- **SLA automation** — auto-escalate tickets that breach their priority-based SLA.
- **Push / email / SMS notifications** beyond the in-app bell.
- **Offline-first PWA + mobile app** (React Native) for students on patchy campus networks.
- **WhatsApp / chatbot intake** — report a complaint straight from a chat message.
- **Computer-vision campus digital twin** and GIS-based floor plans.
- **Multi-campus support** with comparative analytics across institutions.
- **Vendor/contractor module** — assign external workers with proof-of-completion geotags.

---

## License

Released for educational and demo purposes.
