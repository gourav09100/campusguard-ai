import { v } from "convex/values";
import { PRIORITIES, categoryLabel, validateCampusLocation } from "../lib/campus";
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
  v.literal("closed"),
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
  previousStatus?: Doc<"complaints">["status"],
) {
  await ctx.db.insert("statusHistory", {
    complaintId,
    status,
    previousStatus,
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

/** Lookup by human tracking code (Track Complaint page).
 *  Same access rule as get(): owner, staff or admin only. */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { userId, user } = await requireUser(ctx);
    const normalized = code.trim().toUpperCase();
    const found = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", normalized))
      .first();
    if (!found) return null;
    const allowed =
      user.role === "admin" ||
      user.role === "teacher" ||
      found.reporterId === userId;
    if (!allowed) return null;
    return found;
  },
});

export const history = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, { complaintId }) => {
    const { userId, user } = await requireUser(ctx);
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) return [];
    // Same access rule as get(): owner, staff or admin only.
    if (
      user.role !== "admin" &&
      user.role !== "teacher" &&
      complaint.reporterId !== userId
    ) {
      return [];
    }
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
    const { userId, user } = await requireUser(ctx);
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) return [];
    // Same access rule as get(): owner, staff or admin only.
    if (
      user.role !== "admin" &&
      user.role !== "teacher" &&
      complaint.reporterId !== userId
    ) {
      return [];
    }
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_complaint", (q) => q.eq("complaintId", complaintId))
      .collect();
    // Admin-only internal notes are filtered server-side — never delivered to
    // non-admin clients (the UI filter alone is not a privacy guarantee).
    return rows
      .filter((r) => user.role === "admin" || r.kind !== "internal_note")
      .sort((a, b) => a.createdAt - b.createdAt);
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
    const { userId } = await requireUser(ctx);
    type Match = {
      id: string;
      complaintId: string;
      title: string;
      status: Doc<"complaints">["status"];
      location: string;
      createdAt: number;
      mine: boolean;
    };
    const empty = { count: 0, matches: [] as Match[] };
    if (args.title.trim().length < 4 && args.description.trim().length < 12) {
      return empty;
    }
    const docs = (await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(300))
      .filter((c) => !c.mergedInto);
    const all: ExistingComplaint[] = docs.map((c) => ({
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
    const byCode = new Map(all.map((c) => [c.complaintId ?? "", c]));
    const samples: Match[] = [];
    for (const code of matches.slice(0, 3)) {
      const hit = byCode.get(code);
      if (!hit) continue;
      const doc = docs.find((d) => d.complaintId === code);
      samples.push({
        id: hit.id ?? "",
        complaintId: hit.complaintId ?? "",
        title: hit.title,
        status: hit.status,
        location: [hit.building, hit.floor].filter(Boolean).join(" · "),
        createdAt: doc?.createdAt ?? 0,
        mine: hit.reporterId === userId,
      });
    }
    return { count, matches: samples };
  },
});

/**
 * Related complaints — same building+category, or same building with title
 * overlap. Shown in the "Related Complaints" section so admins can spot
 * multiple reports about the same underlying issue (and merge them).
 */
