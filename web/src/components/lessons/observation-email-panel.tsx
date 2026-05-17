"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Send, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function ObservationEmailPanel({
  observation,
  observerEmail,
}: {
  observation: Doc<"lessonObservations">;
  observerEmail: string;
}) {
  const preview = useQuery(api.observationEmails.buildPreview, {
    observationId: observation._id,
  });
  const send = useAction(api.observationEmails.sendObservationToObserver);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const onSend = async () => {
    if (!observerEmail.trim()) {
      toast.error("Add an observer email first.");
      return;
    }
    if (!confirm(`Send this observation to ${observerEmail.trim()}?`)) return;
    setSending(true);
    try {
      const result = await send({ observationId: observation._id });
      if (result.status === "sent") {
        toast.success(`Sent to ${observerEmail.trim()}.`);
      } else {
        toast.error(result.errorMessage ?? "Send failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? <EyeOff /> : <Eye />}
          {showPreview ? "Hide preview" : "Show preview"}
        </Button>
        <Button
          size="sm"
          onClick={onSend}
          disabled={sending || !observerEmail.trim()}
        >
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Sending..." : `Send to observer`}
        </Button>
        {preview && (
          <span className="text-xs text-muted-foreground">
            Email will include {preview.screenshotCount} screenshot
            {preview.screenshotCount === 1 ? "" : "s"} inline.
          </span>
        )}
      </div>
      {showPreview && preview && (
        <iframe
          srcDoc={preview.html}
          title="Observation form preview"
          sandbox="allow-same-origin"
          className="h-[480px] w-full rounded-lg border bg-white"
        />
      )}
    </div>
  );
}
