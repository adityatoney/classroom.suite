import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const listByRoster = query({
  args: { rosterId: v.id("rosters") },
  handler: async (ctx, { rosterId }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) return [];
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    return subjects.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listAllForUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("subjects")
      .withIndex("by_user_roster", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, { subjectId }) => {
    const { userId } = await requireAuth(ctx);
    const subject = await ctx.db.get(subjectId);
    if (!subject || subject.userId !== userId) return null;
    return subject;
  },
});

export const create = mutation({
  args: { rosterId: v.id("rosters"), name: v.string() },
  handler: async (ctx, { rosterId, name }) => {
    const { userId } = await requireAuth(ctx);
    const roster = await ctx.db.get(rosterId);
    if (!roster || roster.userId !== userId) throw new Error("Roster not found");
    const existing = await ctx.db
      .query("subjects")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    const sortOrder = existing.length > 0
      ? Math.max(...existing.map((s) => s.sortOrder)) + 1
      : 0;
    return await ctx.db.insert("subjects", { userId, rosterId, name, sortOrder });
  },
});

export const rename = mutation({
  args: { subjectId: v.id("subjects"), name: v.string() },
  handler: async (ctx, { subjectId, name }) => {
    const { userId } = await requireAuth(ctx);
    const subject = await ctx.db.get(subjectId);
    if (!subject || subject.userId !== userId) throw new Error("Subject not found");
    await ctx.db.patch(subjectId, { name });
  },
});

export const remove = mutation({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, { subjectId }) => {
    const { userId } = await requireAuth(ctx);
    const subject = await ctx.db.get(subjectId);
    if (!subject || subject.userId !== userId) throw new Error("Subject not found");

    // Cascade: delete comment bank entries and narratives for this subject
    const banks = await ctx.db
      .query("commentBank")
      .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
      .collect();
    for (const b of banks) await ctx.db.delete(b._id);

    const narratives = await ctx.db
      .query("narratives")
      .withIndex("by_subject_session", (q) => q.eq("subjectId", subjectId))
      .collect();
    for (const n of narratives) await ctx.db.delete(n._id);

    await ctx.db.delete(subjectId);
  },
});
