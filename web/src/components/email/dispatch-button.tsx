"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function DispatchButton({
  rosterId,
  subjectId,
  sessionLabel,
  disabled,
}: {
  rosterId: Id<"rosters">;
  subjectId: Id<"subjects">;
  sessionLabel: string;
  disabled?: boolean;
}) {
  const dispatch = useAction(api.emails.dispatchDigestForSession);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const result = await dispatch({ rosterId, subjectId, sessionLabel });
      if (result.status === "sent") {
        toast.success(
          `Sent digest with ${result.studentCount} student${result.studentCount === 1 ? "" : "s"}.`
        );
      } else {
        toast.error(result.errorMessage ?? "Failed to send digest.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send digest.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={send} disabled={busy || disabled} size="sm">
      {busy ? <Loader2 className="animate-spin" /> : <Send />}
      {busy ? "Sending..." : "Send digest"}
    </Button>
  );
}
