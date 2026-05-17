import { internalMutation } from "./_generated/server";

/**
 * One-shot cleanup: delete every commentBank row that has no subjectId.
 * Use after migrating to subject-scoped banks if a previous owner-provisioning
 * step seeded "global" defaults that you no longer want.
 */
export const wipeUnscopedCommentBank = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("commentBank").collect();
    let deleted = 0;
    for (const c of all) {
      if (c.subjectId === undefined) {
        await ctx.db.delete(c._id);
        deleted++;
      }
    }
    return { deleted, kept: all.length - deleted };
  },
});

/**
 * One-shot cleanup: delete every lessonObservations row. Use before deploying
 * the schema migration that replaces the hardcoded domain* fields with
 * `answers: Array<{questionId, value}>`. Also deletes any screenshot storage
 * objects the observation references.
 */
export const purgeLessonObservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("lessonObservations").collect();
    let storageDeleted = 0;
    for (const o of all) {
      for (const sid of o.sourceScreenshotStorageIds ?? []) {
        try {
          await ctx.storage.delete(sid);
          storageDeleted++;
        } catch {
          /* ignore */
        }
      }
      await ctx.db.delete(o._id);
    }
    return { observationsDeleted: all.length, storageDeleted };
  },
});
