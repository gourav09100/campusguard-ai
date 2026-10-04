import { useMutation, useQuery } from "convex/react";
import {
  BarChart3,
  Bell,
  Bot,
  LayoutDashboard,
  FileText,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import logo from "@/assets/logo.svg";
import { RoleChip } from "@/components/campus/Badges";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/format";
import type { AppRole } from "@/components/RequireRole";

interface NavItem {
  to: string;
  label: string | Partial<Record<AppRole, string>>;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin"], end: true },
  { to: "/app/report", label: "Report Problem", icon: TriangleAlert, roles: ["student"] },
  { to: "/app/complaints", label: { student: "My Complaints", teacher: "Assigned Complaints", admin: "All Complaints" }, icon: FileText, roles: ["student", "teacher", "admin"] },
  { to: "/app/track", label: "Track Complaint", icon: Search, roles: ["student", "teacher", "admin"] },
  { to: "/app/notifications", label: "Notifications", icon: Bell, roles: ["student", "teacher", "admin"] },
  { to: "/app/announcements", label: "Announcements", icon: Megaphone, roles: ["student", "teacher", "admin"] },
  { to: "/app/map", label: "Campus Map", icon: Map, roles: ["student", "teacher", "admin"] },
  { to: "/app/safety", label: "Campus Safety", icon: ShieldAlert, roles: ["student", "teacher", "admin"] },
  { to: "/app/assistant", label: "AI Assistant", icon: Bot, roles: ["student", "teacher", "admin"] },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { to: "/app/manage", label: "Users & Roles", icon: Users, roles: ["admin"] },
  { to: "/app/profile", label: "Profile", icon: User, roles: ["student", "teacher", "admin"] },
  { to: "/app/settings", label: "Settings", icon: Settings, roles: ["student", "teacher", "admin"] },
];

function navLabel(item: NavItem, role: AppRole | null): string {
  if (typeof item.label === "string") return item.label;
  if (role && item.label[role]) return item.label[role] as string;
  return "Dashboard";
}

function useRole(): AppRole | null {
  const { user } = useAuth();
  if (user?.role === "student" || user?.role === "teacher" || user?.role === "admin") {
    return user.role;
  }
  return null;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/app" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
        <img src={logo} alt="" className="size-6 brightness-0 invert" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight">
            CAMPUSGUARD <span className="text-gradient-brand">AI</span>
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Report · Resolve · Protect
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ role, onNavigate }: { role: AppRole | null; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => role && item.roles.includes(role)).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-sky-500/18 to-cyan-500/10 text-sky-800 shadow-sm ring-1 ring-sky-400/30"
                  : "text-foreground/75 hover:bg-white/60 hover:text-foreground"
              }`
            }
          >
            <Icon className="size-4 shrink-0" />
            {navLabel(item, role)}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell() {
  const { user, isLoading, signOut } = useAuth();
  const role = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const notifications = useQuery(api.notifications.list);
  const ensureDemoData = useMutation(api.seed.ensureDemoData);

  // Load the realistic demo dataset once (idempotent server-side).
  useEffect(() => {
    if (user) {
      ensureDemoData({}).catch(() => {
        /* seeding is best-effort */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const unread = useMemo(
    () => (notifications ?? []).filter((n) => !n.read).length,
    [notifications],
  );

  const currentTitle = useMemo(() => {
    const match = NAV.filter((item) => role && item.roles.includes(role)).find(
      (item) =>
        item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to),
    );
    return match ? navLabel(match, role) : "CampusGuard";
  }, [location.pathname, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* decorative cool glass orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="brand-orb -top-24 -left-24 size-96 bg-sky-300/60" />
        <div className="brand-orb top-1/3 -right-32 size-[28rem] bg-cyan-200/60" />
        <div className="brand-orb -bottom-32 left-1/4 size-96 bg-indigo-200/50" />
      </div>

      {/* Desktop sidebar */}
      <aside className="glass-strong fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/70 lg:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="mb-1.5 mt-2 px-3 text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            CampusGuard
          </p>
          <NavLinks role={role} />
          {user && (
            <div className="glass-soft mt-4 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{user.name ?? "Campus user"}</p>
                  <RoleChip role={user.role ?? null} />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {(user.points ?? 0) > 0 ? `${user.points} guardian points` : "Report responsibly to earn points"}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-white/70 px-4 py-3 backdrop-blur-xl">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="glass-soft border-white/80 lg:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-white/80 bg-white/85 backdrop-blur-2xl">
              <SheetHeader>
                <SheetTitle>
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-2 overflow-y-auto">
                <NavLinks role={role} onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight sm:text-base">{currentTitle}</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              North Metropolitan University · CampusGuard AI
            </p>
          </div>

          {role === "student" && (
            <div className="hidden items-center gap-2 sm:flex">
              <Button size="sm" variant="outline" className="glass-soft border-white/80" onClick={() => navigate("/app/report")}>
                <TriangleAlert className="mr-1.5 size-4" /> Report
              </Button>
              <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => navigate("/app/safety")}>
                <ShieldAlert className="mr-1.5 size-4" /> SOS
              </Button>
            </div>
          )}

          <Link
            to="/app/notifications"
            className="relative grid size-9 place-items-center rounded-xl bg-white/70 text-foreground shadow-sm transition hover:bg-white"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-xs font-bold text-white shadow-md shadow-sky-500/30" aria-label="Account menu">
                {initials(user?.name)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/80 bg-white/90 backdrop-blur-xl">
              <DropdownMenuLabel>
                <p className="truncate text-sm font-bold">{user?.name ?? "Campus user"}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{user?.email ?? "—"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                <User className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <Settings className="mr-2 size-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/assistant")}>
                <Bot className="mr-2 size-4" /> AI Assistant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-rose-600 focus:text-rose-600">
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile floating quick actions */}
      {role === "student" && (
        <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2 lg:hidden">
          <Link
            to="/app/safety"
            className="grid size-12 place-items-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-500/40"
            aria-label="Emergency SOS"
          >
            <ShieldAlert className="size-5" />
          </Link>
          <Link
            to="/app/report"
            className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/40"
            aria-label="Report a problem"
          >
            <TriangleAlert className="size-6" />
          </Link>
        </div>
      )}
    </div>
  );
}
