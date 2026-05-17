"use client";

import { Clipboard, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ClipboardCopy({
  html,
  plain,
  label = "Copy to clipboard",
  disabled,
}: {
  html: string;
  plain: string;
  label?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.ClipboardItem &&
        navigator.clipboard.write
      ) {
        const item = new window.ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopied(true);
      toast.success("Copied — paste into Gmail or another mail client.");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={copy} disabled={disabled}>
      {copied ? <ClipboardCheck /> : <Clipboard />}
      {label}
    </Button>
  );
}
