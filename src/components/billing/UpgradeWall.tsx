import Link from "next/link";
import { C, MONO, SANS } from "@/lib/design/tokens";

export default function UpgradeWall({
  moduleLabel,
  canManage,
}: {
  moduleLabel: string;
  canManage: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "70vh",
        background: C.paper,
        color: C.ink,
        fontFamily: SANS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: "30px 28px",
          textAlign: "center",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: C.accent,
            background: C.accentBg,
            borderRadius: 6,
            padding: "4px 10px",
            display: "inline-block",
            marginBottom: 14,
          }}
        >
          Pro tool
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 650, margin: "0 0 8px" }}>
          {moduleLabel} is part of Pro
        </h1>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, margin: "0 0 22px" }}>
          Upgrade your workspace to run {moduleLabel}, save projects and invite
          your team. The free fit calculator stays free.
        </p>

        {canManage ? (
          <Link
            href="/billing"
            style={{
              display: "block",
              width: "100%",
              fontFamily: MONO,
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: C.accent,
              borderRadius: 9,
              padding: "12px 0",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Upgrade to Pro
          </Link>
        ) : (
          <p className="mono" style={{ fontSize: 12.5, color: C.faint }}>
            Ask a workspace owner or admin to upgrade.
          </p>
        )}

        <div style={{ marginTop: 14 }}>
          <Link href="/billing" style={{ fontSize: 12.5, color: C.sub, textDecoration: "none" }}>
            See plan details →
          </Link>
        </div>
      </div>
    </div>
  );
}
