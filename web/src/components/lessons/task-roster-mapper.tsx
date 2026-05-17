"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";

type Mapping = Doc<"lessonAgendas">["taskMappings"][number];

export function TaskRosterMapper({ agenda }: { agenda: Doc<"lessonAgendas"> }) {
  const update = useMutation(api.lessonAgendas.updateTaskMappings);
  const students = useQuery(
    api.students.listByRoster,
    agenda.rosterId ? { rosterId: agenda.rosterId } : "skip"
  );

  const [mappings, setMappings] = useState<Mapping[]>(agenda.taskMappings);
  const [newBlockId, setNewBlockId] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const save = async (next: Mapping[]) => {
    setMappings(next);
    try {
      await update({ agendaId: agenda._id, taskMappings: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save mapping");
    }
  };

  const add = () => {
    if (!newBlockId.trim()) return;
    save([...mappings, { blockId: newBlockId.trim(), studentIds: [], label: newLabel.trim() || undefined }]);
    setNewBlockId("");
    setNewLabel("");
  };

  const remove = (i: number) => save(mappings.filter((_, idx) => idx !== i));

  const toggleStudent = (i: number, studentId: Id<"students">) => {
    const m = mappings[i];
    const set = new Set(m.studentIds);
    if (set.has(studentId)) set.delete(studentId);
    else set.add(studentId);
    save(mappings.map((mm, idx) => (idx === i ? { ...mm, studentIds: Array.from(set) } : mm)));
  };

  const studentMap = useMemo(() => {
    if (!students) return new Map();
    return new Map(students.map((s) => [s._id, s]));
  }, [students]);

  if (!agenda.rosterId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task → student mapping</CardTitle>
          <CardDescription>Attach a roster to this agenda to map blocks to students.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (students === undefined) return <p className="text-sm text-muted-foreground">Loading students...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task → student mapping</CardTitle>
        <CardDescription>
          Identify a BlockNote block (by id from the editor URL or your notes) and assign it to a
          subset of students from this roster.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border bg-card p-3">
          <Label className="text-xs">Add mapping</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Block id"
              value={newBlockId}
              onChange={(e) => setNewBlockId(e.target.value)}
              className="font-mono"
            />
            <Input
              placeholder="Label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Button size="sm" onClick={add} disabled={!newBlockId.trim()}>
              <Plus />
              Add
            </Button>
          </div>
        </div>

        {mappings.length === 0 ? (
          <EmptyState
            title="No mappings yet"
            description="Add a mapping above to associate a block in the agenda with specific students."
          />
        ) : (
          <ul className="space-y-3">
            {mappings.map((m, i) => (
              <li key={i} className="rounded-md border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs">{m.blockId}</p>
                    {m.label && <p className="text-xs text-muted-foreground">{m.label}</p>}
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {students.map((s) => (
                    <label
                      key={s._id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-xs hover:bg-accent"
                    >
                      <Checkbox
                        checked={m.studentIds.includes(s._id)}
                        onCheckedChange={() => toggleStudent(i, s._id)}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
                {m.studentIds.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {m.studentIds.length} student{m.studentIds.length === 1 ? "" : "s"}:{" "}
                    {m.studentIds
                      .map((id) => studentMap.get(id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
