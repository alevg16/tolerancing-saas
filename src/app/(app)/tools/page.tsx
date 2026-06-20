import type { Metadata } from "next";
import Link from "next/link";
import { getModulesWithTiers } from "@/lib/data/moduleTiers";
import { C } from "@/lib/design/tokens";

export const metadata: Metadata = { title: "Tools · Tolerancing" };

export default async function ToolsPage() {
  const MODULES = await getModulesWithTiers();
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 22px 56px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Tools</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 22px" }}>
        Open a calculator to run a quick analysis. Stack-ups can be saved as
        projects from here or the dashboard.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {MODULES.map((m) => (
          <Link
            key={m.slug}
            href={`/tools/${m.slug}`}
            style={{
              textDecoration: "none",
              color: C.ink,
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: "16px 18px",
              display: "block",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 15.5, fontWeight: 650 }}>{m.label}</span>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: m.tier === "free" ? C.ok : C.faint,
                  background: m.tier === "free" ? C.okBg : C.paper,
                  borderRadius: 5,
                  padding: "3px 7px",
                }}
              >
                {m.tier}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginBottom: 8 }}>
              {m.standard}
            </div>
            <p style={{ fontSize: 12.5, color: C.sub, margin: 0, lineHeight: 1.5 }}>
              {m.blurb}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
