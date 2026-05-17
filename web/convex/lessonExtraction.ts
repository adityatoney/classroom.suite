import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

import { PRE_QUESTIONS, POST_QUESTIONS } from "./observationQuestions";

// The Convex backend container reaches the host's sidecar via
// `host.docker.internal`. Override with CS_SIDECAR_URL if needed.
const SIDECAR_URL = process.env.CS_SIDECAR_URL ?? "http://host.docker.internal:10811";

type ExtractResult = {
  status: "ok" | "failed";
  filledCount: number;
  errorMessage?: string;
};

function detectMediaType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  return "image/jpeg";
}

/** Base64 encode bytes in 32k chunks so we don't blow the V8 call stack. */
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 32 * 1024;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

/**
 * PHASE 1 — Pre-observation extraction. Sends the lesson plan screenshots
 * and any typed lesson plan text to the sidecar; receives Domain 1/2/3
 * answers. Post-observation questions are NOT touched. Merge: only-fill-empty.
 */
export const runPreObsExtraction = action({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }): Promise<ExtractResult> => {
    const authIdRaw = await getAuthUserId(ctx);
    if (!authIdRaw) throw new Error("Unauthenticated");

    const obs = await ctx.runQuery(internal.lessonObservations.internal_loadForExtraction, {
      observationId,
    });
    if (obs.userId !== (authIdRaw as string)) throw new Error("Forbidden");

    const hasScreenshots = obs.sourceScreenshotStorageIds.length > 0;
    const hasLessonText = !!obs.lessonPlanText && obs.lessonPlanText.trim() !== "";
    if (!hasScreenshots && !hasLessonText) {
      const msg = "Upload at least one screenshot or paste lesson plan text before extracting.";
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    // Pull screenshot bytes from Convex storage and base64-encode them.
    const screenshots: Array<{ mediaType: string; dataBase64: string }> = [];
    for (const sid of obs.sourceScreenshotStorageIds) {
      const blob = await ctx.storage.get(sid);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      screenshots.push({ mediaType: detectMediaType(bytes), dataBase64: toBase64(bytes) });
    }

    let answersJson: Record<string, string> = {};
    try {
      const res = await fetch(`${SIDECAR_URL}/api/extract-lesson`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          screenshots,
          questions: PRE_QUESTIONS,
          lessonPlanText: obs.lessonPlanText ?? undefined,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Sidecar ${res.status}: ${detail.slice(0, 600)}`);
      }
      const data = (await res.json()) as {
        status: "ok" | "failed";
        answers?: Record<string, string>;
        errorMessage?: string;
      };
      if (data.status !== "ok" || !data.answers) {
        throw new Error(data.errorMessage ?? "Sidecar returned no answers.");
      }
      answersJson = data.answers;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    // Normalize and persist (pre-only).
    const answers: Array<{ questionId: string; value: string }> = [];
    for (const q of PRE_QUESTIONS) {
      const v = answersJson[q.id];
      if (typeof v === "string" && v.trim() !== "") {
        answers.push({ questionId: q.id, value: v.trim() });
      }
    }
    await ctx.runMutation(internal.lessonObservations.internal_mergeAnswers, {
      observationId,
      answers,
      extractedAt: new Date().toISOString(),
    });

    return { status: "ok", filledCount: answers.length };
  },
});

type RefineResult = {
  status: "ok" | "failed";
  filledCount: number;
  errorMessage?: string;
};

async function callPostObsSidecar(
  preAnswers: Record<string, string>,
  lessonPlanText: string | undefined,
  existingPostObs: Record<string, string> | undefined
): Promise<Record<string, string>> {
  const res = await fetch(`${SIDECAR_URL}/api/generate-postobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      preAnswers,
      postQuestions: POST_QUESTIONS,
      lessonPlanText,
      existingPostObs,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sidecar ${res.status}: ${detail.slice(0, 600)}`);
  }
  const data = (await res.json()) as {
    status: "ok" | "failed";
    answers?: Record<string, string>;
    errorMessage?: string;
  };
  if (data.status !== "ok" || !data.answers) {
    throw new Error(data.errorMessage ?? "Sidecar returned no answers.");
  }
  return data.answers;
}

function preAnswersMap(answers: Array<{ questionId: string; value: string }>): Record<string, string> {
  const postIds = new Set(POST_QUESTIONS.map((q) => q.id));
  const out: Record<string, string> = {};
  for (const a of answers) {
    if (!postIds.has(a.questionId) && a.value.trim() !== "") out[a.questionId] = a.value;
  }
  return out;
}

/**
 * PHASE 2 — Pre-teaching DRAFT of the 9 post-observation answers, grounded in
 * the teacher's current pre-obs answers (whatever's in the DB right now,
 * including the teacher's manual edits). Merge: only-fill-empty (existing
 * post-obs edits are preserved).
 */
export const draftPostObs = action({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }): Promise<RefineResult> => {
    const authIdRaw = await getAuthUserId(ctx);
    if (!authIdRaw) throw new Error("Unauthenticated");

    const obs = await ctx.runQuery(internal.lessonObservations.internal_loadForExtraction, {
      observationId,
    });
    if (obs.userId !== (authIdRaw as string)) throw new Error("Forbidden");

    const preAnswers = preAnswersMap(obs.answers);
    if (Object.keys(preAnswers).length === 0) {
      const msg = "Fill in some Domain 1/2/3 answers before drafting post-observation.";
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    let answersJson: Record<string, string> = {};
    try {
      answersJson = await callPostObsSidecar(
        preAnswers,
        obs.lessonPlanText ?? undefined,
        undefined // no existing post-obs → fresh predictive drafts for all 9
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    // Only-fill-empty merge for post-obs questions.
    const incoming: Array<{ questionId: string; value: string }> = [];
    for (const q of POST_QUESTIONS) {
      const v = answersJson[q.id];
      if (typeof v === "string" && v.trim() !== "") {
        incoming.push({ questionId: q.id, value: v.trim() });
      }
    }
    await ctx.runMutation(internal.lessonObservations.internal_mergeAnswers, {
      observationId,
      answers: incoming,
      extractedAt: new Date().toISOString(),
    });

    return { status: "ok", filledCount: incoming.length };
  },
});

/**
 * PHASE 3 — Refine: polish the teacher's rough post-obs edits in place,
 * and write fresh predictive drafts for any cells still empty. Replace-all
 * merge — every post-obs cell ends up with content. Pre-obs untouched.
 */
export const refinePostObservation = action({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }): Promise<RefineResult> => {
    const authIdRaw = await getAuthUserId(ctx);
    if (!authIdRaw) throw new Error("Unauthenticated");

    const obs = await ctx.runQuery(internal.lessonObservations.internal_loadForExtraction, {
      observationId,
    });
    if (obs.userId !== (authIdRaw as string)) throw new Error("Forbidden");

    const preAnswers = preAnswersMap(obs.answers);
    if (Object.keys(preAnswers).length === 0) {
      const msg = "Fill in some Domain 1/2/3 answers before refining post-observation.";
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    // Package the teacher's current post-obs edits so the sidecar can polish
    // them in place. Empty cells stay empty in the map; the sidecar treats
    // those as "needs a fresh predictive draft".
    const existingPostObs: Record<string, string> = {};
    const postIds = new Set(POST_QUESTIONS.map((q) => q.id));
    for (const a of obs.answers) {
      if (postIds.has(a.questionId)) existingPostObs[a.questionId] = a.value;
    }

    let answersJson: Record<string, string> = {};
    try {
      answersJson = await callPostObsSidecar(
        preAnswers,
        obs.lessonPlanText ?? undefined,
        existingPostObs
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.lessonObservations.internal_recordExtractError, {
        observationId,
        error: msg,
      });
      return { status: "failed", filledCount: 0, errorMessage: msg };
    }

    // Replace-all merge for post-obs questions.
    const replacements: Array<{ questionId: string; value: string }> = [];
    for (const q of POST_QUESTIONS) {
      const v = answersJson[q.id];
      if (typeof v === "string" && v.trim() !== "") {
        replacements.push({ questionId: q.id, value: v.trim() });
      }
    }
    await ctx.runMutation(internal.lessonObservations.internal_replacePostObsAnswers, {
      observationId,
      replacements,
      refinedAt: new Date().toISOString(),
    });

    return { status: "ok", filledCount: replacements.length };
  },
});
