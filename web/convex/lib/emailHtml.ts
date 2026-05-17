/**
 * Inline-styled HTML digest template. Lives inside convex/ so the bundler
 * does not have to reach across the workspace boundary. Pure TS — no Convex
 * APIs — safe to import from the React side too if needed.
 */
export interface DigestRow {
  studentName: string;
  finalText: string;
}

export interface DigestInput {
  sessionLabel: string;
  rows: DigestRow[];
  generatedAt?: Date;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function buildDigestHtml({ sessionLabel, rows, generatedAt }: DigestInput): string {
  const ts = (generatedAt ?? new Date()).toLocaleString();

  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:${FONT};font-size:14px;color:#111827;font-weight:600;white-space:nowrap;">${escapeHtml(r.studentName)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:${FONT};font-size:14px;color:#111827;line-height:1.55;">${escapeHtml(r.finalText)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f9fafb;font-family:${FONT};">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
    <tr><td style="padding:24px 24px 8px;">
      <h1 style="margin:0;font-size:18px;color:#111827;font-weight:600;font-family:${FONT};">Narrative digest — ${escapeHtml(sessionLabel)}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#6b7280;font-family:${FONT};">${rows.length} student${rows.length === 1 ? "" : "s"} · generated ${escapeHtml(ts)}</p>
    </td></tr>
    <tr><td>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 16px;background:#f3f4f6;font-size:12px;color:#374151;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e5e7eb;font-family:${FONT};">Student</th>
            <th style="text-align:left;padding:10px 16px;background:#f3f4f6;font-size:12px;color:#374151;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e5e7eb;font-family:${FONT};">Narrative</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildDigestPlainText({ sessionLabel, rows }: DigestInput): string {
  const lines = [`Narrative digest — ${sessionLabel}`, ""];
  for (const r of rows) {
    lines.push(r.studentName);
    lines.push(r.finalText);
    lines.push("");
  }
  return lines.join("\n");
}
