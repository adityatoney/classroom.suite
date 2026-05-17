"use client";

import { useQuery } from "convex/react";
import { Check, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { api } from "../../../convex/_generated/api";
import { EmptyState } from "@/components/shared/empty-state";

export function DispatchHistory() {
  const dispatches = useQuery(api.emails.listDispatches, {});

  if (dispatches === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (dispatches.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="No digests sent yet"
        description="Past dispatches will appear here with their delivery status."
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {dispatches.map((d) => (
        <li
          key={d._id}
          className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            {d.status === "sent" ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
            <div>
              <p className="font-medium">{d.subject}</p>
              <p className="text-xs text-muted-foreground">
                {d.studentCount} student{d.studentCount === 1 ? "" : "s"} →{" "}
                {d.toAddress} · {formatDistanceToNow(new Date(d.sentAt), { addSuffix: true })}
                {d.errorMessage && <span className="text-destructive"> — {d.errorMessage}</span>}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
