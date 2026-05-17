"use client";

import type { Pronoun } from "@/lib/comment-engine";
import { cn } from "@/lib/utils";

const PRONOUNS: { value: Pronoun; label: string }[] = [
  { value: "he", label: "he" },
  { value: "she", label: "she" },
  { value: "they", label: "they" },
];

export function PronounSelect({
  value,
  onChange,
  className,
}: {
  value: Pronoun;
  onChange: (next: Pronoun) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex h-7 rounded-md border bg-card p-0.5", className)}>
      {PRONOUNS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "flex h-6 min-w-9 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors",
            value === p.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
