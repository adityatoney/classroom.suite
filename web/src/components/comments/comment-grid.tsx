"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Users, BookOpenText, BookText } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { CommentGridRow } from "./comment-grid-row";
import { CommentBankManager } from "./comment-bank-manager";

const SESSION_KEY = "cs.commentSession";
const ROSTER_KEY = "cs.commentRosterId";
const SUBJECT_KEY = "cs.commentSubjectId";

export function CommentGrid() {
  const rosters = useQuery(api.rosters.list, {});

  const [rosterId, setRosterId] = useState<Id<"rosters"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return (window.localStorage.getItem(ROSTER_KEY) as Id<"rosters">) || undefined;
  });
  const [subjectId, setSubjectId] = useState<Id<"subjects"> | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return (window.localStorage.getItem(SUBJECT_KEY) as Id<"subjects">) || undefined;
  });
  const [sessionLabel, setSessionLabel] = useState<string>(() => {
    if (typeof window === "undefined") return defaultSessionLabel();
    return window.localStorage.getItem(SESSION_KEY) ?? defaultSessionLabel();
  });

  const subjects = useQuery(
    api.subjects.listByRoster,
    rosterId ? { rosterId } : "skip"
  );
  const students = useQuery(
    api.students.listByRoster,
    rosterId ? { rosterId } : "skip"
  );
  const bank = useQuery(
    api.commentBank.list,
    subjectId ? { subjectId } : "skip"
  );
  const narratives = useQuery(
    api.narratives.listForSession,
    rosterId && subjectId ? { rosterId, subjectId, sessionLabel } : "skip"
  );

  // Default roster: first available
  useEffect(() => {
    if (rosters && rosters.length > 0) {
      const valid = rosters.some((r) => r._id === rosterId);
      if (!valid) setRosterId(rosters[0]._id);
    }
  }, [rosters, rosterId]);

  // Default subject: first under current roster
  useEffect(() => {
    if (subjects && subjects.length > 0) {
      const valid = subjects.some((s) => s._id === subjectId);
      if (!valid) setSubjectId(subjects[0]._id);
    } else if (subjects && subjects.length === 0) {
      setSubjectId(undefined);
    }
  }, [subjects, subjectId]);

  // Persist selections
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rosterId) window.localStorage.setItem(ROSTER_KEY, rosterId);
  }, [rosterId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (subjectId) window.localStorage.setItem(SUBJECT_KEY, subjectId);
  }, [subjectId]);

  const narrativesByStudent = useMemo(() => {
    const map = new Map<string, NonNullable<typeof narratives>[number]>();
    if (narratives) for (const n of narratives) map.set(n.studentId, n);
    return map;
  }, [narratives]);

  const onSessionChange = (next: string) => {
    setSessionLabel(next);
    if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, next);
  };

  if (rosters === undefined) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }
  if (rosters.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="No rosters yet"
        description="Create a roster, or import one from a spreadsheet, to start writing comments."
        action={
          <div className="flex gap-2">
            <Link href="/import">
              <Button size="sm">Bulk import</Button>
            </Link>
            <Link href="/roster">
              <Button size="sm" variant="outline">Manage rosters</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Roster</Label>
          <Select
            value={rosterId}
            onValueChange={(v) => v && setRosterId(v as Id<"rosters">)}
          >
            <SelectTrigger className="min-w-44">
              <SelectValue>
                {(value: string) =>
                  rosters.find((r) => r._id === value)?.name ?? "Pick roster"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rosters.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Select
            value={subjectId ?? ""}
            onValueChange={(v) => v && setSubjectId(v as Id<"subjects">)}
          >
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Pick subject">
                {(value: string) =>
                  subjects?.find((s) => s._id === value)?.name ?? "Pick subject"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="session" className="text-xs">
            Session label
          </Label>
          <Input
            id="session"
            placeholder="e.g. Q2 2026 Progress"
            value={sessionLabel}
            onChange={(e) => onSessionChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <CommentBankManager subjectId={subjectId} />
      </div>

      {/* Grid */}
      {subjects === undefined ? (
        <div className="text-sm text-muted-foreground">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<BookText className="h-6 w-6" />}
          title="This roster has no subjects"
          description="Import a workbook to add subject-scoped comment banks, or add subjects manually."
          action={
            <Link href="/import">
              <Button size="sm">Bulk import</Button>
            </Link>
          }
        />
      ) : students === undefined || bank === undefined ? (
        <div className="text-sm text-muted-foreground">Loading students...</div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="This roster has no students"
          description="Add students to this roster before writing comments."
          action={
            rosterId ? (
              <Link href={`/roster/${rosterId}`}>
                <Button size="sm">Open roster</Button>
              </Link>
            ) : null
          }
        />
      ) : bank.length === 0 ? (
        <EmptyState
          icon={<BookOpenText className="h-6 w-6" />}
          title="Comment bank is empty for this subject"
          description="Open the bank manager to add templates, or re-import the workbook."
        />
      ) : rosterId && subjectId ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Pronoun</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Narrative</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <CommentGridRow
                  key={s._id}
                  student={s}
                  rosterId={rosterId}
                  subjectId={subjectId}
                  sessionLabel={sessionLabel}
                  bank={bank}
                  initial={narrativesByStudent.get(s._id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

function defaultSessionLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const trimester = month <= 4 ? "T1" : month <= 8 ? "T2" : "T3";
  return `${trimester} ${now.getFullYear()}`;
}
