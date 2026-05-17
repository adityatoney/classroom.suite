import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";

const AnswerEntry = v.object({
  questionId: v.string(),
  value: v.string(),
});

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const { userId } = await requireAuth(ctx);
    const all = await ctx.db
      .query("lessonObservations")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return status ? all.filter((o) => o.status === status) : all;
  },
});

export const get = query({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) return null;
    return obs;
  },
});

/**
 * Resolve usable screenshot URLs for the detail page (so the editor can show
 * thumbnails). Returns `[{ storageId, url }]` for every screenshot that still
 * has a backing storage object.
 */
export const getScreenshotUrls = query({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) return [];
    const out: Array<{ storageId: string; url: string | null }> = [];
    for (const sid of obs.sourceScreenshotStorageIds) {
      const url = await ctx.storage.getUrl(sid);
      out.push({ storageId: sid as unknown as string, url });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    observationDate: v.string(),
    educatorName: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    subject: v.optional(v.string()),
    observerNames: v.optional(v.string()),
    rosterId: v.optional(v.id("rosters")),
    sourceScreenshotStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db.insert("lessonObservations", {
      userId,
      title: args.title,
      observationDate: args.observationDate,
      educatorName: args.educatorName,
      gradeLevel: args.gradeLevel,
      subject: args.subject,
      observerNames: args.observerNames,
      rosterId: args.rosterId,
      sourceScreenshotStorageIds: args.sourceScreenshotStorageIds ?? [],
      answers: [],
      status: "draft",
    });
  },
});

/** Update the lesson metadata or status fields. */
export const updateMeta = mutation({
  args: {
    observationId: v.id("lessonObservations"),
    title: v.optional(v.string()),
    observationDate: v.optional(v.string()),
    educatorName: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    subject: v.optional(v.string()),
    observerNames: v.optional(v.string()),
    observerEmail: v.optional(v.string()),
    rosterId: v.optional(v.id("rosters")),
    status: v.optional(v.string()),
    lessonPlanText: v.optional(v.string()),
    postLessonNotes: v.optional(v.string()),
  },
  handler: async (ctx, { observationId, ...patch }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) throw new Error("Observation not found");
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(observationId, cleaned);
  },
});

/** Upsert a single answer (used by the autosaved field editors). */
export const patchAnswer = mutation({
  args: {
    observationId: v.id("lessonObservations"),
    questionId: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { observationId, questionId, value }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) throw new Error("Observation not found");

    const existing = obs.answers.findIndex((a) => a.questionId === questionId);
    const next = [...obs.answers];
    if (existing >= 0) {
      next[existing] = { questionId, value };
    } else {
      next.push({ questionId, value });
    }
    await ctx.db.patch(observationId, { answers: next });
  },
});

export const addScreenshot = mutation({
  args: {
    observationId: v.id("lessonObservations"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { observationId, storageId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) throw new Error("Observation not found");
    await ctx.db.patch(observationId, {
      sourceScreenshotStorageIds: [...obs.sourceScreenshotStorageIds, storageId],
    });
  },
});

export const removeScreenshot = mutation({
  args: {
    observationId: v.id("lessonObservations"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { observationId, storageId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) throw new Error("Observation not found");
    const next = obs.sourceScreenshotStorageIds.filter((s) => s !== storageId);
    await ctx.db.patch(observationId, { sourceScreenshotStorageIds: next });
    try {
      await ctx.storage.delete(storageId);
    } catch {
      /* already gone */
    }
  },
});

export const remove = mutation({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) throw new Error("Observation not found");
    for (const sid of obs.sourceScreenshotStorageIds ?? []) {
      try {
        await ctx.storage.delete(sid);
      } catch {
        /* ignore */
      }
    }
    await ctx.db.delete(observationId);
  },
});

/** Generate a short-lived upload URL for a lesson screenshot. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Internal: invoked by the extractAnswers action to merge Claude's answers
 * into the observation. Only fills empty answers (manual edits are sacred).
 */
export const internal_loadForExtraction = internalQuery({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new Error("Observation not found");
    return obs;
  },
});

export const internal_mergeAnswers = internalMutation({
  args: {
    observationId: v.id("lessonObservations"),
    answers: v.array(AnswerEntry),
    extractedAt: v.string(),
  },
  handler: async (ctx, { observationId, answers, extractedAt }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new Error("Observation not found");
    const byId = new Map(obs.answers.map((a) => [a.questionId, a.value]));
    for (const incoming of answers) {
      const current = byId.get(incoming.questionId);
      // Only fill if currently empty (preserves manual edits).
      if (current === undefined || current.trim() === "") {
        byId.set(incoming.questionId, incoming.value);
      }
    }
    const next = Array.from(byId, ([questionId, value]) => ({ questionId, value }));
    await ctx.db.patch(observationId, {
      answers: next,
      lastExtractedAt: extractedAt,
      lastExtractError: undefined,
    });
  },
});

export const internal_recordExtractError = internalMutation({
  args: {
    observationId: v.id("lessonObservations"),
    error: v.string(),
  },
  handler: async (ctx, { observationId, error }) => {
    await ctx.db.patch(observationId, { lastExtractError: error });
  },
});

/**
 * Replace ALL post-observation answers atomically. Pre-observation answers
 * (every questionId NOT in the replacements array) are preserved as-is.
 * Used by the refine-post-observation action.
 */
export const internal_replacePostObsAnswers = internalMutation({
  args: {
    observationId: v.id("lessonObservations"),
    replacements: v.array(AnswerEntry),
    refinedAt: v.string(),
  },
  handler: async (ctx, { observationId, replacements, refinedAt }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new Error("Observation not found");
    const replaceIds = new Set(replacements.map((r) => r.questionId));
    const preserved = obs.answers.filter((a) => !replaceIds.has(a.questionId));
    const next = [...preserved, ...replacements];
    await ctx.db.patch(observationId, {
      answers: next,
      lastRefinedAt: refinedAt,
      lastExtractError: undefined,
    });
  },
});
