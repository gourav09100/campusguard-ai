import { v } from "convex/values";
import { PRIORITIES } from "../lib/campus";
import { detectDuplicates, type ExistingComplaint } from "../lib/ai";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  nextComplaintCode,
  notify,
  notifyUsers,
  requireAdmin,
  requireUser,
} from "./helpers";

const photoArg = v.union(
  v.object({ kind: v.literal("file"), id: v.id("_storage") }),
  v.object({ kind: v.literal("url"), url: v.string() }),
);

const aiArg = v.object({
  category: v.string(),
  subCategory: v.string(),
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical"),
  ),
  department: v.string(),
  summary: v.string(),
  suggestedAction: v.string(),
  confidence: v.number(),
  duplicateCount: v.number(),
});

const statusArg = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("resolved"),
);

const priorityArg = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

async function addHistory(
  ctx: MutationCtx,
  complaintId: Id<"complaints">,
  status: Doc<"complaints">["status"],
  note: string,
  actorName: string,
  actorRole: string,
) {
  await ctx.db.insert("statusHistory", {
    complaintId,
    status,
    note,
    actorName,
    actorRole,
    createdAt: Date.now(),
  });
}

async function loadComplaint(ctx: QueryCtx | MutationCtx, id: Id<"complaints">) {
  const complaint = await ctx.db.get(id);
  if (!complaint) throw new Error("Complaint not found");
  return complaint;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** All complaints — admin only (returns [] for other roles so dashboards can
 *  safely subscribe without error boundaries). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin") return [];
    return await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(500);
  },
});

/** Complaints reported by the signed-in user. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const mine = await ctx.db
      .query("complaints")
      .withIndex("by_reporter", (q) => q.eq("reporterId", userId))
      .order("desc")
      .collect();
    return mine.filter((c) => !c.mergedInto);
  },
});

/** Complaints routed to the signed-in staff member or their department. */
export const listForStaff = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "teacher" && user.role !== "admin") {
      return [];
    }
    const all = await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(500);
    return all.filter((c) => {
      if (c.mergedInto) return false;
      if (c.assignedTo === userId) return true;
      if (!c.assignedTo && c.assignedDepartment) {
        return (
          user.role === "admin" ||
          (user.department ?? "") === c.assignedDepartment
        );
      }
      return false;
    });
  },
});

/** Limited projection for the campus map / hotspots (all signed-in roles). */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const all = await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(500);
    return all
      .filter((c) => !c.mergedInto)
      .map((c) => ({
        id: c._id,
        complaintId: c.complaintId,
        title: c.title,
        description: c.description,
        category: c.category,
        subCategory: c.subCategory,
        priority: c.priority,
        status: c.status,
        campus: c.campus,
        building: c.building,
        block: c.block,
        floor: c.floor,
        room: c.room,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt ?? undefined,
        reporterName: c.reporterName,
        assignedDepartment: c.assignedDepartment ?? undefined,
        aiCategory: c.ai?.category ?? undefined,
      }));
  },
});

/** Full complaint document — owner, staff or admin (null otherwise). */
export const get = query({
  args: { id: v.id("complaints") },
  handler: async (ctx, { id }) => {
    const { userId, user } = await requireUser(ctx);
    const complaint = await ctx.db.get(id);
    if (!complaint) return null;
    const allowed =
      user.role === "admin" ||
      user.role === "teacher" ||
      complaint.reporterId === userId;
    if (!allowed) return null;
    return complaint;
  },
});

/** Lookup by human tracking code (Track Complaint page). */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    await requireUser(ctx);
    const normalized = code.trim().toUpperCase();
    const found = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", normalized))
      .first();
    return found ?? null;
  },
});

export const history = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, { complaintId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("statusHistory")
      .withIndex("by_complaint", (q) => q.eq("complaintId", complaintId))
      .order("asc")
      .collect();
  },
});

