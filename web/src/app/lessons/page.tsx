"use client";

import { ClipboardList, FileText, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { ObservationList } from "@/components/lessons/observation-list";
import { ScreenshotUploader } from "@/components/lessons/screenshot-uploader";

export default function LessonsIndexPage() {
  const observations = useQuery(api.lessonObservations.list, {});
  const drafts = observations?.filter((o) => o.status !== "complete").length ?? 0;
  const complete = observations?.filter((o) => o.status === "complete").length ?? 0;
  const refined = observations?.filter((o) => !!o.lastRefinedAt).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList />}
        tone="violet"
        title="Lesson observations"
        description="Upload screenshots of a filled-in CHA Faculty Observation Form. Claude pre-fills Domain 1/2/3 from screenshots; you draft + refine the post-observation reflections."
        action={<ScreenshotUploader />}
      />

      <StatGrid>
        <StatCard
          icon={<FileText />}
          tone="blue"
          label="Total"
          value={observations?.length ?? "—"}
          hint="All observations"
        />
        <StatCard
          icon={<Sparkles />}
          tone="amber"
          label="In draft"
          value={drafts}
          hint="Still in progress"
        />
        <StatCard
          icon={<RefreshCw />}
          tone="violet"
          label="Refined"
          value={refined}
          hint="Post-obs polished from notes"
        />
        <StatCard
          icon={<CheckCircle2 />}
          tone="emerald"
          label="Complete"
          value={complete}
          hint="Marked done"
        />
      </StatGrid>

      <ObservationList />
    </div>
  );
}
