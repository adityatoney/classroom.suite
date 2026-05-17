"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Users, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";

export function RosterList() {
  const rosters = useQuery(api.rosters.list, { includeArchived: true });
  const createRoster = useMutation(api.rosters.create);
  const setArchived = useMutation(api.rosters.setArchived);
  const removeRoster = useMutation(api.rosters.remove);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setPending(true);
    try {
      await createRoster({ name: name.trim(), description: description.trim() || undefined });
      toast.success(`Created "${name.trim()}"`);
      setOpen(false);
      setName("");
      setDescription("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create roster");
    } finally {
      setPending(false);
    }
  };

  if (rosters === undefined) {
    return <div className="text-sm text-muted-foreground">Loading rosters...</div>;
  }

  const active = rosters.filter((r) => !r.archived);
  const archived = rosters.filter((r) => r.archived);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus />
            New roster
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New roster</DialogTitle>
              <DialogDescription>
                Create a class section. You can add students by CSV upload or one-by-one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="roster-name">Name</Label>
                <Input
                  id="roster-name"
                  placeholder="Period 3 Algebra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roster-desc">Description (optional)</Label>
                <Textarea
                  id="roster-desc"
                  placeholder="Notes about this class..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending || !name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No rosters yet"
          description="Create your first roster to start adding students."
        />
      ) : (
        <div className="space-y-2">
          {active.map((roster) => (
            <Link
              key={roster._id}
              href={`/roster/${roster._id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <div>
                <p className="text-sm font-medium">{roster.name}</p>
                {roster.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{roster.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchived({ rosterId: roster._id, archived: true });
                    toast.success(`Archived "${roster.name}"`);
                  }}
                  title="Archive"
                >
                  <Archive />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!confirm(`Delete "${roster.name}" and all its students?`)) return;
                    removeRoster({ rosterId: roster._id });
                    toast.success(`Deleted "${roster.name}"`);
                  }}
                  title="Delete"
                >
                  <Trash2 />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Archived
          </h2>
          {archived.map((roster) => (
            <div
              key={roster._id}
              className="flex items-center justify-between rounded-lg border border-dashed bg-card/50 p-4 opacity-60"
            >
              <div>
                <p className="text-sm font-medium">{roster.name}</p>
                {roster.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{roster.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setArchived({ rosterId: roster._id, archived: false });
                  toast.success(`Restored "${roster.name}"`);
                }}
                title="Restore"
              >
                <ArchiveRestore />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
