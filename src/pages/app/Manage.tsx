import { useMutation, useQuery } from "convex/react";
import { Building2, Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { RoleChip } from "@/components/campus/Badges";
import { EmptyState, SectionHeader, StatCard } from "@/components/campus/Cards";
import { RequireRole } from "@/components/RequireRole";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, initials } from "@/lib/format";

export default function Manage() {
  return (
    <RequireRole roles={["admin"]}>
      <ManageInner />
    </RequireRole>
  );
}

function ManageInner() {
  const users = useQuery(api.profile.listUsers);
  const departments = useQuery(api.campus.departments);
  const setRole = useMutation(api.profile.setUserRole);
  const [search, setSearch] = useState("");

  const rows = (users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.profileId ?? "").toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q)
    );
  });

  const counts = {
    students: (users ?? []).filter((u) => u.role === "student").length,
    staff: (users ?? []).filter((u) => u.role === "teacher").length,
    admins: (users ?? []).filter((u) => u.role === "admin").length,
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Users, roles & <span className="text-gradient-brand">departments</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every account on CampusGuard with its role, profile and reporting record. Roles decide
          which workspace each person gets.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Students" value={counts.students} icon={<Users className="size-5" />} />
        <StatCard label="Teachers / staff" value={counts.staff} icon={<ShieldCheck className="size-5" />} tone="info" />
        <StatCard label="Admins" value={counts.admins} icon={<ShieldCheck className="size-5" />} tone="danger" />
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="All users"
          subtitle="Change a role — takes effect on their next refresh"
          icon={<Users className="size-4" />}
          action={
            <div className="relative">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="h-9 w-52 pl-9 bg-white/70"
              />
            </div>
          }
        />
        {users === undefined ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/50" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No users found"
            description="Try a different search term."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((u) => (
              <UserRow key={u._id} user={u} onRole={setRole} />
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Departments"
          subtitle="Complaint routing targets"
          icon={<Building2 className="size-4" />}
        />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(departments ?? []).map((d) => (
            <div key={d._id} className="glass-soft rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ background: d.color }}
                  aria-hidden
                />
                <p className="text-sm font-bold">{d.name}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
              <p className="mt-1.5 text-[11px] font-semibold text-sky-700">Head: {d.head}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  onRole,
}: {
  user: Doc<"users">;
  onRole: (args: {
    userId: Doc<"users">["_id"];
    role: "student" | "teacher" | "admin" | "user";
  }) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="glass-row flex flex-wrap items-center gap-3 rounded-xl p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-xs font-bold text-white">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{user.name ?? "Unnamed user"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user.email ?? "no email"} · {user.profileId ?? "no ID"}
          {user.department ? ` · ${user.department}` : ""}
        </p>
      </div>
      <span className="text-[11px] text-muted-foreground">
        {user.joinedAt ? formatDate(user.joinedAt) : "—"}
        {typeof user.points === "number" && user.points > 0 ? ` · ${user.points} pts` : ""}
      </span>
      <RoleChip role={user.role ?? null} />
      <Select
        value={user.role ?? "user"}
        onValueChange={async (v) => {
          setBusy(true);
          try {
            await onRole({
              userId: user._id,
              role: v as "student" | "teacher" | "admin" | "user",
            });
            toast.success(`${user.name ?? "User"} is now ${v}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Role change failed");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
      >
        <SelectTrigger className="h-9 w-40 bg-white/70">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-xl">
          <SelectItem value="student">Student</SelectItem>
          <SelectItem value="teacher">Teacher / Staff</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
