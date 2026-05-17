"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpenText, Plus, Trash2, Star, StarOff, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CommentBankManager({ subjectId }: { subjectId?: Id<"subjects"> }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <BookOpenText />
        Comment bank
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Comment bank</SheetTitle>
          <SheetDescription>
            {subjectId
              ? "Templates for the currently selected subject. Entries marked Global appear across every subject."
              : "All your sentence templates. New entries default to global (no subject)."}{" "}
            Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">NAME</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">HE/SHE</code>, and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">HIS/HER</code> as
            placeholders.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <CommentBankBody subjectId={subjectId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentBankBody({ subjectId }: { subjectId?: Id<"subjects"> }) {
  const bank = useQuery(api.commentBank.list, subjectId ? { subjectId } : {});
  const create = useMutation(api.commentBank.create);
  const update = useMutation(api.commentBank.update);
  const remove = useMutation(api.commentBank.remove);
  const toggleFavorite = useMutation(api.commentBank.toggleFavorite);

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<Id<"commentBank"> | null>(null);
  const [editText, setEditText] = useState("");

  const onAdd = async () => {
    if (!newText.trim()) return;
    await create({
      text: newText.trim(),
      subjectId,
      category: newCategory.trim() || undefined,
    });
    setNewText("");
    toast.success("Added");
  };

  if (bank === undefined) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <Label className="text-xs">Add a new template</Label>
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="NAME has shown growth in HIS engagement this term."
          className="text-sm"
        />
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="flex-1"
          />
          <Button size="sm" onClick={onAdd} disabled={!newText.trim()}>
            <Plus />
            Add
          </Button>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-1">
        {bank.map((c) => (
          <li
            key={c._id}
            className="group rounded-md border bg-card p-2 text-sm"
          >
            {editingId === c._id ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm"
                />
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingId(null)}
                  >
                    <X />
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={async () => {
                      await update({ commentId: c._id, text: editText.trim() });
                      setEditingId(null);
                      toast.success("Saved");
                    }}
                  >
                    <Check />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span className="mt-0 inline-flex h-4 min-w-7 shrink-0 items-center justify-center rounded bg-muted px-1.5 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
                  {c.importedId !== undefined ? `#${c.importedId}` : "—"}
                </span>
                <span className="flex-1 leading-snug">{c.text}</span>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => toggleFavorite({ commentId: c._id })}
                    title={c.isFavorite ? "Unfavorite" : "Favorite"}
                  >
                    {c.isFavorite ? (
                      <Star className="fill-yellow-500 text-yellow-500" />
                    ) : (
                      <StarOff />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEditingId(c._id);
                      setEditText(c.text);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        remove({ commentId: c._id });
                        toast.success("Deleted");
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              {c.category && <span>{c.category}</span>}
              {c.subjectId === undefined && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">Global</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
