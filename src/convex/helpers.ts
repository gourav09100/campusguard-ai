import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type Role = "admin" | "student" | "teacher" | "user" | "member" | undefined;

/** Resolve the signed-in user or throw. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return { userId, user };
}

/** Admin-only guard for privileged operations. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") throw new Error("Admin access required");
  return { userId, user };
}

export function isAdmin(user: Doc<"users"> | null | undefined) {
  return user?.role === "admin";
}

export function isStaff(user: Doc<"users"> | null | undefined) {
  return user?.role === "admin" || user?.role === "teacher";
}

/** Insert a notification for a user. Safe to call inside any mutation. */
export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    title: string;
    body: string;
    type:
      | "submitted"
      | "reviewed"
      | "assigned"
      | "status"
      | "resolved"
      | "reopened"
      | "announcement"
      | "emergency"
      | "badge"
      | "system";
    complaintId?: Id<"complaints">;
    complaintCode?: string;
    link?: string;
  },
) {
  // Respect notification preferences (default: everything on).
  const user = await ctx.db.get(args.userId);
  const prefs = user?.prefs;
  if (args.type === "announcement" && prefs && !prefs.announcements) return;
  if (
    (args.type === "resolved" || args.type === "assigned" || args.type === "status") &&
    prefs &&
    !prefs.complaintUpdates
  ) {
    return;
  }
  await ctx.db.insert("notifications", {
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    complaintId: args.complaintId,
    complaintCode: args.complaintCode,
    link: args.link,
    read: false,
    createdAt: Date.now(),
  });
}

/** Notify every user with one of the given roles (optionally filtered). */
export async function notifyUsers(
  ctx: MutationCtx,
  roles: string[],
  filter: (u: Doc<"users">) => boolean,
  args: Parameters<typeof notify>[1] extends infer A
    ? Omit<A, "userId">
    : never,
) {
  const users = await ctx.db.query("users").collect();
  for (const u of users) {
    if (u.role && roles.includes(u.role) && filter(u)) {
      await notify(ctx, { ...args, userId: u._id });
    }
  }
}

/** Generate the next complaint code: CG-2026-001245 */
export async function nextComplaintCode(ctx: MutationCtx): Promise<string> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", "root"))
    .first();
  const year = new Date().getFullYear();
  if (!counter) {
    await ctx.db.insert("counters", {
      key: "root",
      nextComplaint: 1246,
      seeded: false,
    });
    return `CG-${year}-001245`;
  }
  const n = counter.nextComplaint ?? 1245;
  await ctx.db.patch(counter._id, { nextComplaint: n + 1 });
  return `CG-${year}-${String(n).padStart(6, "0")}`;
}
