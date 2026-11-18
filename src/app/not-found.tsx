import Link from "next/link";
import { C, SANS, MONO } from "@/lib/design/tokens";

/** Custom 404 for unknown routes. */
export default function NotFound() {
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
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: "0 0 6px", fontFamily: MONO }}>404</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: C.sub, margin: "0 0 22px" }}>
          We couldn’t find that page. It may have moved, or the link is out of date.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: C.accent,
              border: "none",
              borderRadius: 9,
              padding: "10px 22px",
              textDecoration: "none",
            }}
          >
            Home
          </Link>
          <Link
            href="/calculators"
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
            Free calculators
          </Link>
        </div>
      </div>
    </div>
  );
}
