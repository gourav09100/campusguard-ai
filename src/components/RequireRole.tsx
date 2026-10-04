import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

export type AppRole = "student" | "teacher" | "admin";

/** Normalise Convex user role into an app role (undefined for legacy roles). */
export function useAppRole(): AppRole | null {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return null;
  if (user.role === "student" || user.role === "teacher" || user.role === "admin") {
    return user.role;
  }
  return null;
}

/**
 * Blocks a route until the user has claimed a role, and enforces the roles
 * allowed for that route. Unclaimed users are sent to profile setup.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: AppRole[];
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  const role = user?.role;
  const appRole =
    role === "student" || role === "teacher" || role === "admin" ? role : null;

  if (!appRole) {
    return <Navigate to="/app/setup" replace />;
  }
  if (!roles.includes(appRole)) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="glass w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
              <ShieldX className="size-6" />
            </div>
            <CardTitle className="text-xl">Access restricted</CardTitle>
            <CardDescription>
              This area is available to{" "}
              <strong>{roles.join(", ")}</strong> accounts only. You're signed in
              as <strong>{appRole}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => window.history.back()}>
              Go back
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => (window.location.href = "/app")}
            >
              Open my dashboard
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
