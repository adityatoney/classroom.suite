import Papa from "papaparse";
import { z } from "zod";

export const ROSTER_PRONOUNS = ["he", "she", "they"] as const;
export type RosterPronoun = (typeof ROSTER_PRONOUNS)[number];

export const RosterRowSchema = z
  .object({
    name: z.string().min(1, "name is required").max(120),
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

export type ValidRosterRow = z.infer<typeof RosterRowSchema>;

export type RowError = {
  index: number;
  row: Record<string, unknown>;
  message: string;
};

export interface ParseRosterResult {
  rows: ValidRosterRow[];
  errors: RowError[];
}

/**
 * Parse a roster CSV in the browser using Papaparse. Required headers:
 * "name", "pronoun" (he/she/they; case-insensitive). Optional: "notes".
 * Header matching is case-insensitive and underscore-insensitive.
 */
export async function parseRosterCsv(file: File): Promise<ParseRosterResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/_/g, "").replace(/\s+/g, ""),
      complete: (result) => {
        const rows: ValidRosterRow[] = [];
        const errors: RowError[] = [];
        result.data.forEach((raw, idx) => {
          const parsed = RosterRowSchema.safeParse(raw);
          if (parsed.success) {
            rows.push(parsed.data);
          } else {
            errors.push({
              index: idx + 2, // +1 for 1-indexed, +1 for the header row
              row: raw,
              message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
          }
        });
        resolve({ rows, errors });
      },
      error: (err) => reject(err),
    });
  });
}
