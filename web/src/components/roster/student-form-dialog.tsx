"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pronoun } from "@/lib/comment-engine";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterId: Id<"rosters">;
  student?: Doc<"students">;
}

export function StudentFormDialog({ open, onOpenChange, rosterId, student }: Props) {
  const create = useMutation(api.students.create);
  const update = useMutation(api.students.update);

  const [name, setName] = useState("");
  const [pronoun, setPronoun] = useState<Pronoun>("they");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(student?.name ?? "");
      setPronoun(student?.pronoun ?? "they");
      setNotes(student?.notes ?? "");
    }
  }, [open, student]);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (student) {
        await update({
          studentId: student._id,
          name: name.trim(),
          pronoun,
          notes: notes.trim() || undefined,
        });
        toast.success(`Updated "${name.trim()}"`);
      } else {
        await create({
          rosterId,
          name: name.trim(),
          pronoun,
          notes: notes.trim() || undefined,
        });
        toast.success(`Added "${name.trim()}"`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>
            {student
              ? "Update this student's name, pronoun, or notes."
              : "Add a single student to this roster."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="student-name">Name</Label>
            <Input
              id="student-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aiden Patel"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pronoun</Label>
            <Select
              value={pronoun}
              onValueChange={(v) => v && setPronoun(v as Pronoun)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    value === "he"
                      ? "he / him"
                      : value === "she"
                        ? "she / her"
                        : "they / them"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he">he / him</SelectItem>
                <SelectItem value="she">she / her</SelectItem>
                <SelectItem value="they">they / them</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student-notes">Notes (optional)</Label>
            <Textarea
              id="student-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about this student..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {student ? "Save changes" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
