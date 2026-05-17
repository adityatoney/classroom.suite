"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Sparkles, X } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { compileNarrative, type Pronoun } from "@/lib/comment-engine";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { PronounSelect } from "./pronoun-select";
import { CommentSelector } from "./comment-selector";
import { Avatar } from "@/components/shared/avatar";

const SAVE_DEBOUNCE_MS = 600;

export function CommentGridRow({
  student,
  rosterId,
  subjectId,
  sessionLabel,
  bank,
  initial,
}: {
  student: Doc<"students">;
  rosterId: Id<"rosters">;
  subjectId: Id<"subjects">;
  sessionLabel: string;
  bank: Doc<"commentBank">[];
  initial?: Doc<"narratives">;
}) {
  const upsert = useMutation(api.narratives.upsert);
  const updateStudent = useMutation(api.students.update);

  const [selectedIds, setSelectedIds] = useState<Id<"commentBank">[]>(
    initial?.selectedCommentIds ?? []
  );
  const [manualOverride, setManualOverride] = useState<string | undefined>(
    initial?.manualOverride
  );

  // If the server-side narrative changes externally (e.g. another tab edits it),
  // pull the latest values in.
  useEffect(() => {
    setSelectedIds(initial?.selectedCommentIds ?? []);
    setManualOverride(initial?.manualOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?._id, initial?.lastEditedAt]);

  const selectedTexts = useMemo(
    () =>
      selectedIds
        .map((id) => bank.find((c) => c._id === id))
        .filter((c): c is Doc<"commentBank"> => Boolean(c))
        .map((c) => c.text),
    [selectedIds, bank]
  );

  const compiledText = useMemo(
    () =>
      compileNarrative({
        studentName: student.name,
        pronoun: student.pronoun as Pronoun,
        selectedComments: selectedTexts,
      }),
    [student.name, student.pronoun, selectedTexts]
  );

  const finalText =
    manualOverride !== undefined && manualOverride.trim() !== ""
      ? manualOverride
      : compiledText;

  // Debounced upsert to Convex
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Skip the very first effect call if nothing has actually changed
    if (
      selectedIds.length === 0 &&
      (manualOverride === undefined || manualOverride === "") &&
      !initial
    ) {
      return;
    }
    saveTimer.current = setTimeout(() => {
      upsert({
        rosterId,
        subjectId,
        studentId: student._id,
        sessionLabel,
        selectedCommentIds: selectedIds,
        compiledText,
        manualOverride: manualOverride && manualOverride.trim() !== "" ? manualOverride : undefined,
      }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, manualOverride, compiledText, sessionLabel, subjectId]);

  const isOverridden = manualOverride !== undefined && manualOverride.trim() !== "";

  return (
    <TableRow className="align-top">
      <TableCell className="w-48 py-3 align-top">
        <div className="flex items-center gap-2.5">
          <Avatar name={student.name} size="sm" />
          <p className="font-medium">{student.name}</p>
        </div>
      </TableCell>
      <TableCell className="w-32 py-3 align-top">
        <PronounSelect
          value={student.pronoun as Pronoun}
          onChange={(p) => updateStudent({ studentId: student._id, pronoun: p })}
        />
      </TableCell>
      <TableCell className="w-64 py-3 align-top">
        <CommentSelector bank={bank} selectedIds={selectedIds} onChange={setSelectedIds} />
      </TableCell>
      <TableCell className="py-3 align-top">
        <div className="space-y-1.5">
          <Textarea
            value={finalText}
            onChange={(e) => setManualOverride(e.target.value)}
            placeholder="Select comments to compile a narrative, or type one manually..."
            className="min-h-[5.5rem] text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span
                className={cn(
                  isOverridden ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {isOverridden ? "Manual override" : "Auto-compiled"}
              </span>
            </div>
            {isOverridden && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setManualOverride(undefined)}
                title="Discard manual edits and resume auto-compile"
              >
                <X />
                Clear override
              </Button>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
