"use client";

import { useEffect } from "react";
import { C, SANS, MONO } from "@/lib/design/tokens";

/** Error boundary for the authenticated app. Keeps the user inside the product
 *  with a retry and an escape hatch to the dashboard. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App section error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SANS,
        color: C.ink,
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "30px 26px",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 650, margin: "0 0 10px" }}>
          This section ran into a problem
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: C.sub, margin: "0 0 22px" }}>
          Your work is safe. Try again, or go back to your dashboard and reopen
          what you were doing.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: C.accent,
              border: "none",
              borderRadius: 9,
              padding: "10px 22px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.accent,
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 9,
              padding: "10px 22px",
              textDecoration: "none",
            }}
          >
            Dashboard
          </a>
        </div>
        {error.digest ? (
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginTop: 20 }}>
            ref {error.digest}
          </div>
        ) : null}
      </div>
    </div>
  );
}
