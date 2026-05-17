"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { format } from "date-fns";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ObservationForm } from "@/components/lessons/observation-form";
import { Button } from "@/components/ui/button";

export default function ObservationDetailPage({
  params,
}: {
  params: Promise<{ observationId: string }>;
}) {
  const { observationId } = use(params);
  const obs = useQuery(api.lessonObservations.get, {
    observationId: observationId as Id<"lessonObservations">,
  });

  if (obs === undefined) {
    return <div className="text-sm text-muted-foreground">Loading observation...</div>;
  }
  if (obs === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Observation not found.</p>
        <Link href="/lessons">
          <Button variant="outline" size="sm">
            <ChevronLeft />
            All observations
          </Button>
        </Link>
      </div>
    );
  }

  const meta = [
    obs.subject,
    obs.gradeLevel,
    format(new Date(obs.observationDate), "PPP"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <Link
        href="/lessons"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3 w-3" />
        All observations
      </Link>
      <PageHeader
        icon={<ClipboardList />}
        tone="violet"
        title={obs.title}
        description={meta}
        action={
          obs.status === "complete" ? (
            <StatusBadge tone="success">Complete</StatusBadge>
          ) : (
            <StatusBadge tone="pending">Draft</StatusBadge>
          )
        }
      />
      <ObservationForm observation={obs} />
    </div>
  );
}