export const comments = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, { complaintId }) => {
    await requireUser(ctx);
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_complaint", (q) => q.eq("complaintId", complaintId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** AI-assisted duplicate pre-check for the report form. */
export const checkDuplicates = query({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    building: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (args.title.trim().length < 4 && args.description.trim().length < 12) {
      return { count: 0, matches: [] as { complaintId: string; title: string }[] };
    }
    const all: ExistingComplaint[] = (await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(300))
      .filter((c) => !c.mergedInto)
      .map((c) => ({
        id: c._id,
        complaintId: c.complaintId,
        title: c.title,
        description: c.description,
        category: c.category,
        building: c.building,
        floor: c.floor ?? null,
        status: c.status,
        reporterId: c.reporterId,
      }));

    const { count, matches } = detectDuplicates(
      {
        title: args.title,
        description: args.description,
        category: args.category,
        building: args.building,
      },
      all,
    );
    const sampleIds = matches.slice(0, 3);
    const samples = all
      .filter((c) => sampleIds.includes(c.complaintId ?? ""))
      .map((c) => ({ complaintId: c.complaintId ?? "", title: c.title }));
    return { count, matches: samples };
  },
});

/** Convex file upload URL for photos / camera capture. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Public URL for an uploaded photo (storage id → https URL). */
export const photoUrl = query({
  args: { id: v.id("_storage") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(id);
  },
});

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subCategory: v.optional(v.string()),
    priority: priorityArg,
    campus: v.string(),
    building: v.string(),
    block: v.optional(v.string()),
    floor: v.optional(v.string()),
    room: v.optional(v.string()),
    locationText: v.optional(v.string()),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    photos: v.array(photoArg),
    ai: aiArg,
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (args.title.trim().length < 5) throw new Error("Title is too short");
    if (args.description.trim().length < 15) {
      throw new Error("Please describe the problem in at least 15 characters");
    }
    if (args.photos.length > 6) throw new Error("Maximum 6 photos allowed");

    const now = Date.now();
    const complaintId = await nextComplaintCode(ctx);

    // Server-side duplicate detection (authoritative number).
    const existing = (await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(300))
      .filter((c) => !c.mergedInto)
      .map((c) => ({
        complaintId: c.complaintId,
        title: c.title,
        description: c.description,
        category: c.category,
        building: c.building,
        floor: c.floor ?? null,
        status: c.status,
      }));
    const dup = detectDuplicates(
      {
        title: args.title,
        description: args.description,
        category: args.category,
        building: args.building,
      },
      existing,
    );

    const ai = { ...args.ai, duplicateCount: dup.count };

    const id = await ctx.db.insert("complaints", {
      complaintId,
      title: args.title.trim(),
      description: args.description.trim(),
      category: args.category,
      subCategory: args.subCategory,
      priority: ai.priority,
      status: "submitted",
      campus: args.campus,
      building: args.building,
      block: args.block,
      floor: args.floor,
      room: args.room,
      locationText: args.locationText,
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      reporterId: userId,
      reporterName: user.name ?? user.email ?? "Student",
      reporterEmail: user.email ?? undefined,
      photos: args.photos,
      ai,
      createdAt: now,
      updatedAt: now,
      reopenedCount: 0,
    });

    await addHistory(
      ctx,
      id,
      "submitted",
      "Complaint submitted with photo evidence",
      user.name ?? "Student",
      user.role ?? "student",
    );

    await notify(ctx, {
      userId,
      title: `Complaint ${complaintId} submitted`,
      body: `AI analysed your report: ${ai.category} · ${ai.priority.toUpperCase()} priority · routed to ${ai.department}.`,
      type: "submitted",
      complaintId: id,
      complaintCode: complaintId,
      link: `/app/complaints/${id}`,
    });

    await notifyUsers(
      ctx,
      ["admin"],
      () => true,
      {
        title: `New complaint ${complaintId}`,
        body: `${ai.priority.toUpperCase()} · ${ai.category} · ${args.building} — ${args.title}`,
        type: "submitted",
        complaintId: id,
        complaintCode: complaintId,
        link: `/app/complaints/${id}`,
      },
    );

    if (dup.count > 0) {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `Possible duplicates for ${complaintId}`,
          body: `${dup.count} similar open complaint(s) detected — review merge candidates.`,
          type: "reviewed",
          complaintId: id,
          complaintCode: complaintId,
          link: `/app/complaints/${id}`,
        },
      );
    }

    return { id, complaintId };
  },
});

