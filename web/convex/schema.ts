import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ── Single-user owner record ─────────────────────────────────────────────
  authorizedUsers: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    picture: v.optional(v.string()),
    role: v.string(),                       // always "owner" v1
    digestFromAddress: v.optional(v.string()),
    digestToAddress: v.optional(v.string()),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  // ── Rosters ──────────────────────────────────────────────────────────────
  rosters: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "archived"]),

  students: defineTable({
    userId: v.string(),
    rosterId: v.id("rosters"),
    name: v.string(),
    pronoun: v.union(v.literal("he"), v.literal("she"), v.literal("they")),
    notes: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_roster", ["rosterId"])
    .index("by_user_roster", ["userId", "rosterId"]),

  // ── Subjects: belong to a roster (e.g. "Math" under "2nd Grade") ────────
  subjects: defineTable({
    userId: v.string(),
    rosterId: v.id("rosters"),
    name: v.string(),
    sortOrder: v.number(),
  })
    .index("by_roster", ["rosterId"])
    .index("by_user_roster", ["userId", "rosterId"]),

  // ── Comment Bank: scoped to a subject (optional → "global" tier) ───────
  commentBank: defineTable({
    userId: v.string(),
    subjectId: v.optional(v.id("subjects")),
    /**
     * Source-of-truth ordering: copied from the "ID" column of the imported
     * spreadsheet, or auto-assigned by row index during bulk import. Used to
     * sort the bank and label each entry in the picker.
     */
    importedId: v.optional(v.number()),
    text: v.string(),
    category: v.optional(v.string()),
    tags: v.array(v.string()),
    isFavorite: v.boolean(),
    usageCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subject", ["subjectId"])
    .index("by_user_subject", ["userId", "subjectId"])
    .index("by_user_favorite", ["userId", "isFavorite"]),

  // ── Live-grid narrative state per student per subject per session ──────
  narratives: defineTable({
    userId: v.string(),
    rosterId: v.id("rosters"),
    subjectId: v.optional(v.id("subjects")), // optional only to accept legacy rows; new rows always include it
    studentId: v.id("students"),
    sessionLabel: v.string(),
    selectedCommentIds: v.array(v.id("commentBank")),
    compiledText: v.string(),
    manualOverride: v.optional(v.string()),
    lastEditedAt: v.string(),
  })
    .index("by_user_session", ["userId", "sessionLabel"])
    .index("by_roster_session", ["rosterId", "sessionLabel"])
    .index("by_subject_session", ["subjectId", "sessionLabel"])
    .index("by_student_session", ["studentId", "sessionLabel"]),

  // ── Lesson Observations (CHA Faculty Observation Form 2026) ─────────────
  lessonObservations: defineTable({
    userId: v.string(),
    title: v.string(),
    educatorName: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    subject: v.optional(v.string()),
    observerNames: v.optional(v.string()),
    observationDate: v.string(),
    rosterId: v.optional(v.id("rosters")),
    sourceScreenshotStorageIds: v.array(v.id("_storage")),
    /** Optional typed lesson plan text used as extra grounding for Extract. */
    lessonPlanText: v.optional(v.string()),
    /** Raw post-lesson notes the teacher types AFTER teaching. Feeds the
     * Refine post-observation flow as the primary source. */
    postLessonNotes: v.optional(v.string()),
    /** Recipient email for the "send observation form" action. */
    observerEmail: v.optional(v.string()),
    /**
     * Free-text answers, one per question in OBSERVATION_QUESTIONS.
     * `questionId` keys into the static list in convex/observationQuestions.ts.
     */
    answers: v.array(
      v.object({
        questionId: v.string(),
        value: v.string(),
      })
    ),
    /** ISO timestamp of the last successful Claude extraction. */
    lastExtractedAt: v.optional(v.string()),
    /** ISO timestamp of the last successful post-observation refine run. */
    lastRefinedAt: v.optional(v.string()),
    /** Error from the last extraction attempt (cleared on success). */
    lastExtractError: v.optional(v.string()),
    status: v.string(),                     // "draft" | "complete"
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "observationDate"])
    .index("by_user_status", ["userId", "status"]),

  // ── BlockNote agendas ───────────────────────────────────────────────────
  lessonAgendas: defineTable({
    userId: v.string(),
    rosterId: v.optional(v.id("rosters")),
    title: v.string(),
    forDate: v.string(),
    blocks: v.string(),                     // stringified BlockNote JSON
    markdownCache: v.optional(v.string()),
    taskMappings: v.array(
      v.object({
        blockId: v.string(),
        studentIds: v.array(v.id("students")),
        label: v.optional(v.string()),
      })
    ),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "forDate"])
    .index("by_roster_date", ["rosterId", "forDate"]),

  // ── Email audit log ──────────────────────────────────────────────────────
  emailDispatches: defineTable({
    userId: v.string(),
    sessionLabel: v.string(),
    rosterId: v.optional(v.id("rosters")),
    toAddress: v.string(),
    fromAddress: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    studentCount: v.number(),
    resendMessageId: v.optional(v.string()),
    status: v.string(),                     // "sent" | "failed"
    errorMessage: v.optional(v.string()),
    sentAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_sentAt", ["userId", "sentAt"])
    .index("by_session", ["sessionLabel"]),
});
