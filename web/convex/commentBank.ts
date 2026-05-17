import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * List comment-bank entries.
 * - With `subjectId`: returns that subject's bank plus any "global" rows
 *   (entries with no subjectId). Sorted by `importedId` (the spreadsheet's
 *   ID column) so the on-screen order matches the source-of-truth.
 * - Without `subjectId`: returns every entry (used by the manager view).
 */
export const list = query({
  args: { subjectId: v.optional(v.id("subjects")) },
  handler: async (ctx, { subjectId }) => {
    const { userId } = await requireAuth(ctx);
    const all = await ctx.db
      .query("commentBank")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const filtered = subjectId
      ? all.filter((c) => c.subjectId === subjectId || c.subjectId === undefined)
      : all;

    return filtered.sort((a, b) => {
      const aHas = a.importedId !== undefined;
      const bHas = b.importedId !== undefined;
      if (aHas && bHas) return a.importedId! - b.importedId!;
      if (aHas) return -1;
      if (bHas) return 1;
      return a.text.localeCompare(b.text);
    });
  },
});

export const create = mutation({
  args: {
    text: v.string(),
    subjectId: v.optional(v.id("subjects")),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { text, subjectId, category, tags }) => {
    const { userId } = await requireAuth(ctx);
    if (subjectId) {
      const subject = await ctx.db.get(subjectId);
      if (!subject || subject.userId !== userId) throw new Error("Subject not found");
    }
    return await ctx.db.insert("commentBank", {
      userId,
      subjectId,
      text,
      category,
      tags: tags ?? [],
      isFavorite: false,
      usageCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    commentId: v.id("commentBank"),
    text: v.optional(v.string()),
    subjectId: v.optional(v.id("subjects")),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { commentId, ...patch }) => {
    const { userId } = await requireAuth(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.userId !== userId) throw new Error("Comment not found");
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(commentId, cleaned);
  },
});

export const remove = mutation({
  args: { commentId: v.id("commentBank") },
  handler: async (ctx, { commentId }) => {
    const { userId } = await requireAuth(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.userId !== userId) throw new Error("Comment not found");
    await ctx.db.delete(commentId);
  },
});

export const toggleFavorite = mutation({
  args: { commentId: v.id("commentBank") },
  handler: async (ctx, { commentId }) => {
    const { userId } = await requireAuth(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.userId !== userId) throw new Error("Comment not found");
    await ctx.db.patch(commentId, { isFavorite: !comment.isFavorite });
  },
});
