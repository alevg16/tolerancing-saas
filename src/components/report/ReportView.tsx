"use client";

import Link from "next/link";
import { CALCULATORS } from "@/components/calculators";
import { useHydrated } from "@/lib/use-hydrated";
import { C, MONO, SANS } from "@/lib/design/tokens";
import type { Project } from "@/lib/types";

interface Branding {
  companyName: string;
  logoUrl: string;
  footer: string;
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ReportView({
  project,
  orgName,
  moduleLabel,
  standard,
  preparedBy,
  settings,
}: {
  project: Project;
  orgName: string;
  moduleLabel: string;
  standard: string;
  preparedBy: string;
  settings: Branding;
}) {
  const hydrated = useHydrated();
  const Calc = CALCULATORS[project.module_type];
  const company = settings.companyName.trim() || orgName;
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const docNo = `${project.id.slice(0, 8).toUpperCase()}`;
  const updated = new Date(project.updated_at).toLocaleDateString();

  return (
    <div style={{ background: "#fff", color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`@page{margin:15mm} @media print{.no-print{display:none!important} body{background:#fff} .sig{page-break-inside:avoid}}`}</style>

      {/* action bar — screen only */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: `1px solid ${C.line}`, background: C.panel, position: "sticky", top: 0, zIndex: 5 }}>
        <Link href={`/projects/${project.id}`} className="mono" style={{ fontSize: 12, color: C.sub, textDecoration: "none" }}>← Back to project</Link>
        <Link href="/settings/report" className="mono" style={{ fontSize: 12, color: C.sub, textDecoration: "none" }}>⚙ Branding</Link>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: C.faint }}>Choose &ldquo;Save as PDF&rdquo; in the print dialog</span>
        <button onClick={() => window.print()} style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Export PDF</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 26px 64px" }}>
        {/* branded header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: `2px solid ${C.ink}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={company} style={{ maxHeight: 46, maxWidth: 160, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 46, height: 46, borderRadius: 10, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, fontFamily: MONO }}>{monogram(company)}</div>
            )}
            <div>
              <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>{company}</div>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.faint, marginTop: 3 }}>Tolerance analysis report</div>
            </div>
          </div>
          <div className="mono" style={{ textAlign: "right", fontSize: 11, color: C.sub, lineHeight: 1.7 }}>
            <div>{date}</div>
            <div>Doc {docNo}</div>
          </div>
        </div>

        <h1 style={{ fontSize: 23, fontWeight: 650, margin: "16px 0 12px" }}>{project.name}</h1>

        {/* project info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px 22px", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
          <Info k="Module" v={moduleLabel} />
          <Info k="Standard" v={standard} />
          <Info k="Prepared by" v={preparedBy} />
          <Info k="Date" v={date} />
          <Info k="Last edited" v={updated} />
          <Info k="Document" v={docNo} />
        </div>

        {/* the analysis (client-only to avoid hydration mismatch on random models) */}
        {hydrated ? <Calc initialState={project.data} /> : <div style={{ minHeight: "55vh" }} />}

        {/* signature block */}
        <div className="sig" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 30 }}>
          {["Prepared", "Checked", "Approved"].map((role, i) => (
            <div key={role}>
              <div style={{ borderBottom: `1px solid ${C.ink}`, height: 34 }} />
              <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>
                {role}{i === 0 ? ` · ${preparedBy}` : ""}
              </div>
              <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 8 }}>Date</div>
              <div style={{ borderBottom: `1px solid ${C.line}`, height: 18 }} />
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${C.line}`, marginTop: 26, paddingTop: 10, gap: 16 }}>
          <span className="mono" style={{ fontSize: 9.5, color: C.faint, lineHeight: 1.5, maxWidth: 560 }}>
            {settings.footer.trim() || `${company} · engineering aid — verify all values against the governing standard before release.`}
          </span>
          <span className="mono" style={{ fontSize: 9.5, color: C.faint, whiteSpace: "nowrap" }}>Generated with Tolerancing</span>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".05em", textTransform: "uppercase", color: C.faint }}>{k}</div>
      <div style={{ fontSize: 13, color: C.ink, marginTop: 1 }}>{v || "—"}</div>
    </div>
  );
}
