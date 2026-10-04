import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// CampusGuard AI roles: student, teacher/staff, admin.
// (user/member kept for compatibility with the base auth tables.)
export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  TEACHER: "teacher",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.STUDENT),
  v.literal(ROLES.TEACHER),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);
export type Priority = Infer<typeof priorityValidator>;

export const statusValidator = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("resolved"),
);
export type ComplaintStatus = Infer<typeof statusValidator>;

/** A photo can live in Convex file storage (uploads) or be a plain URL (demo seed). */
export const photoValidator = v.union(
  v.object({ kind: v.literal("file"), id: v.id("_storage") }),
  v.object({ kind: v.literal("url"), url: v.string() }),
);
export type Photo = Infer<typeof photoValidator>;

export const aiAnalysisValidator = v.object({
  category: v.string(),
  subCategory: v.string(),
  priority: priorityValidator,
  department: v.string(),
  summary: v.string(),
  suggestedAction: v.string(),
  confidence: v.number(),
  duplicateCount: v.number(),
});
export type AiAnalysis = Infer<typeof aiAnalysisValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // --- CampusGuard profile fields ---
      profileId: v.optional(v.string()), // student ID / employee ID / admin ID
      department: v.optional(v.string()),
      year: v.optional(v.string()), // students: 1st year ... 4th year
      hostel: v.optional(v.string()),
      room: v.optional(v.string()),
      phone: v.optional(v.string()),
      designation: v.optional(v.string()), // teacher/staff designation
      points: v.optional(v.number()),
      validReports: v.optional(v.number()),
      resolvedReports: v.optional(v.number()),
      badges: v.optional(v.array(v.string())), // badge ids from lib/campus
      joinedAt: v.optional(v.number()),
      prefs: v.optional(
        v.object({
          complaintUpdates: v.boolean(),
          announcements: v.boolean(),
          emergencyAlerts: v.boolean(),
          emailDigest: v.boolean(),
        }),
      ),
    }).index("email", ["email"]),

    complaints: defineTable({
      complaintId: v.string(), // CG-2026-001245
      title: v.string(),
      description: v.string(),
      category: v.string(),
      subCategory: v.optional(v.string()),
      priority: priorityValidator,
      status: statusValidator,

      // Location hierarchy: campus > building > block > floor > room/area
      campus: v.string(),
      building: v.string(),
      block: v.optional(v.string()),
      floor: v.optional(v.string()),
      room: v.optional(v.string()),
      locationText: v.optional(v.string()),
      gpsLat: v.optional(v.number()),
      gpsLng: v.optional(v.number()),

      reporterId: v.id("users"),
      reporterName: v.string(),
      reporterEmail: v.optional(v.string()),

      photos: v.array(photoValidator),

      ai: v.optional(aiAnalysisValidator),

      assignedDepartment: v.optional(v.string()),
      assignedTo: v.optional(v.id("users")),
      assignedToName: v.optional(v.string()),

      resolvedAt: v.optional(v.number()),
      resolutionNote: v.optional(v.string()),
      resolvedBy: v.optional(v.string()),
      resolutionPhotos: v.optional(v.array(photoValidator)),

      feedback: v.optional(
        v.object({
          rating: v.number(),
          comment: v.string(),
          solved: v.boolean(),
          createdAt: v.number(),
        }),
      ),

      mergedInto: v.optional(v.id("complaints")),
      reopenedCount: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_reporter", ["reporterId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"])
      .index("by_complaint_id", ["complaintId"])
      .index("by_department", ["assignedDepartment"]),

    statusHistory: defineTable({
      complaintId: v.id("complaints"),
      status: statusValidator,
      note: v.string(),
      actorName: v.string(),
      actorRole: v.string(),
      createdAt: v.number(),
    }).index("by_complaint", ["complaintId", "createdAt"]),

    comments: defineTable({
      complaintId: v.id("complaints"),
      authorId: v.optional(v.id("users")),
      authorName: v.string(),
      authorRole: v.string(),
      body: v.string(),
      kind: v.union(
        v.literal("comment"),
        v.literal("internal_note"),
        v.literal("staff_update"),
        v.literal("admin_update"),
      ),
      createdAt: v.number(),
    }).index("by_complaint", ["complaintId"]),

    notifications: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
      type: v.union(
        v.literal("submitted"),
        v.literal("reviewed"),
        v.literal("assigned"),
        v.literal("status"),
        v.literal("resolved"),
        v.literal("reopened"),
        v.literal("announcement"),
        v.literal("emergency"),
        v.literal("badge"),
        v.literal("system"),
      ),
      complaintId: v.optional(v.id("complaints")),
      complaintCode: v.optional(v.string()),
      link: v.optional(v.string()),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId", "createdAt"])
      .index("by_unread", ["userId", "read"]),

    announcements: defineTable({
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
      createdBy: v.string(),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    emergencyReports: defineTable({
      kind: v.union(
        v.literal("sos"),
        v.literal("unsafe_zone"),
        v.literal("suspicious"),
      ),
      title: v.string(),
      details: v.string(),
      location: v.string(),
      reporterName: v.string(),
      reporterId: v.optional(v.id("users")),
      status: v.union(
        v.literal("new"),
        v.literal("acknowledged"),
        v.literal("resolved"),
      ),
      simulated: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_created", ["createdAt"])
      .index("by_status", ["status"]),

    departments: defineTable({
      name: v.string(),
      description: v.string(),
      color: v.string(),
      head: v.string(),
      createdAt: v.number(),
    }).index("by_name", ["name"]),

    locations: defineTable({
      name: v.string(),
      kind: v.union(
        v.literal("hostel"),
        v.literal("academic"),
        v.literal("facility"),
        v.literal("utility"),
      ),
      area: v.string(),
      description: v.string(),
      // percentage coordinates for the stylised campus map
      x: v.number(),
      y: v.number(),
      createdAt: v.number(),
    }).index("by_name", ["name"]),

    counters: defineTable({
      key: v.string(),
      nextComplaint: v.optional(v.number()),
      seeded: v.optional(v.boolean()),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
