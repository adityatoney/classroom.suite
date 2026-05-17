"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * A card whose body collapses behind a chevron in the header. Optional
 * `storageKey` persists the open/closed state in localStorage so user
 * preferences survive reloads.
 *
 * The header has three slots:
 *  - `title`       — required, rendered next to the chevron
 *  - `badge`       — optional inline status pill
 *  - `description` — optional muted subtext under the title
 *  - `action`      — optional right-side actions (button group, etc.)
 *
 * Clicking anywhere in the title area toggles. Clicks inside `action`
 * are absorbed (e.g. a "Refine" button keeps working without expanding).
 */
export function CollapsibleCard({
  title,
  description,
  badge,
  action,
  defaultOpen = true,
  storageKey,
  contentClassName,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  contentClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState<boolean>(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) return stored === "1";
    }
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    }
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="group flex flex-1 items-start gap-2.5 rounded-md text-left transition-colors hover:opacity-80"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
              !open && "-rotate-90"
            )}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 font-heading text-base font-medium leading-snug">
              {title}
              {badge}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </button>
        {action && (
          <div
            className="shrink-0"
            // Don't let action clicks bubble to the toggle.
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        )}
      </div>
      {open && (
        <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
      )}
    </Card>
  );
}
