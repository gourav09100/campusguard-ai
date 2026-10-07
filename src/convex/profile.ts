import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { notify, requireAdmin, requireUser } from "./helpers";
import { CLAIMED_POOL_EMAIL, DEMO_SEED_EMAIL } from "./seed";

/** Mock admin setup code (demo build) — replace with server-side invite flow. */
const ADMIN_SETUP_CODE = "CG-ADMIN-2026";

/**
 * First-run role claim: students and staff pick their role and fill their
 * profile; admins must present the setup code. Roles are immutable afterwards.
 */
export const claimRole = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
    name: v.string(),
    profileId: v.optional(v.string()),
    department: v.optional(v.string()),
    year: v.optional(v.string()),
    hostel: v.optional(v.string()),
    room: v.optional(v.string()),
    phone: v.optional(v.string()),
    designation: v.optional(v.string()),
    adminCode: v.optional(v.string()),
    /** true only for the demo role buttons — attaches the seeded demo data. */
    demo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "student" || user.role === "teacher" || user.role === "admin") {
      throw new Error("Your role is already set. Contact an admin to change it.");
    }
    if (args.role === "admin" && args.adminCode !== ADMIN_SETUP_CODE) {
      throw new Error("Invalid admin setup code");
    }
    if (args.name.trim().length < 3) throw new Error("Please enter your full name");

    await ctx.db.patch(userId, {
      role: args.role,
      name: args.name.trim(),
      profileId: args.profileId?.trim() || undefined,
      department: args.department?.trim() || undefined,
      year: args.year?.trim() || undefined,
      hostel: args.hostel?.trim() || undefined,
      room: args.room?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      designation: args.designation?.trim() || undefined,
      points: user.points ?? 0,
      validReports: user.validReports ?? 0,
      resolvedReports: user.resolvedReports ?? 0,
      badges: user.badges ?? [],
      joinedAt: user.joinedAt ?? Date.now(),
      prefs: user.prefs ?? {
        complaintUpdates: true,
        announcements: true,
        emergencyAlerts: true,
        emailDigest: false,
      },
    });

    const name = args.name.trim();
    const welcomeType =
      args.role === "student"
        ? "Report campus problems, track fixes and earn badges for responsible reporting."
        : args.role === "teacher"
          ? "You'll see complaints routed to your department — update status and upload resolution proof."
          : "Full analytics, complaint management, assignments, announcements and safety reports are ready.";
    await notify(ctx, {
      userId,
      title:
        args.role === "student"
          ? "Welcome to CampusGuard AI 🛡️"
          : args.role === "teacher"
            ? "Staff workspace activated"
            : "Admin workspace activated",
      body: welcomeType,
      type: "system",
      link: "/app",
    });

    const recent = async () =>
      (await ctx.db.query("complaints").withIndex("by_created").order("desc").take(250)).filter(
        (c) => !c.mergedInto,
      );

    if (args.demo) {
      const counter = await ctx.db
        .query("counters")
        .withIndex("by_key", (q) => q.eq("key", "root"))
        .first();

      if (args.role === "student" && counter?.seeded) {
        // Hand the seeded demo complaints to this demo student profile so the
        // dashboard, tracking timeline and feedback flow are full immediately.
        const pool = (await recent()).filter(
          (c) =>
            c.reporterEmail === DEMO_SEED_EMAIL ||
            c.reporterEmail === CLAIMED_POOL_EMAIL,
        );
        for (const c of pool) {
          await ctx.db.patch(c._id, {
            reporterId: userId,
            reporterName: name,
            reporterEmail: CLAIMED_POOL_EMAIL,
          });
        }
        for (const c of pool.slice(0, 6)) {
          const type =
            c.status === "resolved" || c.status === "closed"
              ? "resolved"
              : c.status === "assigned" || c.status === "in_progress"
                ? "assigned"
                : c.status === "under_review"
                  ? "reviewed"
                  : "submitted";
          await notify(ctx, {
            userId,
            title: `${c.complaintId} · ${c.title}`,
            body:
              type === "resolved"
                ? c.status === "closed"
                  ? "Closed — the ticket has been archived after verification."
                  : "Resolved — review the proof and rate the fix."
                : `Current status: ${c.status.replace("_", " ")}. ${c.assignedDepartment ?? "Awaiting assignment"}.`,
            type,
            complaintId: c._id,
            complaintCode: c.complaintId,
            link: `/app/complaints/${c._id}`,
          });
        }
      }

      if (args.role === "teacher" && counter?.seeded) {
        const assigned = (await recent())
          .filter(
            (c) =>
              c.status !== "resolved" &&
              c.status !== "closed" &&
              (c.assignedTo === userId ||
                (!c.assignedTo && c.assignedDepartment === args.department)),
          )
          .slice(0, 5);
        for (const c of assigned) {
          await notify(ctx, {
            userId,
            title: `New assignment: ${c.complaintId}`,
            body: `${c.priority.toUpperCase()} · ${c.category} at ${c.building} — ${c.title}`,
            type: "assigned",
            complaintId: c._id,
            complaintCode: c.complaintId,
            link: `/app/complaints/${c._id}`,
          });
        }
      }

      if (args.role === "admin" && counter?.seeded) {
        const all = await recent();
        const open = all.filter(
          (c) => c.status !== "resolved" && c.status !== "closed",
        ).length;
        const critical = all.filter(
          (c) =>
            c.priority === "critical" &&
            c.status !== "resolved" &&
            c.status !== "closed",
        ).length;
        await notify(ctx, {
          userId,
          title: "Morning briefing",
          body: `${all.length} total complaints · ${open} open · ${critical} critical awaiting triage.`,
          type: "system",
          link: "/app",
        });
      }
    }

    return { role: args.role };
  },
});

/** Self-service profile edit (role can never be changed here). */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    year: v.optional(v.string()),
    hostel: v.optional(v.string()),
    room: v.optional(v.string()),
    department: v.optional(v.string()),
    profileId: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const patch: Record<string, string | undefined> = {};
    for (const [k, val] of Object.entries(args)) {
      if (typeof val === "string") patch[k] = val.trim() || undefined;
    }
    await ctx.db.patch(userId, patch);
    return userId;
  },
});

/** Notification preferences. */
export const updatePrefs = mutation({
  args: {
    complaintUpdates: v.boolean(),
    announcements: v.boolean(),
    emergencyAlerts: v.boolean(),
    emailDigest: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { prefs: args });
    return userId;
  },
});

/** Admin: list everyone with profile data ([] for other roles). */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin") return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role)
      .sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
  },
});

/** Admin: change a user's role. */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("admin"),
      v.literal("user"),
    ),
  },
  handler: async (ctx, { userId, role }) => {
    const { user: admin } = await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(userId, { role });
    await notify(ctx, {
      userId,
      title: "Your role was updated",
      body: `An admin set your CampusGuard role to ${role}.`,
      type: "system",
      link: "/app",
    });
    return admin._id;
  },
});

/** Responsible-reporting leaderboard (all signed-in roles). */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "student")
      .map((u) => ({
        id: u._id,
        name: u.name ?? "Student",
        department: u.department ?? "",
        points: u.points ?? 0,
        validReports: u.validReports ?? 0,
        resolvedReports: u.resolvedReports ?? 0,
        badges: u.badges ?? [],
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});
