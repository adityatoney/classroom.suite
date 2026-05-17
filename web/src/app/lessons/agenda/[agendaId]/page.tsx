"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Pencil, Check, NotebookPen } from "lucide-react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { AgendaEditor } from "@/components/lessons/agenda-editor";
import { TaskRosterMapper } from "@/components/lessons/task-roster-mapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AgendaDetailPage({
  params,
}: {
  params: Promise<{ agendaId: string }>;
}) {
  const { agendaId } = use(params);
  const agenda = useQuery(api.lessonAgendas.get, {
    agendaId: agendaId as Id<"lessonAgendas">,
  });
  const updateMeta = useMutation(api.lessonAgendas.updateMeta);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  if (agenda === undefined) {
    return <div className="text-sm text-muted-foreground">Loading agenda...</div>;
  }
  if (agenda === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Agenda not found.</p>
        <Link href="/lessons/agenda">
          <Button variant="outline" size="sm">
            <ChevronLeft />
            All agendas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/lessons/agenda"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3 w-3" />
        All agendas
      </Link>

      <div className="flex items-center gap-2">
        {editingTitle ? (
          <>
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="text-base font-semibold"
            />
            <Button
              size="icon-sm"
              onClick={async () => {
                if (titleDraft.trim()) {
                  await updateMeta({ agendaId: agenda._id, title: titleDraft.trim() });
                }
                setEditingTitle(false);
              }}
            >
              <Check />
            </Button>
          </>
        ) : (
          <>
            <PageHeader
              icon={<NotebookPen />}
              tone="sky"
              title={agenda.title}
              description={agenda.forDate}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setTitleDraft(agenda.title);
                setEditingTitle(true);
              }}
            >
              <Pencil />
            </Button>
          </>
        )}
      </div>

      <AgendaEditor agenda={agenda} />
      <TaskRosterMapper agenda={agenda} />
    </div>
  );
}
