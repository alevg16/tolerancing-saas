import Link from "next/link";
import { C, SANS } from "@/lib/design/tokens";

interface Plan {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
  footnote?: string;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "CHF 0",
    tagline: "The commodity calculators — no account needed.",
    features: [
      "Hole / shaft fit (ISO 286)",
      "Thread & bolt-torque calculators",
      "Tolerance-zone & cross-section diagrams",
      "Print to PDF",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    name: "Pro",
    price: "CHF 29",
    period: "/ month",
    tagline: "The full suite for a working engineer.",
    features: [
      "Every calculator — stacks, allocation, press fit, GD&T, gears",
      "Saved projects with revisions",
      "Company standards library",
      "Branded PDF reports",
      "Monthly or CHF 290 / year",
    ],
    cta: { label: "Start Pro", href: "/login" },
    highlight: true,
    footnote: "14-day no-risk — cancel anytime from the customer portal.",
  },
  {
    name: "Team",
    price: "From CHF 29",
    period: "/ seat",
    tagline: "One shared workspace for the whole team.",
    features: [
      "Everything in Pro",
      "Shared projects & standards across the team",
      "Member roles & invitations",
      "One source of truth for fits & materials",
    ],
    cta: { label: "Start free & invite", href: "/login" },
    footnote: "Volume pricing on request.",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ maxWidth: 1000, margin: "0 auto", padding: "10px 22px 30px", fontFamily: SANS }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h2 style={{ fontSize: 26, fontWeight: 680, margin: "0 0 8px", color: C.ink }}>Simple pricing</h2>
        <p style={{ fontSize: 15, color: C.sub, margin: 0 }}>Free to try. Upgrade when you need to save, stack and share.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, alignItems: "start" }}>
        {PLANS.map((p) => (
          <div
            key={p.name}
            style={{
              background: C.panel,
              border: `1px solid ${p.highlight ? C.accent : C.line}`,
              boxShadow: p.highlight ? `0 0 0 1px ${C.accent}` : "none",
              borderRadius: 16,
              padding: "22px 22px 24px",
              position: "relative",
            }}
          >
            {p.highlight && (
              <span className="mono" style={{ position: "absolute", top: -11, left: 22, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "#fff", background: C.accent, borderRadius: 6, padding: "3px 9px" }}>
                Most popular
              </span>
            )}
            <div style={{ fontSize: 14, fontWeight: 650, color: C.ink }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "8px 0 4px" }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: C.ink }}>{p.price}</span>
              {p.period && <span style={{ fontSize: 13, color: C.faint }}>{p.period}</span>}
            </div>
            <p style={{ fontSize: 13, color: C.sub, margin: "0 0 16px", minHeight: 36 }}>{p.tagline}</p>
            <Link
              href={p.cta.href}
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: "none",
                color: p.highlight ? "#fff" : C.accent,
                background: p.highlight ? C.accent : C.accentBg,
                border: `1px solid ${p.highlight ? C.accent : "transparent"}`,
                borderRadius: 9,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              {p.cta.label}
            </Link>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>
                  <span style={{ color: C.ok, flexShrink: 0 }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {p.footnote && <p className="mono" style={{ fontSize: 10, color: C.faint, margin: "14px 0 0", lineHeight: 1.5 }}>{p.footnote}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