/* ------------------------------------------------------------------ */
/* Workflow actions                                                    */
/* ------------------------------------------------------------------ */

async function bumpPoints(
  ctx: MutationCtx,
  userId: Id<"users">,
  delta: number,
  badgeId?: string,
) {
  const u = await ctx.db.get(userId);
  if (!u) return;
  const badges = u.badges ?? [];
  const newBadges = badgeId && !badges.includes(badgeId) ? [...badges, badgeId] : badges;
  await ctx.db.patch(userId, {
    points: (u.points ?? 0) + delta,
    badges: newBadges,
  });
  if (badgeId && !badges.includes(badgeId)) {
    await notify(ctx, {
      userId,
      title: "New badge unlocked",
      body: `You earned a CampusGuard badge (+${delta} points).`,
      type: "badge",
    });
  }
}

/** Admin assigns a department and/or staff member. */
export const assign = mutation({
  args: {
    complaintId: v.id("complaints"),
    department: v.string(),
    staffUserId: v.optional(v.id("users")),
    staffName: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.status === "resolved") throw new Error("Complaint already resolved");

    const staffLabel = args.staffName ?? args.department;
    await ctx.db.patch(args.complaintId, {
      assignedDepartment: args.department,
      assignedTo: args.staffUserId,
      assignedToName: args.staffName,
      status: "assigned",
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.complaintId,
      "assigned",
      args.note?.trim() || `Assigned to ${staffLabel}`,
      user.name ?? "Admin",
      "admin",
    );
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} has been assigned`,
      body: `Your complaint was assigned to ${staffLabel}.`,
      type: "assigned",
      complaintId: c._id,
      complaintCode: c.complaintId,
      link: `/app/complaints/${c._id}`,
    });
    if (args.staffUserId) {
      await notify(ctx, {
        userId: args.staffUserId,
        title: `New assignment: ${c.complaintId}`,
        body: `${c.priority.toUpperCase()} · ${c.category} at ${c.building} — ${c.title}`,
        type: "assigned",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    } else {
      await notifyUsers(
        ctx,
        ["teacher"],
        (u) => (u.department ?? "") === args.department,
        {
          title: `New assignment: ${c.complaintId}`,
          body: `${c.priority.toUpperCase()} · ${c.category} at ${c.building} — ${c.title}`,
          type: "assigned",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
    }
    return c._id;
  },
});

/** Status change with an update note (staff / admin). */
export const updateStatus = mutation({
  args: {
    complaintId: v.id("complaints"),
    status: statusArg,
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Staff access required");
    }
    const c = await loadComplaint(ctx, args.complaintId);
    if (args.status === "resolved") {
      throw new Error("Use resolve() to mark a complaint as resolved");
    }
    await ctx.db.patch(args.complaintId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.complaintId,
      args.status,
      args.note.trim() || "Status updated",
      user.name ?? "Staff",
      user.role ?? "teacher",
    );
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} is now ${args.status.replace("_", " ")}`,
      body: args.note.trim() || "The complaint status was updated.",
      type: "status",
      complaintId: c._id,
      complaintCode: c.complaintId,
      link: `/app/complaints/${c._id}`,
    });
    return c._id;
  },
});

