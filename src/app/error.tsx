"use client";

import { useEffect } from "react";
import Link from "next/link";
import { C, SANS, MONO } from "@/lib/design/tokens";

/** Root error boundary for the public pages (marketing, calculators, legal). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.paper,
        color: C.ink,
        fontFamily: SANS,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <div
          className="mono"
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: C.faint,
            marginBottom: 16,
          }}
        >
          Tolerancing
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 10px" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: C.sub, margin: "0 0 22px" }}>
          This page hit an unexpected error. You can try again, or head back to
          the homepage.
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
          <Link
            href="/"
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
            Home
          </Link>
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
