import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const PRONOUN = v.union(v.literal("he"), v.literal("she"), v.literal("they"));

export const listByRoster = query({
  args: { rosterId: v.id("rosters") },
  handler: async (ctx, { rosterId }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) return [];
    const students = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    return students.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    rosterId: v.id("rosters"),
    name: v.string(),
    pronoun: PRONOUN,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { rosterId, name, pronoun, notes }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");
    const existing = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    const sortOrder = existing.length > 0
      ? Math.max(...existing.map((s) => s.sortOrder)) + 1
      : 0;
    return await ctx.db.insert("students", {
      userId,
      rosterId,
      name,
      pronoun,
      notes,
      sortOrder,
    });
  },
});

export const update = mutation({
  args: {
    studentId: v.id("students"),
    name: v.optional(v.string()),
    pronoun: v.optional(PRONOUN),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { studentId, ...patch }) => {
    const { userId } = await requireAuth(ctx);
    const student = await ctx.db.get(studentId);
    if (!student || student.userId !== userId) throw new Error("Student not found");
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(studentId, cleaned);
  },
});

export const remove = mutation({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    const { userId } = await requireAuth(ctx);
    const student = await ctx.db.get(studentId);
    if (!student || student.userId !== userId) throw new Error("Student not found");
    // Cascade narratives
    const narratives = await ctx.db
      .query("narratives")
      .withIndex("by_student_session", (q) => q.eq("studentId", studentId))
      .collect();
    for (const n of narratives) await ctx.db.delete(n._id);
    await ctx.db.delete(studentId);
  },
});

export const reorder = mutation({
  args: {
    rosterId: v.id("rosters"),
    orderedIds: v.array(v.id("students")),
  },
  handler: async (ctx, { rosterId, orderedIds }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const student = await ctx.db.get(id);
      if (student && student.userId === userId && student.rosterId === rosterId) {
        await ctx.db.patch(id, { sortOrder: i });
      }
    }
  },
});
