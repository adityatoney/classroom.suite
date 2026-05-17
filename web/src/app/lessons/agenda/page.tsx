import { NotebookPen } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { AgendaList } from "@/components/lessons/agenda-list";

export default function AgendaIndexPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<NotebookPen />}
        tone="sky"
        title="Lesson agendas"
        description="Block-style markdown documents for daily planning. Map individual tasks to subsets of your roster."
      />
      <AgendaList />
    </div>
  );
}
