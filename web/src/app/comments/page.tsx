"use client";

import { MessageSquareText, Users, Sparkles, Edit3, BookOpenText } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { CommentGrid } from "@/components/comments/comment-grid";

export default function CommentsPage() {
  // Lightweight aggregate stats — counted from the same data the grid uses.
  const rosters = useQuery(api.rosters.list, {});
  const totalStudents = useQuery(api.commentBank.list, {});

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageSquareText />}
        tone="blue"
        title="Comments"
        description="Pick a roster + subject + session, then build each student's narrative with the comment bank. Edits autosave; the live preview substitutes name and pronoun in real time."
      />

      <StatGrid>
        <StatCard
          icon={<Users />}
          tone="blue"
          label="Rosters"
          value={rosters?.length ?? "—"}
          hint="Active class sections"
        />
        <StatCard
          icon={<BookOpenText />}
          tone="violet"
          label="Comment bank"
          value={totalStudents?.length ?? "—"}
          hint="Templates in your library"
        />
        <StatCard
          icon={<Sparkles />}
          tone="emerald"
          label="Live engine"
          value="On"
          hint="Substitutions update on every keystroke"
        />
        <StatCard
          icon={<Edit3 />}
          tone="amber"
          label="Manual override"
          value="Always wins"
          hint="Your edits beat the auto-compiled text"
        />
      </StatGrid>

      <CommentGrid />
    </div>
  );
}
