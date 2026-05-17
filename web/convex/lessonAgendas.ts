import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const TaskMapping = v.object({
  blockId: v.string(),
  studentIds: v.array(v.id("students")),
  label: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("lessonAgendas")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { agendaId: v.id("lessonAgendas") },
  handler: async (ctx, { agendaId }) => {
    const { userId } = await requireAuth(ctx);
    const agenda = await ctx.db.get(agendaId);
    if (!agenda || agenda.userId !== userId) return null;
    return agenda;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    forDate: v.string(),
    rosterId: v.optional(v.id("rosters")),
  },
  handler: async (ctx, { title, forDate, rosterId }) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db.insert("lessonAgendas", {
      userId,
      rosterId,
      title,
      forDate,
      blocks: "[]",
      markdownCache: "",
      taskMappings: [],
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateBlocks = mutation({
  args: {
    agendaId: v.id("lessonAgendas"),
    blocks: v.string(),
    markdownCache: v.optional(v.string()),
  },
  handler: async (ctx, { agendaId, blocks, markdownCache }) => {
    const { userId } = await requireAuth(ctx);
    const agenda = await ctx.db.get(agendaId);
    if (!agenda || agenda.userId !== userId) throw new Error("Agenda not found");
    await ctx.db.patch(agendaId, {
      blocks,
      markdownCache,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateMeta = mutation({
  args: {
    agendaId: v.id("lessonAgendas"),
    title: v.optional(v.string()),
    forDate: v.optional(v.string()),
    rosterId: v.optional(v.id("rosters")),
  },
  handler: async (ctx, { agendaId, ...patch }) => {
    const { userId } = await requireAuth(ctx);
    const agenda = await ctx.db.get(agendaId);
    if (!agenda || agenda.userId !== userId) throw new Error("Agenda not found");
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(agendaId, { ...cleaned, updatedAt: new Date().toISOString() });
  },
});

export const updateTaskMappings = mutation({
  args: {
    agendaId: v.id("lessonAgendas"),
    taskMappings: v.array(TaskMapping),
  },
  handler: async (ctx, { agendaId, taskMappings }) => {
    const { userId } = await requireAuth(ctx);
    const agenda = await ctx.db.get(agendaId);
    if (!agenda || agenda.userId !== userId) throw new Error("Agenda not found");
    await ctx.db.patch(agendaId, {
      taskMappings,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { agendaId: v.id("lessonAgendas") },
  handler: async (ctx, { agendaId }) => {
    const { userId } = await requireAuth(ctx);
    const agenda = await ctx.db.get(agendaId);
    if (!agenda || agenda.userId !== userId) throw new Error("Agenda not found");
    await ctx.db.delete(agendaId);
  },
});
