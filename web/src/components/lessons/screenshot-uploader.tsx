"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
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

/**
 * Creates a blank observation. The screenshot upload + Claude extraction
 * happens on the detail page (more flexible — supports multi-screenshot,
 * preview, and re-extraction).
 */
export function ScreenshotUploader() {
  const router = useRouter();
  const create = useMutation(api.lessonObservations.create);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [observationDate, setObservationDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const id = await create({
        title: title.trim(),
        observationDate,
      });
      setOpen(false);
      router.push(`/lessons/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create observation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New observation
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lesson observation</DialogTitle>
          <DialogDescription>
            Give the lesson a name and date. On the next screen you'll upload screenshots and
            click <strong>Extract with Claude</strong> to auto-fill the observation form.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="obs-title">Title</Label>
            <Input
              id="obs-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="5/13 Math — 2nd grade"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs-date">Observation date</Label>
            <Input
              id="obs-date"
              type="date"
              value={observationDate}
              onChange={(e) => setObservationDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            {busy ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
