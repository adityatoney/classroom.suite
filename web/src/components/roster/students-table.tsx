"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/shared/avatar";
import { RosterCsvUploader } from "./roster-csv-uploader";
import { StudentFormDialog } from "./student-form-dialog";
import type { Pronoun } from "@/lib/comment-engine";

const PRONOUN_LABELS: Record<Pronoun, string> = {
  he: "he / him",
  she: "she / her",
  they: "they / them",
};

export function StudentsTable({ rosterId }: { rosterId: Id<"rosters"> }) {
  const students = useQuery(api.students.listByRoster, { rosterId });
  const updateStudent = useMutation(api.students.update);
  const removeStudent = useMutation(api.students.remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"students"> | undefined>(undefined);

  if (students === undefined) {
    return <div className="text-sm text-muted-foreground">Loading students...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus />
          Add student
        </Button>
        <RosterCsvUploader rosterId={rosterId} />
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No students in this roster"
          description="Add students manually or import a CSV with name, pronoun, and optional notes columns."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pronoun</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.pronoun}
                      onValueChange={(v) => {
                        if (v && v !== s.pronoun) {
                          updateStudent({ studentId: s._id, pronoun: v as Pronoun });
                        }
                      }}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{PRONOUN_LABELS[s.pronoun]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he">he / him</SelectItem>
                        <SelectItem value="she">she / her</SelectItem>
                        <SelectItem value="they">they / them</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {s.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (!confirm(`Remove ${s.name}?`)) return;
                          removeStudent({ studentId: s._id });
                          toast.success(`Removed "${s.name}"`);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StudentFormDialog
        open={open}
        onOpenChange={setOpen}
        rosterId={rosterId}
        student={editing}
      />
    </div>
  );
}
