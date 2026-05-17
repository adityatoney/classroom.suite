import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const PRONOUN = v.union(v.literal("he"), v.literal("she"), v.literal("they"));

/**
 * Replace-existing bulk import.
 * For each roster in the payload:
 *   - if a roster with the same name exists, wipe its subjects + students +
 *     bank entries + narratives, then re-create from the payload
 *   - otherwise create new
 */
export const bulkImport = mutation({
  args: {
    rosters: v.array(
      v.object({
        name: v.string(),
        students: v.array(
          v.object({
            name: v.string(),
            pronoun: PRONOUN,
            notes: v.optional(v.string()),
          })
        ),
        subjects: v.array(
          v.object({
            name: v.string(),
            comments: v.array(
              v.object({
                id: v.number(),
                text: v.string(),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { rosters }) => {
    const { userId } = await requireAuth(ctx);

    type Summary = {
      roster: string;
      created: boolean;
      students: number;
      subjects: Array<{ name: string; comments: number }>;
    };
    const summary: Summary[] = [];

    const existingRosters = await ctx.db
      .query("rosters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byName = new Map(existingRosters.map((r) => [r.name, r]));

    for (const incoming of rosters) {
      const trimmedName = incoming.name.trim();
      let rosterDoc = byName.get(trimmedName);
      const created = !rosterDoc;

      if (rosterDoc) {
        // Wipe subjects (cascade banks + narratives) and students
        const subjects = await ctx.db
          .query("subjects")
          .withIndex("by_roster", (q) => q.eq("rosterId", rosterDoc!._id))
          .collect();
        for (const s of subjects) {
          const banks = await ctx.db
            .query("commentBank")
            .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
            .collect();
          for (const b of banks) await ctx.db.delete(b._id);
          const narratives = await ctx.db
            .query("narratives")
            .withIndex("by_subject_session", (q) => q.eq("subjectId", s._id))
            .collect();
          for (const n of narratives) await ctx.db.delete(n._id);
          await ctx.db.delete(s._id);
        }
        const students = await ctx.db
          .query("students")
          .withIndex("by_roster", (q) => q.eq("rosterId", rosterDoc!._id))
          .collect();
        for (const s of students) await ctx.db.delete(s._id);
      } else {
        const rid = await ctx.db.insert("rosters", {
          userId,
          name: trimmedName,
          archived: false,
        });
        rosterDoc = (await ctx.db.get(rid))!;
      }

      // Re-create students in payload order
      for (let i = 0; i < incoming.students.length; i++) {
        const s = incoming.students[i];
        await ctx.db.insert("students", {
          userId,
          rosterId: rosterDoc._id,
          name: s.name.trim(),
          pronoun: s.pronoun,
          notes: s.notes?.trim() || undefined,
          sortOrder: i,
        });
      }

      // Re-create subjects + their comment banks
      const subjSummary: Array<{ name: string; comments: number }> = [];
      for (let i = 0; i < incoming.subjects.length; i++) {
        const sub = incoming.subjects[i];
        const subjectId = await ctx.db.insert("subjects", {
          userId,
          rosterId: rosterDoc._id,
          name: sub.name.trim(),
          sortOrder: i,
        });
        let kept = 0;
        for (const comment of sub.comments) {
          const trimmed = comment.text.trim();
          if (trimmed === "") continue;
          await ctx.db.insert("commentBank", {
            userId,
            subjectId,
            importedId: comment.id,
            text: trimmed,
            tags: [],
            isFavorite: false,
            usageCount: 0,
          });
          kept++;
        }
        subjSummary.push({ name: sub.name.trim(), comments: kept });
      }

      summary.push({
        roster: trimmedName,
        created,
        students: incoming.students.length,
        subjects: subjSummary,
      });
    }

    return { summary };
  },
});
