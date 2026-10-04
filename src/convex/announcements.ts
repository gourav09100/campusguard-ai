import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { notify, requireAdmin, requireUser } from "./helpers";

/** Announcements visible to the signed-in user (audience-aware). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const rows = await ctx.db
      .query("announcements")
      .withIndex("by_created")
      .order("desc")
      .take(60);
    return rows.filter(
      (a) =>
        a.audience === "all" ||
        (a.audience === "students" && (user.role === "student" || user.role === "admin")) ||
        (a.audience === "staff" && (user.role === "teacher" || user.role === "admin")),
    );
  },
});

/** Admin publishes an announcement and notifies the matching audience. */
export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    kind: v.union(
      v.literal("maintenance"),
      v.literal("emergency"),
      v.literal("event"),
      v.literal("notice"),
      v.literal("general"),
    ),
    audience: v.union(
      v.literal("all"),
      v.literal("students"),
      v.literal("staff"),
    ),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    if (args.title.trim().length < 4) throw new Error("Title is too short");
    const id = await ctx.db.insert("announcements", {
      title: args.title.trim(),
      body: args.body.trim(),
      kind: args.kind,
      audience: args.audience,
      pinned: args.pinned,
      createdBy: user.name ?? "Admin",
      createdAt: Date.now(),
    });

    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (!u.role) continue;
      const matches =
        args.audience === "all" ||
        (args.audience === "students" && u.role === "student") ||
        (args.audience === "staff" && (u.role === "teacher" || u.role === "admin"));
      if (!matches) continue;
      await notify(ctx, {
        userId: u._id,
        title: `Campus announcement: ${args.title.trim()}`,
        body: args.body.trim(),
        type: "announcement",
        link: "/app/notifications",
      });
    }
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
    return true;
  },
});
