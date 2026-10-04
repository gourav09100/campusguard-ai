import { useMutation, useQuery } from "convex/react";
import {
  Award,
  BadgeCheck,
  Mail,
  Phone,
  Save,
  School,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { RoleChip } from "@/components/campus/Badges";
import { SectionHeader, StatCard } from "@/components/campus/Cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { BADGES, CAMPUS_NAME, DEPARTMENT_NAMES } from "@/lib/campus";
import { formatDate, initials } from "@/lib/format";
import { computeStats, type ComplaintLike } from "@/lib/stats";

export default function Profile() {
  const { user } = useAuth();
  const mine = useQuery(api.complaints.listMine);
  const leaderboard = useQuery(api.profile.leaderboard);
  const updateProfile = useMutation(api.profile.updateProfile);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    profileId: user?.profileId ?? "",
    department: user?.department ?? "",
    year: user?.year ?? "",
    hostel: user?.hostel ?? "",
    room: user?.room ?? "",
  });
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const stats = computeStats(((mine ?? []) as unknown as ComplaintLike[]) ?? []);
  const myRank = (leaderboard ?? []).findIndex((r) => r.id === user._id);

  async function save() {
    setBusy(true);
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        profileId: form.profileId,
        department: form.department,
        year: form.year,
        hostel: form.hostel,
        room: form.room,
      });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  const isStudent = user.role === "student";

  return (
    <div className="space-y-5">
      {/* Identity card */}
      <div className="glass-strong glass-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-xl font-extrabold text-white shadow-lg shadow-sky-500/30">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {user.name ?? "Campus user"}
              </h1>
              <RoleChip role={user.role ?? null} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {user.profileId && (
                <span className="font-mono font-semibold text-foreground">{user.profileId}</span>
              )}
              {user.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" /> {user.email}
                </span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" /> {user.phone}
                </span>
              )}
              {user.joinedAt && <span>Joined {formatDate(user.joinedAt)}</span>}
              <span>{CAMPUS_NAME}</span>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-sky-700">{user.points ?? 0}</p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Points
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-emerald-700">
                {user.validReports ?? 0}
              </p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Valid
              </p>
            </div>
            <div className="glass-soft rounded-2xl px-4 py-2.5">
              <p className="text-xl font-extrabold text-amber-700">
                {user.badges?.length ?? 0}
              </p>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Badges
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Editable details */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Profile details</CardTitle>
              {!editing ? (
                <Button size="sm" variant="outline" className="glass-soft border-white/80" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={save} disabled={busy}>
                  <Save className="mr-1.5 size-4" /> Save
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Full name</Label>
              <Input
                id="p-name"
                disabled={!editing}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-id">
                {isStudent ? "Student ID" : user.role === "teacher" ? "Employee ID" : "Admin ID"}
              </Label>
              <Input
                id="p-id"
                disabled={!editing}
                value={form.profileId}
                onChange={(e) => setForm({ ...form, profileId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                disabled={!editing}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              {editing ? (
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger className="bg-white/70">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
                    {DEPARTMENT_NAMES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled value={form.department} />
              )}
            </div>

            {isStudent && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="p-year">Year</Label>
                  <Input
                    id="p-year"
                    disabled={!editing}
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-hostel">Hostel / Building</Label>
                  <Input
                    id="p-hostel"
                    disabled={!editing}
                    value={form.hostel}
                    onChange={(e) => setForm({ ...form, hostel: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-room">Room</Label>
                  <Input
                    id="p-room"
                    disabled={!editing}
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>
              </>
            )}

            {!editing && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Roles can&apos;t be changed here — an admin manages role changes from Users &
                Roles.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats + badges */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="My complaints" value={stats.total} icon={<School className="size-5" />} />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              hint={`${stats.resolutionPct}%`}
              icon={<BadgeCheck className="size-5" />}
              tone="success"
            />
          </div>

          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Badges"
              subtitle="Earned by reporting responsibly"
              icon={<Award className="size-4" />}
            />
            <ul className="space-y-2">
              {BADGES.map((b) => {
                const earned = (user.badges ?? []).includes(b.id);
                return (
                  <li
                    key={b.id}
                    className={`flex items-start gap-2.5 rounded-xl p-2.5 ${
                      earned ? "bg-amber-400/15 ring-1 ring-amber-400/40" : "glass-soft"
                    }`}
                  >
                    <Award
                      className={`mt-0.5 size-4 shrink-0 ${earned ? "text-amber-600" : "text-muted-foreground/60"}`}
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${earned ? "" : "text-muted-foreground"}`}>
                        {b.name} · +{b.points}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {myRank >= 0 && (
            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Leaderboard rank" icon={<Trophy className="size-4" />} />
              <p className="text-2xl font-extrabold text-sky-700">#{myRank + 1}</p>
              <p className="text-xs text-muted-foreground">
                among campus guardians this semester
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
