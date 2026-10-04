import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { notify, requireAdmin, requireUser } from "./helpers";

/**
 * Campus safety reports: SOS (simulated), unsafe zones and suspicious
 * activity. Demo mode never contacts real emergency services.
 */
export const create = mutation({
  args: {
    kind: v.union(v.literal("sos"), v.literal("unsafe_zone"), v.literal("suspicious")),
    title: v.string(),
    details: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const id = await ctx.db.insert("emergencyReports", {
      kind: args.kind,
      title: args.title.trim(),
      details: args.details.trim(),
      location: args.location.trim(),
      reporterName: user.name ?? user.email ?? "User",
      reporterId: userId,
      status: "new",
      simulated: true,
      createdAt: Date.now(),
    });

    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.role === "admin" || u.role === "teacher") {
        await notify(ctx, {
          userId: u._id,
          title:
            args.kind === "sos"
              ? `🚨 SIMULATED SOS — ${args.location}`
              : `Safety report: ${args.title.trim()}`,
          body: args.details.trim() || "Reported from the Campus Safety page.",
          type: "emergency",
          link: "/app/safety",
        });
      }
    }
    return id;
  },
});

/** Admin view of every safety report. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("emergencyReports")
      .withIndex("by_created")
      .order("desc")
      .take(100);
  },
});

/** Public strip of recent campus alerts (reporter identity hidden). */
export const activeAlerts = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db
      .query("emergencyReports")
      .withIndex("by_created")
      .order("desc")
      .take(12);
    return rows.map((r) => ({
      id: r._id,
      kind: r.kind,
      title: r.title,
      details: r.details,
      location: r.location,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("emergencyReports"),
    status: v.union(v.literal("new"), v.literal("acknowledged"), v.literal("resolved")),
  },
  handler: async (ctx, { id, status }) => {
    const { user } = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Report not found");
    await ctx.db.patch(id, { status });
    if (row.reporterId && status !== "new") {
      await notify(ctx, {
        userId: row.reporterId,
        title: `Safety report ${status}`,
        body: `Control room ${status} your report: ${row.title}`,
        type: "emergency",
        link: "/app/safety",
      });
    }
    return user._id;
  },
});
