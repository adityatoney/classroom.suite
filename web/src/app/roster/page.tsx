"use client";

import { Users, BookOpenText, Archive, GraduationCap } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { RosterList } from "@/components/roster/roster-list";

export default function RosterIndexPage() {
  const rosters = useQuery(api.rosters.list, { includeArchived: true });
  const subjects = useQuery(api.subjects.listAllForUser, {});
  const active = rosters?.filter((r) => !r.archived).length ?? 0;
  const archived = rosters?.filter((r) => r.archived).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users />}
        tone="emerald"
        title="Rosters"
        description="One roster per class or section. Reused by the comment grid, lesson agendas, and email digests."
      />

      <StatGrid>
        <StatCard
          icon={<GraduationCap />}
          tone="emerald"
          label="Active rosters"
          value={active}
          hint="Currently in use"
        />
        <StatCard
          icon={<BookOpenText />}
          tone="violet"
          label="Subjects"
          value={subjects?.length ?? "—"}
          hint="Across all rosters"
        />
        <StatCard
          icon={<Archive />}
          tone="amber"
          label="Archived"
          value={archived}
          hint="Past sections"
        />
        <StatCard
          icon={<Users />}
          tone="blue"
          label="Total"
          value={rosters?.length ?? "—"}
          hint="Active + archived"
        />
      </StatGrid>

      <RosterList />
    </div>
  );
}
