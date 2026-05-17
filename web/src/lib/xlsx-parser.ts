import { read, utils } from "xlsx";
import { z } from "zod";

import { ROSTER_PRONOUNS, type RosterPronoun } from "./csv-parser";

export interface ParsedStudent {
  name: string;
  pronoun: RosterPronoun;
  notes?: string;
}

export interface ParsedComment {
  /** Source-of-truth ordering. Falls back to row index when absent. */
  id: number;
  text: string;
}

export interface ParsedSubject {
  name: string;
  comments: ParsedComment[];
}

export interface ParsedRoster {
  name: string;
  students: ParsedStudent[];
  subjects: ParsedSubject[];
}

export interface ParseRowError {
  sheet: string;
  index: number;
  message: string;
  preview?: string;
}

export interface ParseSheetWarning {
  sheet: string;
  message: string;
}

export interface ParseWorkbookResult {
  rosters: ParsedRoster[];
  errors: ParseRowError[];
  warnings: ParseSheetWarning[];
}

const StudentRowSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    pronoun: z
      .string()
      .transform((v) => v.trim().toLowerCase())
      .pipe(z.enum(ROSTER_PRONOUNS)),
    notes: z.string().optional(),
  })
  .transform((row) => ({
    name: row.name.trim(),
    pronoun: row.pronoun as RosterPronoun,
    notes: row.notes?.trim() || undefined,
  }));

const CommentRowSchema = z
  .object({
    id: z
      .string()
      .optional()
      .transform((s) => (s === undefined ? undefined : Number(s)))
      .refine((n) => n === undefined || (Number.isFinite(n) && n >= 0), {
        message: "id must be a non-negative number",
      }),
    text: z.string().min(1, "comment text is required"),
  })
  .transform((row) => ({ id: row.id, text: row.text.trim() }));

const ROSTER_SUFFIX_RE = /^(.+?)\s+Student\s+Roster\s*$/i;
const BANK_SUFFIX_RE = /^(.+)\s+([A-Za-z][A-Za-z\d]*)\s+Bank\s*$/i;

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_]+/g, "");
}

function pluckRow<T extends Record<string, unknown>>(
  raw: Record<string, unknown>,
  aliases: Record<string, string[]>
): T {
  const out: Record<string, unknown> = {};
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeKey(k)] = v;
  }
  for (const [field, options] of Object.entries(aliases)) {
    for (const opt of options) {
      const v = normalized[normalizeKey(opt)];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        out[field] = String(v);
        break;
      }
    }
  }
  return out as T;
}

export async function parseRosterWorkbook(file: File): Promise<ParseWorkbookResult> {
  const buf = await file.arrayBuffer();
  const wb = read(buf, { type: "array" });

  const rosterMap = new Map<string, ParsedRoster>();
  const errors: ParseRowError[] = [];
  const warnings: ParseSheetWarning[] = [];

  const ensureRoster = (name: string): ParsedRoster => {
    const key = name.trim();
    if (!rosterMap.has(key)) {
      rosterMap.set(key, { name: key, students: [], subjects: [] });
    }
    return rosterMap.get(key)!;
  };

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const rosterMatch = sheetName.match(ROSTER_SUFFIX_RE);
    const bankMatch = sheetName.match(BANK_SUFFIX_RE);

    if (rosterMatch) {
      const rosterName = rosterMatch[1].trim();
      const roster = ensureRoster(rosterName);
      rows.forEach((raw, idx) => {
        const picked = pluckRow(raw, {
          name: ["name", "student name", "student"],
          pronoun: ["pronoun", "pronouns"],
          notes: ["notes", "note", "comments"],
        });
        const parsed = StudentRowSchema.safeParse(picked);
        if (parsed.success) {
          roster.students.push(parsed.data);
        } else {
          errors.push({
            sheet: sheetName,
            index: idx + 2, // +1 for 1-indexed, +1 for header
            message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            preview: JSON.stringify(raw).slice(0, 120),
          });
        }
      });
      continue;
    }

    if (bankMatch) {
      const rosterName = bankMatch[1].trim();
      const subjectName = bankMatch[2].trim();
      const roster = ensureRoster(rosterName);
      let subject = roster.subjects.find((s) => s.name === subjectName);
      if (!subject) {
        subject = { name: subjectName, comments: [] };
        roster.subjects.push(subject);
      }
      rows.forEach((raw, idx) => {
        const picked = pluckRow(raw, {
          id: ["id", "#", "no", "number"],
          text: ["comment text", "text", "comment", "narrative", "template"],
        });
        const parsed = CommentRowSchema.safeParse(picked);
        if (parsed.success) {
          subject!.comments.push({
            id: parsed.data.id ?? subject!.comments.length + 1,
            text: parsed.data.text,
          });
        } else {
          errors.push({
            sheet: sheetName,
            index: idx + 2,
            message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            preview: JSON.stringify(raw).slice(0, 120),
          });
        }
      });
      // After all rows are collected, sort by id so the source spreadsheet
      // order survives any rearrangement at the XLSX layer.
      subject.comments.sort((a, b) => a.id - b.id);
      continue;
    }

    warnings.push({
      sheet: sheetName,
      message: 'Sheet name doesn\'t match "<Grade> Student Roster" or "<Grade> <Subject> Bank" — skipped.',
    });
  }

  return {
    rosters: Array.from(rosterMap.values()),
    errors,
    warnings,
  };
}
