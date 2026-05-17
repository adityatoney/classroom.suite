"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseRosterCsv, type RowError, type ValidRosterRow } from "@/lib/csv-parser";

export function RosterCsvUploader({ rosterId }: { rosterId: Id<"rosters"> }) {
  const bulkImport = useMutation(api.rosters.bulkImportFromCsv);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ValidRosterRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const result = await parseRosterCsv(file);
      setRows(result.rows);
      setErrors(result.errors);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse CSV");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const { imported } = await bulkImport({ rosterId, rows });
      toast.success(`Imported ${imported} student${imported === 1 ? "" : "s"}`);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRows([]);
    setErrors([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Upload />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
          <DialogDescription>
            Required columns: <code className="rounded bg-muted px-1 py-0.5">name</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">pronoun</code> (he, she, or they).
            Optional: <code className="rounded bg-muted px-1 py-0.5">notes</code>.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && errors.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input bg-card p-8 transition-colors hover:border-foreground/40">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Select a .csv file</span>
            <span className="text-xs text-muted-foreground">
              Or drag and drop into the picker below
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.length} row{errors.length === 1 ? "" : "s"} skipped
                </div>
                <ul className="space-y-1 text-xs text-destructive/80">
                  {errors.map((e) => (
                    <li key={e.index}>
                      Row {e.index}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rows.length > 0 && (
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Pronoun
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2 capitalize">{r.pronoun}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {(rows.length > 0 || errors.length > 0) && (
            <Button variant="outline" onClick={reset} disabled={busy}>
              Choose another file
            </Button>
          )}
          {rows.length > 0 && (
            <Button onClick={commit} disabled={busy}>
              {busy ? "Importing..." : `Import ${rows.length} student${rows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
