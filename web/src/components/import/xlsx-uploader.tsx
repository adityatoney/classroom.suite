"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { FileSpreadsheet, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseRosterWorkbook, type ParseWorkbookResult } from "@/lib/xlsx-parser";

export function XlsxUploader() {
  const bulkImport = useMutation(api.imports.bulkImport);
  const [parsed, setParsed] = useState<ParseWorkbookResult | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    setFilename(file.name);
    try {
      const result = await parseRosterWorkbook(file);
      setParsed(result);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} have errors; review before importing.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setFilename(null);
  };

  const commit = async () => {
    if (!parsed) return;
    if (parsed.rosters.length === 0) {
      toast.error("No recognizable rosters in the workbook.");
      return;
    }
    setBusy(true);
    try {
      const payload = parsed.rosters.map((r) => ({
        name: r.name,
        students: r.students,
        subjects: r.subjects.map((s) => ({
          name: s.name,
          comments: s.comments.map((c) => ({ id: c.id, text: c.text })),
        })),
      }));
      const result = await bulkImport({ rosters: payload });
      const totalStudents = result.summary.reduce((acc, r) => acc + r.students, 0);
      const totalSubjects = result.summary.reduce((acc, r) => acc + r.subjects.length, 0);
      const totalComments = result.summary.reduce(
        (acc, r) => acc + r.subjects.reduce((a, s) => a + s.comments, 0),
        0
      );
      toast.success(
        `Imported ${result.summary.length} roster${result.summary.length === 1 ? "" : "s"}, ${totalStudents} students, ${totalSubjects} subjects, ${totalComments} comments.`
      );
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import");
    } finally {
      setBusy(false);
    }
  };

  if (!parsed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk import</CardTitle>
          <CardDescription>
            Upload a .xlsx workbook. Tabs are recognized by name:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">&lt;Grade&gt; Student Roster</code> for
            students,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">&lt;Grade&gt; &lt;Subject&gt; Bank</code>{" "}
            for comment templates. Re-import replaces existing rosters with the same name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input p-8 transition-colors hover:border-foreground/40">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">{busy ? "Parsing..." : "Select a .xlsx file"}</span>
            <span className="text-xs text-muted-foreground">
              Roster tab columns: name, pronoun, notes. Bank tab columns: id (ignored), comment text.
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & confirm</CardTitle>
        <CardDescription>
          {filename} · {parsed.rosters.length} roster{parsed.rosters.length === 1 ? "" : "s"} recognized
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsed.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              {parsed.warnings.length} sheet{parsed.warnings.length === 1 ? "" : "s"} skipped
            </div>
            <ul className="space-y-1 text-xs">
              {parsed.warnings.map((w, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="font-mono">{w.sheet}</span> — {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {parsed.errors.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {parsed.errors.length} row{parsed.errors.length === 1 ? "" : "s"} will be skipped
            </div>
            <ul className="space-y-1 text-xs text-destructive/80">
              {parsed.errors.slice(0, 12).map((e, i) => (
                <li key={i}>
                  <span className="font-mono">{e.sheet}</span> row {e.index}: {e.message}
                </li>
              ))}
              {parsed.errors.length > 12 && (
                <li className="text-muted-foreground">…and {parsed.errors.length - 12} more.</li>
              )}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          {parsed.rosters.map((r) => (
            <div key={r.name} className="rounded-md border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.name}</p>
                <Badge variant="secondary">{r.students.length} students</Badge>
              </div>
              {r.subjects.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {r.subjects.map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.comments.length} comment{s.comments.length === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No subject banks found for this grade.</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <div className="flex items-center justify-end gap-2 border-t bg-muted/50 p-3">
        <Button variant="outline" size="sm" onClick={reset} disabled={busy}>
          <RefreshCw />
          Choose another file
        </Button>
        <Button size="sm" onClick={commit} disabled={busy || parsed.rosters.length === 0}>
          <Upload />
          {busy ? "Importing..." : "Import (replace existing)"}
        </Button>
      </div>
    </Card>
  );
}
