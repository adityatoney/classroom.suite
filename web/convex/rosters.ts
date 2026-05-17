import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const PRONOUN = v.union(v.literal("he"), v.literal("she"), v.literal("they"));

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const { userId } = await requireAuth(ctx);
    const rosters = await ctx.db
      .query("rosters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return includeArchived ? rosters : rosters.filter((r) => !r.archived);
  },
});

export const get = query({
  args: { rosterId: v.id("rosters") },
  handler: async (ctx, { rosterId }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) return null;
    return roster;
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, { name, description }) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db.insert("rosters", {
      userId,
      name,
      description,
      archived: false,
    });
  },
});

export const rename = mutation({
  args: {
    rosterId: v.id("rosters"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { rosterId, name, description }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");
    await ctx.db.patch(rosterId, { name, description });
  },
});

export const setArchived = mutation({
  args: { rosterId: v.id("rosters"), archived: v.boolean() },
  handler: async (ctx, { rosterId, archived }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");
    await ctx.db.patch(rosterId, { archived });
  },
});

export const remove = mutation({
  args: { rosterId: v.id("rosters") },
  handler: async (ctx, { rosterId }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");

    // Cascade: delete subjects (which cascade banks + narratives)
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    for (const subj of subjects) {
      const banks = await ctx.db
        .query("commentBank")
        .withIndex("by_subject", (q) => q.eq("subjectId", subj._id))
        .collect();
      for (const b of banks) await ctx.db.delete(b._id);
      const narratives = await ctx.db
        .query("narratives")
        .withIndex("by_subject_session", (q) => q.eq("subjectId", subj._id))
        .collect();
      for (const n of narratives) await ctx.db.delete(n._id);
      await ctx.db.delete(subj._id);
    }

    // Cascade: students (and any remaining narratives for them)
    const students = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    for (const student of students) {
      const narratives = await ctx.db
        .query("narratives")
        .withIndex("by_student_session", (q) => q.eq("studentId", student._id))
        .collect();
      for (const n of narratives) await ctx.db.delete(n._id);
      await ctx.db.delete(student._id);
    }

    await ctx.db.delete(rosterId);
  },
});

export const bulkImportFromCsv = mutation({
  args: {
    rosterId: v.id("rosters"),
    rows: v.array(
      v.object({
        name: v.string(),
        pronoun: PRONOUN,
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { rosterId, rows }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");

    // Append at the end of existing sort order
    const existing = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    let nextSort = existing.length > 0
      ? Math.max(...existing.map((s) => s.sortOrder)) + 1
      : 0;

    const created: string[] = [];
    for (const row of rows) {
      const id = await ctx.db.insert("students", {
        userId,
        rosterId,
        name: row.name,
        pronoun: row.pronoun,
        notes: row.notes,
        sortOrder: nextSort++,
      });
      created.push(id);
    }
    return { imported: created.length };
  },
});
