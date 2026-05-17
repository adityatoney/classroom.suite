"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";

import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

const SAVE_DEBOUNCE = 1000;

export function AgendaEditor({ agenda }: { agenda: Doc<"lessonAgendas"> }) {
  const update = useMutation(api.lessonAgendas.updateBlocks);
  const { resolvedTheme } = useTheme();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const initial = useMemo(() => {
    try {
      const parsed = JSON.parse(agenda.blocks);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through to empty */
    }
    return undefined;
  }, [agenda._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useCreateBlockNote({
    initialContent: initial,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const blocks = JSON.stringify(editor.document);
        let markdown = "";
        try {
          markdown = await editor.blocksToMarkdownLossy(editor.document);
        } catch {
          /* ignore markdown export failures */
        }
        update({
          agendaId: agenda._id,
          blocks,
          markdownCache: markdown,
        })
          .then(() => setSavedAt(new Date().toLocaleTimeString()))
          .catch(() => {});
      }, SAVE_DEBOUNCE);
    });
    return () => {
      unsubscribe?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, agenda._id, update]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <BlockNoteView editor={editor} theme={resolvedTheme === "dark" ? "dark" : "light"} />
      </div>
      <p className="text-xs text-muted-foreground">
        {savedAt ? <>Saved {savedAt}</> : <>Edits autosave to Convex</>}
      </p>
    </div>
  );
}
