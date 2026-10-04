import { useMutation } from "convex/react";
import {
  ArrowRight,
  GraduationCap,
  Loader2,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/app") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

const DEMO_ICONS = {
  student: GraduationCap,
  teacher: UserCog,
  admin: ShieldCheck,
} as const;

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const ensureDemoData = useMutation(api.seed.ensureDemoData);
  const claimRole = useMutation(api.profile.claimRole);

  const [tab, setTab] = useState("signin");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flowRef = useRef(false);

  // Auto-redirect once signed in — but never interrupt a demo login mid-flight.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !flowRef.current) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");
      await signIn("email-otp", formData);
      setPendingEmail(email);
      setIsLoading(false);
    } catch (err) {
      console.error("Email sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send the verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      flowRef.current = true; // claim/setup happens on the next screen
      navigate(redirect, { replace: true });
    } catch {
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");
      await signIn("email-otp", formData); // emails a fresh one-time code
      setPendingEmail(email);
      setResetSent(true);
      setIsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the reset code.",
      );
      setIsLoading(false);
    }
  };

  /** Demo sign-in: anonymous session + claimed demo profile + seeded data. */
  const demoLogin = async (account: DemoAccount) => {
    if (demoBusy) return;
    setDemoBusy(account.key);
    setError(null);
    flowRef.current = true;
    try {
      await ensureDemoData({}).catch(() => undefined);
      await signIn("anonymous");
      try {
        await claimRole(account.claim);
      } catch (err) {
        // A reused anonymous session may already hold a role — that's fine.
        if (!(err instanceof Error && err.message.includes("already"))) throw err;
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      console.error("Demo login error:", err);
      setError(
        err instanceof Error ? err.message : "Demo login failed. Please try again.",
      );
    } finally {
      flowRef.current = false;
      setDemoBusy(null);
    }
  };

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* decorative orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="brand-orb -top-32 -left-24 size-[26rem] bg-sky-300/70" />
        <div className="brand-orb bottom-0 -right-32 size-[28rem] bg-cyan-200/70" />
      </div>

      {/* Brand panel */}
      <aside className="hidden flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
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
        </div>

        <div>
          <h1 className="max-w-md text-4xl font-extrabold tracking-tight">
            Your campus, <span className="text-gradient-brand">guarded end to end</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Report a hostel or classroom problem with your camera, watch AI classify and route it,
            follow a five-stage timeline, and verify the fix with before/after proof.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Three role workspaces: student, teacher/staff, admin",
              "AI priority, category & duplicate-complaint detection",
              "Live campus map, safety SOS, announcements & analytics",
            ].map((t) => (
              <li key={t} className="glass-soft flex items-start gap-2.5 rounded-xl p-3 text-sm">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Secure email-code authentication with role-based access control.
        </p>
      </aside>

      {/* Auth card */}
      <main className="flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-center lg:hidden">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600">
                <img src={logo} alt="" className="size-6 brightness-0 invert" />
              </span>
              <span className="text-sm font-extrabold">
                CAMPUSGUARD <span className="text-gradient-brand">AI</span>
              </span>
            </button>
          </div>

          <Card className="glass-strong">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {pendingEmail ? "Check your email" : "Welcome to CampusGuard"}
              </CardTitle>
              <CardDescription>
                {pendingEmail
                  ? resetSent
                    ? `We emailed a one-time code to ${pendingEmail} — enter it below to reset access.`
                    : `We've sent a 6-digit code to ${pendingEmail}`
                  : "Sign in or create an account with your campus email"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {pendingEmail ? (
                <form onSubmit={handleOtpSubmit}>
                  <input type="hidden" name="email" value={pendingEmail} />
                  <input type="hidden" name="code" value={otp} />
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          const form = (e.target as HTMLElement).closest("form");
                          form?.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="mt-3 text-center text-sm text-rose-600">{error}</p>
                  )}
                  <Button type="submit" className="mt-4 w-full" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify & continue <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                  <div className="mt-2 flex justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingEmail(null);
                        setResetSent(false);
                        setOtp("");
                        setError(null);
                      }}
                    >
                      Use different email
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          await signIn("email-otp", { email: pendingEmail });
                          setResetSent(true);
                        } catch {
                          setError("Could not resend the code.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      <RotateCcw className="mr-1.5 size-3.5" /> Resend code
                    </Button>
                  </div>
                </form>
              ) : (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign in</TabsTrigger>
                    <TabsTrigger value="register">Create account</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-4">
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                        <Input
                          name="email"
                          type="email"
                          required
                          placeholder="you@campus.edu"
                          className="pl-9 bg-white/70"
                          disabled={isLoading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 size-4" />
                        )}
                        Email me a sign-in code
                      </Button>
                      <button
                        type="button"
                        className="mx-auto block text-xs font-semibold text-sky-700 hover:underline"
                        onClick={() => {
                          setTab("reset");
                          setError(null);
                        }}
                      >
                        Forgot password?
                      </button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-4">
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Registering gives you a student account — you&apos;ll pick your role and
                        fill your student ID right after verifying.
                      </p>
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                        <Input
                          name="email"
                          type="email"
                          required
                          placeholder="you@campus.edu"
                          className="pl-9 bg-white/70"
                          disabled={isLoading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 size-4" />
                        )}
                        Create account
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="reset" className="mt-4">
                    <form onSubmit={handleResetSubmit} className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        CampusGuard is passwordless — we&apos;ll email you a one-time code to
                        regain access to your account.
                      </p>
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                        <Input
                          name="email"
                          type="email"
                          required
                          placeholder="you@campus.edu"
                          className="pl-9 bg-white/70"
                          disabled={isLoading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 size-4" />
                        )}
                        Send reset code
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}

              {error && !pendingEmail && (
                <p className="mt-3 rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}
            </CardContent>

            {/* Demo logins */}
            <CardFooter className="flex flex-col gap-2 border-t border-white/70 pt-4">
              <p className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Demo logins — one tap into each workspace
              </p>
              <div className="grid w-full gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = DEMO_ICONS[account.key];
                  const busy = demoBusy === account.key;
                  return (
                    <button
                      key={account.key}
                      type="button"
                      disabled={!!demoBusy}
                      onClick={() => demoLogin(account)}
                      className="glass-soft group flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/80 disabled:opacity-60"
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${
                          account.key === "student"
                            ? "bg-gradient-to-br from-sky-500 to-cyan-600"
                            : account.key === "teacher"
                              ? "bg-gradient-to-br from-indigo-500 to-blue-600"
                              : "bg-gradient-to-br from-rose-500 to-orange-500"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{account.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {account.subtitle}
                        </span>
                      </span>
                      {busy ? (
                        <Loader2 className="size-4 animate-spin text-sky-600" />
                      ) : (
                        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-sky-700" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardFooter>

            <div className="px-6 py-3 text-center text-[11px] text-muted-foreground">
              Secured by{" "}
              <a
                href="https://freebuff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                freebuff.com
              </a>
            </div>
          </Card>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mx-auto mt-4 block text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </button>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
