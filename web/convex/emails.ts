import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { getAuthUserId } from "@convex-dev/auth/server";

import { buildDigestHtml, buildDigestPlainText } from "./lib/emailHtml";

/**
 * Preview the digest. Returns the rendered HTML, a plain-text version, and
 * the underlying rows so the UI can render an iframe preview AND offer a
 * clipboard-copy fallback without going through Resend.
 */
export const buildPreview = query({
  args: {
    rosterId: v.id("rosters"),
    subjectId: v.id("subjects"),
    sessionLabel: v.string(),
  },
  handler: async (ctx, { rosterId, subjectId, sessionLabel }) => {
    const { userId } = await requireAuth(ctx);

    const students = await ctx.db
      .query("students")
      .withIndex("by_roster", (q) => q.eq("rosterId", rosterId))
      .collect();
    students.sort((a, b) => a.sortOrder - b.sortOrder);

    const narratives = await ctx.db
      .query("narratives")
      .withIndex("by_subject_session", (q) =>
        q.eq("subjectId", subjectId).eq("sessionLabel", sessionLabel)
      )
      .collect();
    const byStudent = new Map(
      narratives.filter((n) => n.userId === userId).map((n) => [n.studentId, n])
    );

    const rows = students
      .filter((s) => s.userId === userId)
      .map((s) => {
        const n = byStudent.get(s._id);
        const finalText = n
          ? n.manualOverride && n.manualOverride.trim() !== ""
            ? n.manualOverride
            : n.compiledText
          : "";
        return { studentName: s.name, finalText };
      })
      .filter((r) => r.finalText.trim().length > 0);

    const subject = await ctx.db.get(subjectId);
    const roster = await ctx.db.get(rosterId);
    const subjectLabel = subject && roster ? `${roster.name} ${subject.name}` : sessionLabel;
    const fullLabel = `${subjectLabel} · ${sessionLabel}`;

    const html = buildDigestHtml({ sessionLabel: fullLabel, rows });
    const plain = buildDigestPlainText({ sessionLabel: fullLabel, rows });
    return { html, plain, rows, rowCount: rows.length, subjectLabel };
  },
});

/**
 * List past dispatches (audit log).
 */
export const listDispatches = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("emailDispatches")
      .withIndex("by_user_sentAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

/**
 * Send the digest via Resend. Calls the Resend REST API directly via fetch
 * so the action stays inside Convex's V8 sandbox (no Node SDK shim needed).
 * The dispatch is always written to the audit log, even on failure.
 */
type DispatchResult = {
  status: "sent" | "failed";
  resendMessageId: string | undefined;
  errorMessage: string | undefined;
  studentCount: number;
};

export const dispatchDigestForSession = action({
  args: {
    rosterId: v.id("rosters"),
    subjectId: v.id("subjects"),
    sessionLabel: v.string(),
  },
  handler: async (ctx, { rosterId, subjectId, sessionLabel }): Promise<DispatchResult> => {
    const authIdRaw = await getAuthUserId(ctx);
    if (!authIdRaw) throw new Error("Unauthenticated");
    const authId = authIdRaw as string;

    const user = await ctx.runQuery(internal.users.getUserByAuthId, { authId });
    if (!user) throw new Error("Unauthorized");

    const to = user.digestToAddress ?? user.email;
    const from =
      user.digestFromAddress ?? "ClassroomSuite <onboarding@resend.dev>";

    if (!to) {
      throw new Error("No destination email — set one under Settings.");
    }

    const rows = await ctx.runQuery(internal.narratives.gatherForDigest, {
      userId: authId,
      rosterId,
      subjectId,
      sessionLabel,
    });
    if (rows.length === 0) {
      throw new Error("No narratives to send in this session.");
    }

    const html = buildDigestHtml({ sessionLabel, rows });
    const subject = `Narrative digest — ${sessionLabel}`;

    const resendKey = process.env.RESEND_API_KEY;
    let status: "sent" | "failed" = "sent";
    let resendMessageId: string | undefined;
    let errorMessage: string | undefined;

    if (!resendKey) {
      status = "failed";
      errorMessage = "RESEND_API_KEY not set in the Convex deployment environment.";
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to, subject, html }),
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

    await ctx.runMutation(internal.emails.recordDispatch, {
      userId: authId,
      sessionLabel,
      rosterId,
      toAddress: to,
      fromAddress: from,
      subject,
      htmlBody: html,
      studentCount: rows.length,
      resendMessageId,
      status,
      errorMessage,
      sentAt: new Date().toISOString(),
    });

    return { status, resendMessageId, errorMessage, studentCount: rows.length };
  },
});

export const recordDispatch = internalMutation({
  args: {
    userId: v.string(),
    sessionLabel: v.string(),
    rosterId: v.id("rosters"),
    toAddress: v.string(),
    fromAddress: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    studentCount: v.number(),
    resendMessageId: v.optional(v.string()),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    sentAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailDispatches", args);
  },
});
