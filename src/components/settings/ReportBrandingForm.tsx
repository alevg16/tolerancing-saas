"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { C, MONO, SANS } from "@/lib/design/tokens";
import { saveReportBrandingAction } from "@/app/(app)/settings/report/actions";
import type { ReportSettings } from "@/lib/data/reportSettings";

function monogram(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "—";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function ReportBrandingForm({ orgName, initial }: { orgName: string; initial: ReportSettings }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [footer, setFooter] = useState(initial.footer);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const company = companyName.trim() || orgName;
  const save = () => {
    setError(null); setSaved(false);
    start(async () => {
      try {
        await saveReportBrandingAction({ companyName, logoUrl, footer });
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "30px 22px 56px", fontFamily: SANS, color: C.ink }}>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: "0 0 6px" }}>Report branding</h1>
      <p style={{ fontSize: 13, color: C.sub, margin: "0 0 20px" }}>
        How your exported PDF reports are headed. Shared across the workspace; applies to every project&apos;s report.
      </p>

      {/* live header preview */}
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 10, color: C.faint, marginBottom: 10 }}>Preview</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, borderBottom: `2px solid ${C.ink}`, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            {logoUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={company} style={{ maxHeight: 42, maxWidth: 150, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, fontFamily: MONO }}>{monogram(company)}</div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{company}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: C.faint, marginTop: 3 }}>Tolerance analysis report</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mono" style={{ fontSize: 12, color: C.fail, background: C.failBg, border: `1px solid ${C.fail}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{error}</div>}

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Company / legal name" hint="defaults to your workspace name">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={orgName} style={inp} />
        </Field>
        <Field label="Logo URL" hint="link to a hosted PNG/SVG; leave blank for an initials badge">
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" style={{ ...inp, fontFamily: MONO }} />
        </Field>
        <Field label="Footer / disclaimer" hint="appears at the foot of every report">
          <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} placeholder="e.g. Acme Engineering AG · confidential · verify against the governing standard." style={{ ...inp, fontFamily: SANS, resize: "vertical" }} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={save} disabled={pending} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
            {pending ? "Saving…" : "Save branding"}
          </button>
          {saved && <span className="mono" style={{ fontSize: 12, color: C.ok }}>✓ Saved</span>}
        </div>
      </div>

      <p className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 16, lineHeight: 1.6 }}>
        Tip: host your logo anywhere public (your site, or Supabase Storage) and paste the URL. Reports are a Pro feature; open any saved project and choose Export.
      </p>
    </div>
  );
}

const inp: React.CSSProperties = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "9px 11px", background: "#fff", width: "100%", fontFamily: SANS };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{hint}</div>}
      {children}
    </label>
  );
}
