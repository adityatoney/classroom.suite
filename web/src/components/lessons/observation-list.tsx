"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import {
  ClipboardList,
  Trash2,
  Image as ImageIcon,
  Calendar,
  GraduationCap,
  Mail,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";

export function ObservationList() {
  const observations = useQuery(api.lessonObservations.list, {});
  const remove = useMutation(api.lessonObservations.remove);

  if (observations === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (observations.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title="No observations yet"
        description="Click New observation to upload a lesson plan and start an extraction."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {observations.map((o) => {
        const filledAnswers = o.answers.filter((a) => a.value.trim() !== "").length;
        const screenshotCount = o.sourceScreenshotStorageIds.length;
        const isComplete = o.status === "complete";
        return (
          <li key={o._id}>
            <Link
              href={`/lessons/${o._id}`}
              className="block rounded-xl border bg-card p-4 ring-1 ring-inset ring-foreground/[0.02] transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight">{o.title}</h3>
                    {isComplete ? (
                      <StatusBadge tone="success">Complete</StatusBadge>
                    ) : (
                      <StatusBadge tone="pending">Draft</StatusBadge>
                    )}
                    {o.lastRefinedAt && (
                      <StatusBadge tone="info" icon="none">
                        Refined {formatDistanceToNow(new Date(o.lastRefinedAt), { addSuffix: true })}
                      </StatusBadge>
                    )}
                    {o.observerEmail && (
                      <StatusBadge tone="neutral" icon={<Mail />}>
                        {o.observerEmail}
                      </StatusBadge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(o.observationDate), "PPP")}
                    </span>
                    {o.subject && (
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {o.subject}
                        {o.gradeLevel && <span className="text-muted-foreground/60">· {o.gradeLevel}</span>}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {screenshotCount} screenshot{screenshotCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      {filledAnswers}/23 answers filled
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete observation "${o.title}"?`)) {
                      remove({ observationId: o._id });
                    }
                  }}
                  title="Delete observation"
                >
                  <Trash2 />
                </Button>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
