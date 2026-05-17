import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth } from "./lib/auth";

import { OBSERVATION_QUESTIONS } from "./observationQuestions";
import {
  buildObservationHtml,
  buildObservationPlainText,
  type ScreenshotInline,
} from "./lib/observationHtml";

function detectMediaType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  return "image/jpeg";
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 32 * 1024;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

/** Build a live preview of the observation HTML for the UI iframe. */
export const buildPreview = query({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const { userId } = await requireAuth(ctx);
    const obs = await ctx.db.get(observationId);
    if (!obs || obs.userId !== userId) return null;

    const answersById: Record<string, string> = {};
    for (const a of obs.answers) answersById[a.questionId] = a.value;

    // Preview skips inline screenshots to keep the iframe fast; the email
    // path embeds them. Caller (the UI) can still show them separately.
    const html = buildObservationHtml({
      meta: {
        title: obs.title,
        educatorName: obs.educatorName,
        gradeLevel: obs.gradeLevel,
        subject: obs.subject,
        observerNames: obs.observerNames,
        observationDate: obs.observationDate,
      },
      questions: OBSERVATION_QUESTIONS,
      answersById,
      screenshots: [],
    });
    return { html, screenshotCount: obs.sourceScreenshotStorageIds.length };
  },
});

type SendResult = {
  status: "sent" | "failed";
  resendMessageId?: string;
  errorMessage?: string;
};

/**
 * Email the full observation form (HTML + inline screenshots) to the
 * recipient stored on the observation (`observerEmail`).
 */
export const sendObservationToObserver = action({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }): Promise<SendResult> => {
    const authIdRaw = await getAuthUserId(ctx);
    if (!authIdRaw) throw new Error("Unauthenticated");
    const authId = authIdRaw as string;

    const obs = await ctx.runQuery(internal.observationEmails.internal_loadForSend, {
      observationId,
    });
    if (obs.userId !== authId) throw new Error("Forbidden");
    if (!obs.observerEmail || obs.observerEmail.trim() === "") {
      throw new Error("Set an observer email on this observation before sending.");
    }

    const user = await ctx.runQuery(internal.users.getUserByAuthId, { authId });
    if (!user) throw new Error("Unauthorized");
    const from = user.digestFromAddress ?? "ClassroomSuite <onboarding@resend.dev>";

    // Inline each screenshot as a base64 data URL.
    const screenshots: ScreenshotInline[] = [];
    for (const sid of obs.sourceScreenshotStorageIds) {
      const blob = await ctx.storage.get(sid);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      screenshots.push({ mediaType: detectMediaType(bytes), dataBase64: toBase64(bytes) });
    }

    const answersById: Record<string, string> = {};
    for (const a of obs.answers) answersById[a.questionId] = a.value;

    const html = buildObservationHtml({
      meta: {
        title: obs.title,
        educatorName: obs.educatorName,
        gradeLevel: obs.gradeLevel,
        subject: obs.subject,
        observerNames: obs.observerNames,
        observationDate: obs.observationDate,
      },
      questions: OBSERVATION_QUESTIONS,
      answersById,
      screenshots,
    });
    const plain = buildObservationPlainText({
      meta: {
        title: obs.title,
        educatorName: obs.educatorName,
        gradeLevel: obs.gradeLevel,
        subject: obs.subject,
        observerNames: obs.observerNames,
        observationDate: obs.observationDate,
      },
      questions: OBSERVATION_QUESTIONS,
      answersById,
      screenshots: [],
    });
    const subject = `Observation form — ${obs.title}`;

    const resendKey = process.env.RESEND_API_KEY;
    let status: "sent" | "failed" = "sent";
    let resendMessageId: string | undefined;
    let errorMessage: string | undefined;

    if (!resendKey) {
      status = "failed";
      errorMessage = "RESEND_API_KEY not set on the Convex deployment.";
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: obs.observerEmail,
            subject,
            html,
            text: plain,
          }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`Resend ${res.status}: ${detail}`);
        }
        const data = (await res.json()) as { id?: string };
        resendMessageId = data.id;
      } catch (e) {
        status = "failed";
        errorMessage = e instanceof Error ? e.message : String(e);
      }
    }

    await ctx.runMutation(internal.observationEmails.internal_recordDispatch, {
      userId: authId,
      observationId,
      toAddress: obs.observerEmail,
      fromAddress: from,
      subject,
      htmlBody: html,
      resendMessageId,
      status,
      errorMessage,
      sentAt: new Date().toISOString(),
    });

    return { status, resendMessageId, errorMessage };
  },
});

export const internal_loadForSend = internalQuery({
  args: { observationId: v.id("lessonObservations") },
  handler: async (ctx, { observationId }) => {
    const obs = await ctx.db.get(observationId);
    if (!obs) throw new Error("Observation not found");
    return obs;
  },
});

/**
 * Re-uses the existing emailDispatches table — it doesn't have observationId,
 * so we tuck it into the sessionLabel field as `obs:<id>` for retrievability.
 * Cheap retrofit; if observation dispatches grow large we'd split this out
 * into a dedicated table.
 */
export const internal_recordDispatch = internalMutation({
  args: {
    userId: v.string(),
    observationId: v.id("lessonObservations"),
    toAddress: v.string(),
    fromAddress: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    resendMessageId: v.optional(v.string()),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    sentAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailDispatches", {
      userId: args.userId,
      sessionLabel: `obs:${args.observationId}`,
      toAddress: args.toAddress,
      fromAddress: args.fromAddress,
      subject: args.subject,
      htmlBody: args.htmlBody,
      studentCount: 0, // not applicable for observation emails
      resendMessageId: args.resendMessageId,
      status: args.status,
      errorMessage: args.errorMessage,
      sentAt: args.sentAt,
    });
  },
});
