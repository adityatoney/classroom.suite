"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function ScreenshotStrip({ observation }: { observation: Doc<"lessonObservations"> }) {
  const urls = useQuery(api.lessonObservations.getScreenshotUrls, {
    observationId: observation._id,
  });
  const generateUploadUrl = useMutation(api.lessonObservations.generateUploadUrl);
  const addScreenshot = useMutation(api.lessonObservations.addScreenshot);
  const removeScreenshot = useMutation(api.lessonObservations.removeScreenshot);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await addScreenshot({ observationId: observation._id, storageId });
      }
      toast.success(`Added ${files.length} screenshot${files.length === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {urls?.map(({ storageId, url }) =>
          url ? (
            <div
              key={storageId}
              className="group relative h-28 w-44 overflow-hidden rounded-md border bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 hidden rounded bg-background/80 p-1 text-destructive shadow-sm group-hover:block"
                onClick={() => {
                  if (confirm("Remove this screenshot?")) {
                    removeScreenshot({
                      observationId: observation._id,
                      storageId: storageId as unknown as Id<"_storage">,
                    });
                  }
                }}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null
        )}

        <label className="flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-input text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          <span>{uploading ? "Uploading..." : "Add screenshot"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
          />
        </label>
      </div>
      {urls && urls.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No screenshots yet — Claude needs at least one to extract answers.
        </p>
      )}
    </div>
  );
}
