"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronLeft, Users } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { StudentsTable } from "@/components/roster/students-table";
import { SubjectsSection } from "@/components/roster/subjects-section";
import { Button } from "@/components/ui/button";

export default function RosterDetailPage({
  params,
}: {
  params: Promise<{ rosterId: string }>;
}) {
  const { rosterId } = use(params);
  const typedRosterId = rosterId as Id<"rosters">;
  const roster = useQuery(api.rosters.get, { rosterId: typedRosterId });

  if (roster === undefined) {
    return <div className="text-sm text-muted-foreground">Loading roster...</div>;
  }
  if (roster === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Roster not found.</p>
        <Link href="/roster">
          <Button variant="outline" size="sm">
            <ChevronLeft />
            All rosters
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/roster"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3 w-3" />
        All rosters
      </Link>
      <PageHeader
        icon={<Users />}
        tone="emerald"
        title={roster.name}
        description={roster.description}
      />
      <SubjectsSection rosterId={typedRosterId} />
      <StudentsTable rosterId={typedRosterId} />
    </div>
  );
}
