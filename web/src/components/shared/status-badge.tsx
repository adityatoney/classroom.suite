import * as React from "react";
import { CheckCircle2, AlertTriangle, OctagonAlert, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "pending";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-400/30",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-400/30",
  critical: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/30",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-400/30",
  neutral: "bg-muted text-muted-foreground ring-foreground/10",
  pending: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-400/30",
};

const DEFAULT_ICON: Record<StatusTone, React.ReactNode> = {
  success: <CheckCircle2 />,
  warning: <AlertTriangle />,
  critical: <OctagonAlert />,
  info: <Circle />,
  neutral: <Circle />,
  pending: <Clock />,
};

export function StatusBadge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: StatusTone;
  icon?: React.ReactNode | "none";
  children: React.ReactNode;
  className?: string;
}) {
  const renderIcon = icon === "none" ? null : icon ?? DEFAULT_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap [&_svg]:size-3",
        TONE_CLASS[tone],
        className
      )}
    >
      {renderIcon}
      {children}
    </span>
  );
}
