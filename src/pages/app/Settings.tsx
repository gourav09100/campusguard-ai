import { useMutation } from "convex/react";
import { KeyRound, LogOut, Monitor, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { SectionHeader } from "@/components/campus/Cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

interface Prefs {
  complaintUpdates: boolean;
  announcements: boolean;
  emergencyAlerts: boolean;
  emailDigest: boolean;
}

const DEFAULT_PREFS: Prefs = {
  complaintUpdates: true,
  announcements: true,
  emergencyAlerts: true,
  emailDigest: false,
};

export default function Settings() {
  const { user, signOut, signIn } = useAuth();
  const navigate = useNavigate();
  const updatePrefs = useMutation(api.profile.updatePrefs);

  const [prefs, setPrefs] = useState<Prefs>(user?.prefs ?? DEFAULT_PREFS);
  const [solidMode, setSolidMode] = useState(
    () => localStorage.getItem("cg-surface") === "solid",
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user?.prefs) setPrefs(user.prefs);
  }, [user?.prefs]);

  useEffect(() => {
    document.documentElement.classList.toggle("solid-surfaces", solidMode);
    localStorage.setItem("cg-surface", solidMode ? "solid" : "glass");
  }, [solidMode]);

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    try {
      await updatePrefs(next);
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    }
  }

  async function sendResetCode() {
    if (!user?.email) {
      toast.error("No email on this account.");
      return;
    }
    setSending(true);
    try {
      await signIn("email-otp", { email: user.email });
      toast.success(`Sign-in code sent to ${user.email}`, {
        description: "Use it to re-verify your account on any device.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setSending(false);
    }
  }

  const toggles: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: "complaintUpdates", label: "Complaint updates", desc: "Review, assignment, status & resolution alerts" },
    { key: "announcements", label: "Campus announcements", desc: "Maintenance windows, events and notices" },
    { key: "emergencyAlerts", label: "Emergency alerts", desc: "SOS, unsafe-zone and security notices" },
    { key: "emailDigest", label: "Email digest", desc: "Weekly summary of your reports (mock)" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-sky-700">Settings</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Make it <span className="text-gradient-brand">yours</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notification preferences, account security and appearance for {user?.name ?? "your account"}.
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch
                checked={prefs[t.key]}
                onCheckedChange={(v) => savePrefs({ ...prefs, [t.key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Account & security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="glass-soft rounded-xl p-3 text-sm">
            <p className="font-semibold">Signed in as</p>
            <p className="text-muted-foreground">
              {user?.name ?? "—"} · {user?.email ?? "guest session"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="glass-soft border-white/80"
              onClick={sendResetCode}
              disabled={sending}
            >
              <KeyRound className="mr-1.5 size-4" />
              {sending ? "Sending…" : "Send sign-in code"}
            </Button>
            <Button
              variant="outline"
              className="glass-soft border-rose-300/60 text-rose-700 hover:bg-rose-500/10"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="mr-1.5 size-4" /> Sign out
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Passwordless by design: CampusGuard uses emailed one-time codes, so there is no
            password to forget. Roles and account data are managed server-side with
            role-based access control.
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Palette className="size-4 text-sky-600" /> Glass surfaces
              </p>
              <p className="text-xs text-muted-foreground">
                Translucent panels with blur — the CampusGuard light theme.
              </p>
            </div>
            <Switch checked={!solidMode} onCheckedChange={(v) => setSolidMode(!v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Monitor className="size-4 text-sky-600" /> Solid mode
              </p>
              <p className="text-xs text-muted-foreground">
                Disable blur for lower-end devices.
              </p>
            </div>
            <Switch checked={solidMode} onCheckedChange={setSolidMode} />
          </div>
          <div className="glass-soft rounded-xl p-3">
            <SectionHeader title="Preview" />
            <div className="grid grid-cols-3 gap-2">
              <div className="glass h-12 rounded-xl" />
              <div className="glass-soft h-12 rounded-xl" />
              <div className="glass-strong h-12 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        CampusGuard AI · Report. Resolve. Protect.
      </p>
    </div>
  );
}
