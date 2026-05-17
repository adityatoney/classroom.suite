"use client";

import { useMemo, useState } from "react";
import { Star, Check, ChevronDown } from "lucide-react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CommentSelector({
  bank,
  selectedIds,
  onChange,
}: {
  bank: Doc<"commentBank">[];
  selectedIds: Id<"commentBank">[];
  onChange: (next: Id<"commentBank">[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") return bank;
    // Search by ID prefix (e.g. typing "12" matches importedId=12) or by text
    return bank.filter((c) => {
      const idStr = c.importedId !== undefined ? String(c.importedId) : "";
      return idStr.startsWith(q) || c.text.toLowerCase().includes(q);
    });
  }, [bank, search]);

  const selectedSet = new Set(selectedIds);
  const toggle = (id: Id<"commentBank">) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Preserve bank order (which is importedId-sorted on the server).
    const ordered = bank.filter((c) => next.has(c._id)).map((c) => c._id);
    for (const x of next) if (!ordered.includes(x)) ordered.push(x);
    onChange(ordered);
  };

  const selectedCount = selectedSet.size;
  const selectedSummary = useMemo(() => {
    if (selectedCount === 0) return "Select comments...";
    const ids = bank
      .filter((c) => selectedSet.has(c._id))
      .map((c) => (c.importedId !== undefined ? `#${c.importedId}` : "•"));
    if (ids.length <= 6) return ids.join(", ");
    return `${ids.slice(0, 6).join(", ")} +${ids.length - 6}`;
  }, [bank, selectedSet, selectedCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="truncate text-left">{selectedSummary}</span>
            <ChevronDown />
          </Button>
        }
      />
      <PopoverContent
        // Pin width AND height so the popover never resizes/repositions as
        // the user types into the search box. Inline `style` beats Tailwind
        // class merging — base-ui's positioner won't override it.
        className="p-0"
        style={{ width: "28rem", maxWidth: "min(28rem, 90vw)" }}
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search by ID or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7"
          />
        </div>
        <div
          className="overflow-y-auto py-1"
          style={{ height: "20rem" }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No matching comments.
            </p>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedSet.has(c._id);
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => toggle(c._id)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span
                    className={cn(
                      "mt-0 inline-flex h-4 min-w-7 shrink-0 items-center justify-center rounded bg-muted px-1.5 font-mono text-[10px] font-medium tabular-nums",
                      isSelected && "bg-primary/15 text-primary"
                    )}
                  >
                    {c.importedId !== undefined ? `#${c.importedId}` : "—"}
                  </span>
                  <span className="flex-1 leading-snug whitespace-normal break-words">
                    {c.text}
                  </span>
                  {c.isFavorite && (
                    <Star className="mt-0.5 h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
