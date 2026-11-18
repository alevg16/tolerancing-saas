"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself, where
 * no app chrome or global CSS is available. It must render its own <html>/<body>,
 * so everything here is inline and self-contained (palette values from design
 * tokens, hard-coded to avoid any import that could also be failing).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F2F3F1",
          color: "#16181B",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 440, padding: "40px 28px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: 11,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "#8A8F96",
              marginBottom: 16,
            }}
          >
            Tolerancing
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 10px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5C6066", margin: "0 0 22px" }}>
            An unexpected error interrupted the app. Try again — if it keeps
            happening, reload the page in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#0E5A6B",
              border: "none",
              borderRadius: 9,
              padding: "10px 22px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 10,
                color: "#8A8F96",
                marginTop: 20,
              }}
            >
              ref {error.digest}
            </div>
          ) : null}
        </div>
      </body>
    </html>
  );
}
