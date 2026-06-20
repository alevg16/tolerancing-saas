"use client";

import Link from "next/link";
import { CALCULATORS } from "@/components/calculators";
import { useHydrated } from "@/lib/use-hydrated";
import { C, MONO, SANS } from "@/lib/design/tokens";
import type { Project } from "@/lib/types";

export default function ReportView({
  project,
  orgName,
  moduleLabel,
  standard,
  preparedBy,
}: {
  project: Project;
  orgName: string;
  moduleLabel: string;
  standard: string;
  preparedBy: string;
}) {
  const hydrated = useHydrated();
  const Calc = CALCULATORS[project.module_type];
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ background: "#fff", color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`@page{margin:16mm} @media print{.no-print{display:none!important} body{background:#fff}}`}</style>

      {/* action bar — screen only */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 22px",
          borderBottom: `1px solid ${C.line}`,
          background: C.panel,
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <Link
          href={`/projects/${project.id}`}
          className="mono"
          style={{ fontSize: 12, color: C.sub, textDecoration: "none" }}
        >
          ← Back to project
        </Link>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: C.faint }}>
          Use &ldquo;Save as PDF&rdquo; in the print dialog
        </span>
        <button
          onClick={() => window.print()}
          style={{
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: C.accent,
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 26px 64px" }}>
        {/* branded header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            borderBottom: `2px solid ${C.ink}`,
            paddingBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>{orgName}</div>
            <div
              className="mono"
              style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.faint, marginTop: 3 }}
            >
              Tolerance analysis report
            </div>
          </div>
          <div className="mono" style={{ textAlign: "right", fontSize: 11, color: C.sub, lineHeight: 1.7 }}>
            <div>{date}</div>
            <div>{moduleLabel} · {standard}</div>
          </div>
        </div>

        <h1 style={{ fontSize: 23, fontWeight: 650, margin: "16px 0 2px" }}>{project.name}</h1>
        <div className="mono" style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>
          Prepared by {preparedBy}
        </div>

        {/* the analysis (client-only to avoid hydration mismatch on random models) */}
        {hydrated ? <Calc initialState={project.data} /> : <div style={{ minHeight: "55vh" }} />}

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${C.line}`,
            marginTop: 26,
            paddingTop: 10,
          }}
        >
          <span className="mono" style={{ fontSize: 10, color: C.faint }}>
            Generated with Tolerancing
          </span>
          <span className="mono" style={{ fontSize: 10, color: C.faint }}>{date}</span>
        </div>
      </div>
    </div>
  );
}
