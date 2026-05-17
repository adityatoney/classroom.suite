"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Plus, NotebookPen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";

export function AgendaList() {
  const router = useRouter();
  const agendas = useQuery(api.lessonAgendas.list, {});
  const rosters = useQuery(api.rosters.list, {});
  const create = useMutation(api.lessonAgendas.create);
  const remove = useMutation(api.lessonAgendas.remove);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [forDate, setForDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rosterId, setRosterId] = useState<Id<"rosters"> | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const id = await create({
        title: title.trim(),
        forDate,
        rosterId,
      });
      toast.success("Agenda created.");
      setOpen(false);
      router.push(`/lessons/agenda/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create agenda");
    } finally {
      setBusy(false);
    }
  };

  if (agendas === undefined || rosters === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus />
            New agenda
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lesson agenda</DialogTitle>
              <DialogDescription>
                A block-style markdown document for daily planning. Map individual blocks to
                students from a roster.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ag-title">Title</Label>
                <Input
                  id="ag-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="5/16 — Algebra Period 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ag-date">Date</Label>
                <Input
                  id="ag-date"
                  type="date"
                  value={forDate}
                  onChange={(e) => setForDate(e.target.value)}
                />
              </div>
              {rosters.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Roster (optional)</Label>
                  <Select
                    value={rosterId ?? ""}
                    onValueChange={(v) => setRosterId((v as Id<"rosters">) || undefined)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick a roster">
                        {(value: string) =>
                          rosters.find((r) => r._id === value)?.name ?? "Pick a roster"
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
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy || !title.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {agendas.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="h-6 w-6" />}
          title="No agendas yet"
          description="Create an agenda to plan a lesson block-by-block."
        />
      ) : (
        <ul className="space-y-2">
          {agendas.map((a) => (
            <li key={a._id}>
              <Link
                href={`/lessons/agenda/${a._id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.forDate), "PPP")}
                    {a.taskMappings.length > 0 && (
                      <> · {a.taskMappings.length} mapped block{a.taskMappings.length === 1 ? "" : "s"}</>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete "${a.title}"?`)) {
                      remove({ agendaId: a._id });
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