/** Staff / admin uploads proof and marks the complaint resolved. */
export const resolve = mutation({
  args: {
    complaintId: v.id("complaints"),
    note: v.string(),
    photos: v.array(photoArg),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Staff access required");
    }
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.status === "resolved") throw new Error("Already resolved");
    const now = Date.now();

    await ctx.db.patch(args.complaintId, {
      status: "resolved",
      resolvedAt: now,
      resolutionNote: args.note.trim(),
      resolvedBy: user.name ?? "Staff",
      resolutionPhotos: args.photos,
      updatedAt: now,
    });
    await addHistory(
      ctx,
      args.complaintId,
      "resolved",
      args.note.trim() || "Resolved with proof",
      user.name ?? "Staff",
      user.role ?? "teacher",
    );
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} resolved 🎉`,
      body: `Your complaint was resolved — review the proof and rate the fix.`,
      type: "resolved",
      complaintId: c._id,
      complaintCode: c.complaintId,
      link: `/app/complaints/${c._id}`,
    });

    // Reward the reporter once a report is verified as fixed.
    const pts = PRIORITIES.find((p) => p.id === c.priority)?.points ?? 10;
    const reporter = await ctx.db.get(c.reporterId);
    const valid = (reporter?.validReports ?? 0) + 1;
    const resolvedCount = (reporter?.resolvedReports ?? 0) + 1;
    const badge =
      valid === 1
        ? "first_report"
        : valid === 5
          ? "helpful_reporter"
          : valid >= 10
            ? "campus_guardian"
            : undefined;
    await ctx.db.patch(c.reporterId, { validReports: valid, resolvedReports: resolvedCount });
    await bumpPoints(ctx, c.reporterId, pts, badge);

    // Staff SLA badge.
    const slaHours =
      { low: 120, medium: 72, high: 36, critical: 8 }[c.priority] ?? 72;
    if (now - c.createdAt <= slaHours * 3600_000) {
      await bumpPoints(ctx, user._id, 30, "quick_responder");
    }
    return c._id;
  },
});

/** Reopen a complaint (owner after unsatisfactory feedback, or admin). */
export const reopen = mutation({
  args: {
    complaintId: v.id("complaints"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    const isOwner = c.reporterId === userId;
    if (!isOwner && user.role !== "admin") {
      throw new Error("Only the reporter or an admin can reopen");
    }
    await ctx.db.patch(args.complaintId, {
      status: "under_review",
      resolvedAt: undefined,
      reopenedCount: (c.reopenedCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.complaintId,
      "under_review",
      `Reopened: ${args.reason.trim() || "Issue not fully resolved"}`,
      user.name ?? "User",
      user.role ?? "student",
    );
    await notifyUsers(
      ctx,
      ["admin"],
      () => true,
      {
        title: `${c.complaintId} reopened`,
        body: args.reason.trim() || "Reporter says the issue is not resolved.",
        type: "reopened",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      },
    );
    return c._id;
  },
});

/** Escalate priority (owner or staff) and alert admins. */
export const escalate = mutation({
  args: { complaintId: v.id("complaints"), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.reporterId !== userId && user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Not allowed");
    }
    const order = ["low", "medium", "high", "critical"] as const;
    const idx = Math.min(order.indexOf(c.priority) + 1, order.length - 1);
    const priority = order[idx];
    await ctx.db.patch(args.complaintId, {
      priority,
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.complaintId,
      c.status,
      `Escalated to ${priority.toUpperCase()}: ${args.reason.trim() || "Reporter requested escalation"}`,
      user.name ?? "User",
      user.role ?? "student",
    );
    await notifyUsers(
      ctx,
      ["admin"],
      () => true,
      {
        title: `${c.complaintId} escalated to ${priority.toUpperCase()}`,
        body: args.reason.trim() || "Escalation requested by reporter/staff.",
        type: "reopened",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      },
    );
    return c._id;
  },
});

/** Admin changes priority directly. */
export const setPriority = mutation({
  args: { complaintId: v.id("complaints"), priority: priorityArg },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    await ctx.db.patch(args.complaintId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.complaintId,
      c.status,
      `Priority changed to ${args.priority.toUpperCase()} by admin`,
      user.name ?? "Admin",
      "admin",
    );
    return c._id;
  },
});

/** Comment thread — students, staff and admins. */
export const addComment = mutation({
  args: {
    complaintId: v.id("complaints"),
    body: v.string(),
    kind: v.union(
      v.literal("comment"),
      v.literal("staff_update"),
      v.literal("admin_update"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    const body = args.body.trim();
    if (!body) throw new Error("Comment cannot be empty");
    if (args.kind !== "comment" && user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Staff access required");
    }
    await ctx.db.insert("comments", {
      complaintId: args.complaintId,
      authorId: userId,
      authorName: user.name ?? user.email ?? "User",
      authorRole: user.role ?? "student",
      body,
      kind: args.kind,
      createdAt: Date.now(),
    });
    // Notify the reporter about staff/admin updates.
    if (args.kind !== "comment" && c.reporterId !== userId) {
      await notify(ctx, {
        userId: c.reporterId,
        title: `Update on ${c.complaintId}`,
        body,
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    return c._id;
  },
});

/** Internal admin-only note (invisible to students). */
export const addInternalNote = mutation({
  args: { complaintId: v.id("complaints"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAdmin(ctx);
    const body = args.body.trim();
    if (!body) throw new Error("Note cannot be empty");
    await ctx.db.insert("comments", {
      complaintId: args.complaintId,
      authorId: userId,
      authorName: user.name ?? "Admin",
      authorRole: "admin",
      body,
      kind: "internal_note",
      createdAt: Date.now(),
    });
    return args.complaintId;
  },
});

/** Student feedback after resolution — "No" automatically reopens. */
export const submitFeedback = mutation({
  args: {
    complaintId: v.id("complaints"),
    rating: v.number(),
    comment: v.string(),
    solved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.reporterId !== userId) throw new Error("Only the reporter can give feedback");
    if (c.status !== "resolved") throw new Error("Feedback opens after resolution");
    const rating = Math.max(1, Math.min(5, Math.round(args.rating)));

    await ctx.db.patch(args.complaintId, {
      feedback: {
        rating,
        comment: args.comment.trim(),
        solved: args.solved,
        createdAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
    await bumpPoints(ctx, userId, 5, "feedback_hero");

    if (!args.solved) {
      await ctx.db.patch(args.complaintId, {
        status: "under_review",
        resolvedAt: undefined,
        reopenedCount: (c.reopenedCount ?? 0) + 1,
      });
      await addHistory(
        ctx,
        args.complaintId,
        "under_review",
        `Feedback: problem NOT solved (${rating}★) — flagged for admin review`,
        user.name ?? "Student",
        "student",
      );
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `${c.complaintId} flagged: problem not solved`,
          body: `Reporter rated ${rating}★ and says the issue persists — auto-reopened.`,
          type: "reopened",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
    } else {
      await addHistory(
        ctx,
        args.complaintId,
        "resolved",
        `Feedback: ${rating}★ — problem solved`,
        user.name ?? "Student",
        "student",
      );
    }
    return c._id;
  },
});

/** Admin merges a duplicate into a canonical complaint. */
export const merge = mutation({
  args: { sourceId: v.id("complaints"), targetId: v.id("complaints") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    if (args.sourceId === args.targetId) throw new Error("Cannot merge a complaint with itself");
    const source = await loadComplaint(ctx, args.sourceId);
    const target = await loadComplaint(ctx, args.targetId);
    await ctx.db.patch(args.sourceId, {
      mergedInto: args.targetId,
      updatedAt: Date.now(),
    });
    await addHistory(
      ctx,
      args.sourceId,
      source.status,
      `Merged into ${target.complaintId} by admin`,
      user.name ?? "Admin",
      "admin",
    );
    await notify(ctx, {
      userId: source.reporterId,
      title: `${source.complaintId} merged`,
      body: `Your report was linked to ${target.complaintId} — you'll get updates from the master complaint.`,
      type: "status",
      complaintId: args.targetId,
      complaintCode: target.complaintId,
      link: `/app/complaints/${args.targetId}`,
    });
    return target._id;
  },
});

/** Admin deletes an inappropriate report. */
export const remove = mutation({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    const historyRows = await ctx.db
      .query("statusHistory")
      .withIndex("by_complaint", (q) => q.eq("complaintId", args.complaintId))
      .collect();
    for (const h of historyRows) await ctx.db.delete(h._id);
    const commentRows = await ctx.db
      .query("comments")
      .withIndex("by_complaint", (q) => q.eq("complaintId", args.complaintId))
      .collect();
    for (const cm of commentRows) await ctx.db.delete(cm._id);
    await ctx.db.delete(args.complaintId);
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} removed`,
      body: "This report was removed by an admin for violating community guidelines.",
      type: "system",
    });
    return true;
  },
});
