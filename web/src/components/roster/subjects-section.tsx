"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SubjectsSection({ rosterId }: { rosterId: Id<"rosters"> }) {
  const subjects = useQuery(api.subjects.listByRoster, { rosterId });
  const create = useMutation(api.subjects.create);
  const remove = useMutation(api.subjects.remove);
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try {
      await create({ rosterId, name: name.trim() });
      setName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add subject");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects</CardTitle>
        <CardDescription>
          Each subject owns its own comment bank. Add one per class period — e.g. Math, Science.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subject name (e.g. Math)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button size="sm" onClick={add} disabled={!name.trim()}>
            <Plus />
            Add
          </Button>
        </div>
        {subjects === undefined ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">No subjects yet.</p>
        ) : (
          <ul className="space-y-1">
            {subjects.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span>{s.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete subject "${s.name}"? This also deletes its comment bank and any narratives written under it.`
                      )
                    ) {
                      remove({ subjectId: s._id });
                      toast.success(`Deleted "${s.name}"`);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
