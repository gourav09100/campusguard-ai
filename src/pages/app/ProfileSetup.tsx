import { useMutation } from "convex/react";
import {
  ArrowRight,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { RoleChip } from "@/components/campus/Badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_SETUP_CODE } from "@/lib/demo";
import { DEPARTMENT_NAMES } from "@/lib/campus";

type RoleChoice = "student" | "teacher" | "admin";

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ensureDemoData = useMutation(api.seed.ensureDemoData);
  const claimRole = useMutation(api.profile.claimRole);

  const [role, setRole] = useState<RoleChoice>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed-in via email OTP → use their address for profile hints.
  const emailName = (user?.email ?? "").split("@")[0].replace(/[._-]/g, " ");
  const suggestedName = user?.name ?? (emailName ? emailName.replace(/\b\w/g, (m) => m.toUpperCase()) : "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      // Make sure the demo dataset (locations, departments) exists.
      await ensureDemoData({}).catch(() => undefined);
      await claimRole({
        role,
        name: String(form.get("name") ?? "").trim(),
        profileId: String(form.get("profileId") ?? "").trim() || undefined,
        department: String(form.get("department") ?? "").trim() || undefined,
        year: String(form.get("year") ?? "").trim() || undefined,
        hostel: String(form.get("hostel") ?? "").trim() || undefined,
        room: String(form.get("room") ?? "").trim() || undefined,
        phone: String(form.get("phone") ?? "").trim() || undefined,
        designation: String(form.get("designation") ?? "").trim() || undefined,
        adminCode: String(form.get("adminCode") ?? "").trim() || undefined,
      });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="brand-orb -top-24 -left-24 size-96 bg-sky-300/60" />
        <div className="brand-orb top-1/3 -right-32 size-[26rem] bg-cyan-200/60" />
        <div className="brand-orb -bottom-32 left-1/4 size-96 bg-indigo-200/50" />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Set up your <span className="text-gradient-brand">CampusGuard</span> profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you use the campus — this decides which workspace you get.
          </p>
        </div>

        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">Your role</CardTitle>
            <CardDescription>
              Students report and track · staff resolve · admins manage the campus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as RoleChoice)}
                className="grid gap-3 sm:grid-cols-3"
              >
                {(
                  [
                    { value: "student", label: "Student", icon: GraduationCap, desc: "Report & track problems" },
                    { value: "teacher", label: "Teacher / Staff", icon: UserCog, desc: "Resolve assigned tasks" },
                    { value: "admin", label: "Admin", icon: ShieldCheck, desc: "Manage the campus" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`glass-soft flex cursor-pointer flex-col gap-2 rounded-2xl p-3.5 transition ${
                      role === option.value ? "ring-2 ring-sky-500/60" : "hover:bg-white/70"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <option.icon className="size-5 text-sky-700" />
                    <span className="text-sm font-bold">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                  </label>
                ))}
              </RadioGroup>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required defaultValue={suggestedName} placeholder="e.g. Aarav Mehta" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profileId">
                    {role === "student" ? "Student ID" : role === "teacher" ? "Employee ID" : "Admin ID"}
                  </Label>
                  <Input
                    id="profileId"
                    name="profileId"
                    placeholder={role === "student" ? "NMU2023CS1042" : role === "teacher" ? "NMU-ST-2245" : "NMU-AD-0001"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+91 98xxx xxxxx" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select name="department">
                    <SelectTrigger id="department" className="w-full bg-white/70">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl">
                      {DEPARTMENT_NAMES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {role === "student" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Year</Label>
                    <Select name="year">
                      <SelectTrigger id="year" className="w-full bg-white/70">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl">
                        {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === "teacher" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" name="designation" placeholder="e.g. Electrical Supervisor" />
                  </div>
                )}

                {role === "student" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="hostel">Hostel / Building</Label>
                      <Input id="hostel" name="hostel" placeholder="e.g. HR2 Hostel" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="room">Room</Label>
                      <Input id="room" name="room" placeholder="e.g. C-312" />
                    </div>
                  </>
                )}

                {role === "admin" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="adminCode">Admin setup code</Label>
                    <Input id="adminCode" name="adminCode" placeholder={ADMIN_SETUP_CODE} />
                    <p className="text-[11px] text-muted-foreground">
                      Demo code: <code className="font-mono font-semibold">{ADMIN_SETUP_CODE}</code>
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Continue as <RoleChip role={role} />
                </div>
                <Button type="submit" disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Enter workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Roles are locked after setup — an admin can change them later.
        </p>
      </div>
    </div>
  );
}
