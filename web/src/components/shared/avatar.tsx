import { cn } from "@/lib/utils";

// 8 deterministic colors. Hash the name to pick one so the same student
// always gets the same color across the app.
const PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  const palette = PALETTE[hash(name) % PALETTE.length];
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        dim,
        palette,
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
