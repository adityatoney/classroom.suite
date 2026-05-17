"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Mail, Users } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { DigestPreview } from "@/components/email/digest-preview";
import { ClipboardCopy } from "@/components/email/clipboard-copy";
import { DispatchButton } from "@/components/email/dispatch-button";
import { DispatchHistory } from "@/components/email/dispatch-history";

const SESSION_KEY = "cs.commentSession";
const ROSTER_KEY = "cs.commentRosterId";
const SUBJECT_KEY = "cs.commentSubjectId";

export default function EmailPage() {
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
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(SESSION_KEY) ?? "";
  });

  const subjects = useQuery(
    api.subjects.listByRoster,
    rosterId ? { rosterId } : "skip"
  );

  useEffect(() => {
    if (rosters && rosters.length > 0 && !rosters.some((r) => r._id === rosterId)) {
      setRosterId(rosters[0]._id);
    }
  }, [rosters, rosterId]);

  useEffect(() => {
    if (subjects && subjects.length > 0 && !subjects.some((s) => s._id === subjectId)) {
      setSubjectId(subjects[0]._id);
    } else if (subjects && subjects.length === 0) {
      setSubjectId(undefined);
    }
  }, [subjects, subjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rosterId) window.localStorage.setItem(ROSTER_KEY, rosterId);
  }, [rosterId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (subjectId) window.localStorage.setItem(SUBJECT_KEY, subjectId);
  }, [subjectId]);

  const preview = useQuery(
    api.emails.buildPreview,
    rosterId && subjectId && sessionLabel
      ? { rosterId, subjectId, sessionLabel }
      : "skip"
  );

  if (rosters === undefined) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (rosters.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<Mail />}
          tone="indigo"
          title="Email digest"
          description="Send a class-wide narrative digest to your own inbox."
        />
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No rosters yet"
          description="Import a workbook or create a roster before sending a digest."
          action={
            <Link href="/import">
              <Button size="sm">Bulk import</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Mail />}
        tone="indigo"
        title="Email digest"
        description="Compile every student's narrative for the chosen subject and session into a single HTML email."
      />

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
            placeholder="e.g. T2 2026"
            value={sessionLabel}
            onChange={(e) => {
              setSessionLabel(e.target.value);
              if (typeof window !== "undefined")
                window.localStorage.setItem(SESSION_KEY, e.target.value);
            }}
            className="max-w-sm"
          />
        </div>
      </div>

      {!subjectId ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="Pick a subject"
          description="Subjects come from imported tabs like '2nd Grade Math Bank'. Run a bulk import if you don't see one."
        />
      ) : !sessionLabel ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="Pick a session"
          description="Enter the same session label you used on the Comments page."
        />
      ) : preview === undefined ? (
        <div className="text-sm text-muted-foreground">Loading preview...</div>
      ) : preview.rowCount === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="Nothing to send yet"
          description="No narratives have been written for this subject/session. Open Comments and write some first."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {preview.rowCount} student{preview.rowCount === 1 ? "" : "s"} ready · {preview.subjectLabel}
            </span>
            <div className="flex-1" />
            <ClipboardCopy html={preview.html} plain={preview.plain} />
            {rosterId && subjectId && (
              <DispatchButton
                rosterId={rosterId}
                subjectId={subjectId}
                sessionLabel={sessionLabel}
              />
            )}
          </div>
          <DigestPreview html={preview.html} />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Recent dispatches</h2>
        <DispatchHistory />
      </div>
    </div>
  );
}