export const related = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, { complaintId }) => {
    const { userId, user } = await requireUser(ctx);
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) return [];
    // Same access rule as get(): owner, staff or admin only.
    if (
      user.role !== "admin" &&
      user.role !== "teacher" &&
      complaint.reporterId !== userId
    ) {
      return [];
    }
    const isStaff = user.role === "admin" || user.role === "teacher";
    const docs = (await ctx.db
      .query("complaints")
      .withIndex("by_created")
      .order("desc")
      .take(300))
      .filter(
        (c) =>
          !c.mergedInto &&
          c._id !== complaintId &&
          // Students only ever see their own related complaints; staff/admin see all.
          (isStaff || c.reporterId === userId),
      );

    const candTokens = new Set(
      complaint.title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3),
    );
    const scored = docs
      .map((c) => {
        const sameBuilding = c.building === complaint.building;
        const sameCategory = c.category === complaint.category;
        const titleTokens = c.title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length > 3);
        const overlap = titleTokens.filter((t) => candTokens.has(t)).length;
        let score = 0;
        if (sameBuilding && sameCategory) score += 2;
        else if (sameBuilding) score += 1;
        else if (sameCategory && overlap > 0) score += 1;
        if (overlap > 0) score += 1;
        if (sameBuilding && overlap > 0) score += 1;
        return { c, score, overlap };
      })
      .filter((r) => r.score >= 2)
      .sort((a, b) => b.score - a.score || b.c.createdAt - a.c.createdAt)
      .slice(0, 6);

    return scored.map(({ c, score }) => ({
      _id: c._id,
      complaintId: c.complaintId,
      title: c.title,
      status: c.status,
      priority: c.priority,
      category: c.category,
      building: c.building,
      block: c.block,
      floor: c.floor,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt,
      reason:
        score >= 4
          ? "Same building & issue"
          : c.category === complaint.category
            ? "Same category"
            : "Same building",
    }));
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

    // Location rules — floors start at 1st Floor, invalid building/block/floor
    // combinations (and any ground-floor value) can never be stored.
    const block = args.block?.trim() || undefined;
    const floor = args.floor?.trim() || undefined;
    const locationError = validateCampusLocation({
      building: args.building,
      block,
      floor,
    });
    if (locationError) throw new Error(locationError);

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
      block,
      floor,
      room: args.room,
      locationText: args.locationText,
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      reporterId: userId,
      reporterName: user.name ?? user.email ?? "Student",
      reporterEmail: user.email ?? undefined,
      photos: args.photos,
      ai,
      // Persist the AI routing so the complaint lands in the matching
      // department's staff queue immediately (matches the student-facing
      // "routed to X" notification and seeded data).
      assignedDepartment: ai.department,
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
    if (c.status === "closed") {
      throw new Error("Complaint is closed — reopen it before reassigning");
    }

    const staffLabel = args.staffName ?? args.department;
    const now = Date.now();
    await ctx.db.patch(args.complaintId, {
      assignedDepartment: args.department,
      assignedTo: args.staffUserId,
      assignedToName: args.staffName,
      assignedAt: now,
      status: "assigned",
      updatedAt: now,
    });
    await addHistory(
      ctx,
      args.complaintId,
      "assigned",
      args.note?.trim() || `Assigned to ${staffLabel}`,
      user.name ?? "Admin",
      "admin",
      c.status,
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

/** Staff accepts an assignment — claims the complaint and moves it In Progress. */
export const accept = mutation({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Staff access required");
    }
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.status === "resolved") throw new Error("Complaint already resolved");
    if (c.status === "closed") {
      throw new Error("Complaint is closed — reopen it first");
    }
    if (c.status === "in_progress") {
      throw new Error("This complaint is already being worked on");
    }
    if (c.assignedTo && c.assignedTo !== userId && user.role !== "admin") {
      throw new Error("This complaint is assigned to another staff member");
    }
    // Staff may claim open complaints explicitly assigned to them or routed to
    // their department (AI routing happens at submission); admins can claim
    // any open complaint.
    const routedToMe =
      c.assignedTo === userId ||
      (!!c.assignedDepartment &&
        (user.role === "admin" ||
          c.assignedDepartment === (user.department ?? "")));
    if (!routedToMe) {
      throw new Error(
        "This complaint is not routed to your department — ask an admin to assign it",
      );
    }
    const now = Date.now();
    const staffName = user.name ?? "Staff";
    await ctx.db.patch(args.complaintId, {
      status: "in_progress",
      assignedTo: c.assignedTo ?? userId,
      assignedToName: c.assignedToName ?? staffName,
      assignedAt: c.assignedAt ?? now,
      updatedAt: now,
    });
    await addHistory(
      ctx,
      args.complaintId,
      "in_progress",
      `Assignment accepted by ${staffName} — work started on site`,
      staffName,
      user.role ?? "teacher",
      c.status,
    );
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} is now in progress`,
      body: `${staffName} accepted the assignment and started work on "${c.title}".`,
      type: "status",
      complaintId: c._id,
      complaintCode: c.complaintId,
      link: `/app/complaints/${c._id}`,
    });
    if (user.role === "teacher") {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `${c.complaintId} accepted by ${staffName}`,
          body: "The assignment was accepted and is now in progress.",
          type: "status",
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
    if (args.status === "closed") {
      throw new Error("Use close() to archive a resolved complaint");
    }
    if (args.status === c.status) {
      throw new Error(`Complaint is already ${args.status.replace("_", " ")}`);
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
      c.status,
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
    // Keep the assigned staff member and admins in sync with the timeline.
    if (c.assignedTo && c.assignedTo !== user._id) {
      await notify(ctx, {
        userId: c.assignedTo,
        title: `${c.complaintId} is now ${args.status.replace("_", " ")}`,
        body: args.note.trim() || "The complaint status was updated.",
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    if (user.role === "teacher") {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `${c.complaintId} · ${args.status.replace("_", " ")}`,
          body: args.note.trim() || `Status updated by ${user.name ?? "staff"}.`,
          type: "status",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
    }
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
    if (c.status === "closed") {
      throw new Error("Complaint is closed — reopen it before resolving again");
    }
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
      c.status,
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
    // Admins follow every resolution they did not perform themselves.
    if (user.role !== "admin") {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `${c.complaintId} resolved by ${user.name ?? "staff"}`,
          body: args.note.trim() || `Resolution proof uploaded for "${c.title}".`,
          type: "resolved",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
    }

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

/**
 * Staff / admin closes a resolved complaint (final archival step of the
 * workflow: submitted → … → resolved → closed). Notifies the student.
 */
export const close = mutation({
  args: {
    complaintId: v.id("complaints"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin" && user.role !== "teacher") {
      throw new Error("Staff access required");
    }
    const c = await loadComplaint(ctx, args.complaintId);
    if (c.status === "closed") throw new Error("Already closed");
    if (c.status !== "resolved") {
      throw new Error("A complaint must be resolved before it can be closed");
    }
    const now = Date.now();
    await ctx.db.patch(args.complaintId, {
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });
    await addHistory(
      ctx,
      args.complaintId,
      "closed",
      args.note?.trim() || "Complaint closed after final verification",
      user.name ?? "Staff",
      user.role ?? "teacher",
      "resolved",
    );
    await notify(ctx, {
      userId: c.reporterId,
      title: `${c.complaintId} closed`,
      body:
        args.note?.trim() ||
        `"${c.title}" has been closed — thanks for reporting it.`,
      type: "closed",
      complaintId: c._id,
      complaintCode: c.complaintId,
      link: `/app/complaints/${c._id}`,
    });
    if (user.role === "teacher") {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `${c.complaintId} closed by ${user.name ?? "staff"}`,
          body: args.note?.trim() || "Complaint archived after verification.",
          type: "closed",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
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
    if (c.status === "under_review" || c.status === "submitted") {
      throw new Error("Complaint is already open for review");
    }
    await ctx.db.patch(args.complaintId, {
      status: "under_review",
      resolvedAt: undefined,
      closedAt: undefined,
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
      c.status,
    );
    // Reporter + assigned staff learn about the reopen; admins are notified below.
    if (c.reporterId !== userId) {
      await notify(ctx, {
        userId: c.reporterId,
        title: `${c.complaintId} reopened`,
        body: args.reason.trim() || "Your complaint was reopened for review.",
        type: "reopened",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    if (c.assignedTo && c.assignedTo !== userId) {
      await notify(ctx, {
        userId: c.assignedTo,
        title: `${c.complaintId} reopened`,
        body: args.reason.trim() || "The complaint was reopened and needs attention again.",
        type: "reopened",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
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
      c.status,
    );
    // Reporter + assigned staff get the escalation; admins are notified below.
    if (c.reporterId !== userId) {
      await notify(ctx, {
        userId: c.reporterId,
        title: `${c.complaintId} escalated to ${priority.toUpperCase()}`,
        body: args.reason.trim() || "Your complaint was escalated for faster action.",
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    if (c.assignedTo && c.assignedTo !== userId) {
      await notify(ctx, {
        userId: c.assignedTo,
        title: `${c.complaintId} escalated to ${priority.toUpperCase()}`,
        body: args.reason.trim() || "Priority raised — please prioritise this job.",
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
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
      c.status,
    );
    // Priority changes notify the student and the assigned staff member.
    if (c.reporterId !== user._id) {
      await notify(ctx, {
        userId: c.reporterId,
        title: `${c.complaintId} priority changed`,
        body: `Priority is now ${args.priority.toUpperCase()} — "${c.title}".`,
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    if (c.assignedTo && c.assignedTo !== user._id) {
      await notify(ctx, {
        userId: c.assignedTo,
        title: `${c.complaintId} priority changed`,
        body: `Priority is now ${args.priority.toUpperCase()} — "${c.title}".`,
        type: "status",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
    return c._id;
  },
});

/**
 * Admin accepts or manually edits the AI suggestions for a complaint.
 * Optionally applies the (possibly edited) suggestion to the complaint's
 * category / priority / department and records the decision on the timeline.
 */
export const updateAi = mutation({
  args: {
    complaintId: v.id("complaints"),
    category: v.string(),
    subCategory: v.optional(v.string()),
    priority: priorityArg,
    department: v.string(),
    summary: v.string(),
    suggestedAction: v.string(),
    confidence: v.number(),
    /** true = apply the suggestion to the complaint fields as well */
    apply: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const c = await loadComplaint(ctx, args.complaintId);
    const now = Date.now();
    const ai = {
      // ai.category is stored as the human label; complaint.category (apply) is the id.
      category: categoryLabel(args.category),
      subCategory: args.subCategory ?? c.ai?.subCategory ?? "",
      priority: args.priority,
      department: args.department,
      summary: args.summary,
      suggestedAction: args.suggestedAction,
      confidence: args.confidence,
      duplicateCount: c.ai?.duplicateCount ?? 0,
    };
    await ctx.db.patch(args.complaintId, {
      ai,
      ...(args.apply
        ? {
            category: args.category,
            subCategory: args.subCategory,
            priority: args.priority,
            assignedDepartment: args.department,
          }
        : {}),
      updatedAt: now,
    });
    await addHistory(
      ctx,
      args.complaintId,
      c.status,
      args.apply
        ? `AI suggestion accepted and applied (${categoryLabel(args.category)} · ${args.priority.toUpperCase()} · ${args.department})`
        : `AI suggestion updated manually (${categoryLabel(args.category)} · ${args.priority.toUpperCase()} · ${args.department})`,
      user.name ?? "Admin",
      "admin",
      c.status,
    );
    if (c.reporterId !== user._id) {
      await notify(ctx, {
        userId: c.reporterId,
        title: `${c.complaintId} reviewed`,
        body: `Admin reviewed the AI analysis — ${categoryLabel(args.category)} · ${args.priority.toUpperCase()} priority.`,
        type: "reviewed",
        complaintId: c._id,
        complaintCode: c.complaintId,
        link: `/app/complaints/${c._id}`,
      });
    }
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
    // Admins see work notes added by staff on any complaint.
    if (args.kind !== "comment" && user.role === "teacher") {
      await notifyUsers(
        ctx,
        ["admin"],
        () => true,
        {
          title: `Work note on ${c.complaintId}`,
          body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
          type: "status",
          complaintId: c._id,
          complaintCode: c.complaintId,
          link: `/app/complaints/${c._id}`,
        },
      );
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
    if (c.status !== "resolved" && c.status !== "closed") {
      throw new Error("Feedback opens after resolution");
    }
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
        closedAt: undefined,
        reopenedCount: (c.reopenedCount ?? 0) + 1,
      });
      await addHistory(
        ctx,
        args.complaintId,
        "under_review",
        `Feedback: problem NOT solved (${rating}★) — flagged for admin review`,
        user.name ?? "Student",
        "student",
        c.status,
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
        c.status,
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
      source.status,
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
    await requireAdmin(ctx);
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
