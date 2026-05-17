"use client";

export function DigestPreview({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      title="Digest preview"
      sandbox="allow-same-origin"
      className="h-[480px] w-full rounded-lg border bg-white"
    />
  );
}
