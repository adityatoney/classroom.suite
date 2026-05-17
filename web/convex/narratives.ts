import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const listForSession = query({
  args: {
    rosterId: v.id("rosters"),
    subjectId: v.id("subjects"),
    sessionLabel: v.string(),
  },
  handler: async (ctx, { rosterId, subjectId, sessionLabel }) => {
    const { userId } = await requireAuth(ctx);
    const all = await ctx.db
      .query("narratives")
      .withIndex("by_subject_session", (q) =>
        q.eq("subjectId", subjectId).eq("sessionLabel", sessionLabel)
      )
      .collect();
    return all.filter((n) => n.userId === userId && n.rosterId === rosterId);
  },
});

export const upsert = mutation({
  args: {
    rosterId: v.id("rosters"),
    subjectId: v.id("subjects"),
    studentId: v.id("students"),
    sessionLabel: v.string(),
    selectedCommentIds: v.array(v.id("commentBank")),
    compiledText: v.string(),
    manualOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Find existing by (student, subject, session)
    const candidates = await ctx.db
      .query("narratives")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionLabel", args.sessionLabel)
      )
      .collect();
    const existing = candidates.find((n) => n.subjectId === args.subjectId);

    const lastEditedAt = new Date().toISOString();

    if (existing) {
      if (existing.userId !== userId) throw new Error("Forbidden");
      await ctx.db.patch(existing._id, {
        selectedCommentIds: args.selectedCommentIds,
        compiledText: args.compiledText,
        manualOverride: args.manualOverride,
        lastEditedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("narratives", {
      userId,
      rosterId: args.rosterId,
      subjectId: args.subjectId,
      studentId: args.studentId,
      sessionLabel: args.sessionLabel,
      selectedCommentIds: args.selectedCommentIds,
      compiledText: args.compiledText,
      manualOverride: args.manualOverride,
      lastEditedAt,
    });
  },
});

export const clearManualOverride = mutation({
  args: { narrativeId: v.id("narratives") },
  handler: async (ctx, { narrativeId }) => {
    const { userId } = await requireAuth(ctx);
    const narrative = await ctx.db.get(narrativeId);
    if (!narrative || narrative.userId !== userId) throw new Error("Narrative not found");
    await ctx.db.patch(narrativeId, { manualOverride: undefined });
  },
});

export const listSessionLabels = query({
  args: { rosterId: v.id("rosters"), subjectId: v.optional(v.id("subjects")) },
  handler: async (ctx, { rosterId, subjectId }) => {
    const { userId } = await requireAuth(ctx);
    const narratives = await ctx.db
      .query("narratives")
      .withIndex("by_user_session", (q) => q.eq("userId", userId))
      .collect();
    const labels = new Set(
      narratives
        .filter((n) => n.rosterId === rosterId)
        .filter((n) => (subjectId ? n.subjectId === subjectId : true))
        .map((n) => n.sessionLabel)
    );
    return Array.from(labels).sort();
  },
});

/** Internal: gather final paragraphs for the email digest. */
export const gatherForDigest = internalQuery({
  args: {
    userId: v.string(),
    rosterId: v.id("rosters"),
    subjectId: v.id("subjects"),
    sessionLabel: v.string(),
  },
  handler: async (ctx, { userId, rosterId, subjectId, sessionLabel }) => {
    const students = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    students.sort((a, b) => a.sortOrder - b.sortOrder);

    const narratives = await ctx.db
      .query("narratives")
      .withIndex("by_subject_session", (q) =>
        q.eq("subjectId", subjectId).eq("sessionLabel", sessionLabel)
      )
      .collect();

    const byStudent = new Map(
      narratives.filter((n) => n.userId === userId).map((n) => [n.studentId, n])
    );

    return students
      .filter((s) => s.userId === userId)
      .map((s) => {
        const n = byStudent.get(s._id);
        const finalText = n
          ? n.manualOverride && n.manualOverride.trim() !== ""
            ? n.manualOverride
            : n.compiledText
          : "";
        return { studentName: s.name, finalText };
      })
      .filter((r) => r.finalText.trim().length > 0);
  },
});
