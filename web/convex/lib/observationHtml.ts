/**
 * Inline-styled HTML for emailing a completed observation form. Mirrors the
 * CHA Faculty Observation Form 2026 layout: header block with metadata, then
 * one section per Domain (Domain 1/2/3 + Post-Observation Reflection), then
 * lesson screenshots inline at the bottom.
 *
 * Pure TS — no Convex APIs. Lives inside `convex/lib/` so the bundler doesn't
 * have to reach outside the boundary.
 */

import type { ObservationQuestion } from "../observationQuestions";

export interface ObservationMeta {
  title: string;
  educatorName?: string;
  gradeLevel?: string;
  subject?: string;
  observerNames?: string;
  observationDate: string;
}

export interface ScreenshotInline {
  mediaType: string;
  dataBase64: string;
}

export interface ObservationHtmlInput {
  meta: ObservationMeta;
  questions: readonly ObservationQuestion[];
  answersById: Record<string, string>;
  screenshots: ScreenshotInline[];
  generatedAt?: Date;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metaRow(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:4px 12px 4px 0;font-family:${FONT};font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:#111827;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildObservationHtml(input: ObservationHtmlInput): string {
  const { meta, questions, answersById, screenshots } = input;
  const ts = (input.generatedAt ?? new Date()).toLocaleString();

  // Group questions by section in original order.
  const sectionOrder: string[] = [];
  const grouped = new Map<string, ObservationQuestion[]>();
  for (const q of questions) {
    if (!grouped.has(q.section)) {
      grouped.set(q.section, []);
      sectionOrder.push(q.section);
    }
    grouped.get(q.section)!.push(q);
  }

  const sectionHtml = sectionOrder
    .map((section) => {
      const qs = grouped.get(section)!;
      const isPost = qs[0].phase === "post";
      const headerColor = isPost ? "#7c3aed" : "#1d4ed8";
      const qsHtml = qs
        .map((q) => {
          const v = (answersById[q.id] ?? "").trim();
          const value = v ? escapeHtml(v) : '<span style="color:#9ca3af;font-style:italic;">No answer yet</span>';
          return `<div style="margin:0 0 14px;">
            <div style="font-family:${FONT};font-size:13px;font-weight:600;color:#111827;line-height:1.4;">${escapeHtml(q.label)}</div>
            ${q.hint ? `<div style="margin-top:2px;font-family:${FONT};font-size:11px;color:#6b7280;">${escapeHtml(q.hint)}</div>` : ""}
            <div style="margin-top:6px;font-family:${FONT};font-size:14px;color:#111827;line-height:1.6;white-space:pre-wrap;">${value}</div>
          </div>`;
        })
        .join("");
      return `<tr><td style="padding:20px 24px 6px;">
        <h2 style="margin:0;font-family:${FONT};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${headerColor};">${escapeHtml(section)}</h2>
      </td></tr>
      <tr><td style="padding:8px 24px 16px;border-bottom:1px solid #e5e7eb;">${qsHtml}</td></tr>`;
    })
    .join("");

  const screenshotsHtml = screenshots.length === 0
    ? ""
    : `<tr><td style="padding:20px 24px 6px;">
        <h2 style="margin:0;font-family:${FONT};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">Lesson Screenshots (${screenshots.length})</h2>
      </td></tr>
      <tr><td style="padding:8px 24px 24px;">
        ${screenshots
          .map(
            (s) =>
              `<img src="data:${s.mediaType};base64,${s.dataBase64}" alt="" style="display:block;max-width:100%;height:auto;margin:0 0 12px;border:1px solid #e5e7eb;border-radius:8px;" />`
          )
          .join("")}
      </td></tr>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f9fafb;font-family:${FONT};">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:780px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
    <tr><td style="padding:24px 24px 8px;">
      <h1 style="margin:0;font-family:${FONT};font-size:20px;font-weight:700;color:#111827;">CHA Faculty Observation Form</h1>
      <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:#6b7280;">${escapeHtml(meta.title)}</p>
    </td></tr>
    <tr><td style="padding:12px 24px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${metaRow("Educator", meta.educatorName)}
        ${metaRow("Grade", meta.gradeLevel)}
        ${metaRow("Subject", meta.subject)}
        ${metaRow("Observer(s)", meta.observerNames)}
        ${metaRow("Date", meta.observationDate)}
      </table>
    </td></tr>
    ${sectionHtml}
    ${screenshotsHtml}
    <tr><td style="padding:16px 24px;background:#f3f4f6;border-top:1px solid #e5e7eb;font-family:${FONT};font-size:11px;color:#6b7280;">
      Generated ${escapeHtml(ts)} by ClassroomSuite.
    </td></tr>
  </table>
</body></html>`;
}

export function buildObservationPlainText(input: ObservationHtmlInput): string {
  const { meta, questions, answersById } = input;
  const lines: string[] = [];
  lines.push(`CHA Faculty Observation Form — ${meta.title}`);
  if (meta.educatorName) lines.push(`Educator: ${meta.educatorName}`);
  if (meta.gradeLevel) lines.push(`Grade: ${meta.gradeLevel}`);
  if (meta.subject) lines.push(`Subject: ${meta.subject}`);
  if (meta.observerNames) lines.push(`Observer(s): ${meta.observerNames}`);
  lines.push(`Date: ${meta.observationDate}`);
  lines.push("");

  let lastSection = "";
  for (const q of questions) {
    if (q.section !== lastSection) {
      lines.push("");
      lines.push(`== ${q.section} ==`);
      lastSection = q.section;
    }
    lines.push("");
    lines.push(`Q: ${q.label}`);
    const v = (answersById[q.id] ?? "").trim();
    lines.push(v || "(no answer)");
  }
  return lines.join("\n");
}
