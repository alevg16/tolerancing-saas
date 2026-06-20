"use client";

import { useState } from "react";
import { C, MONO } from "@/lib/design/tokens";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 220 }}>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          flex: 1,
          fontFamily: MONO,
          fontSize: 11.5,
          color: C.sub,
          border: `1px solid ${C.line}`,
          borderRadius: 7,
          padding: "6px 8px",
          background: C.paper,
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked — the field is selectable as a fallback */
          }
        }}
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: copied ? C.ok : C.sub,
          background: "#fff",
          border: `1px solid ${C.line}`,
          borderRadius: 7,
          padding: "6px 10px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
