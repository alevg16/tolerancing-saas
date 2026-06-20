import { C, SANS } from "@/lib/design/tokens";
import type { ModuleDef } from "@/lib/modules";

function Group({ title, subtitle, modules, tone }: { title: string; subtitle: string; modules: ModuleDef[]; tone: string }) {
  if (modules.length === 0) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 16, fontWeight: 650, margin: 0, color: C.ink }}>{title}</h3>
        <span style={{ fontSize: 12.5, color: C.sub }}>{subtitle}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {modules.map((m) => (
          <div key={m.slug} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: C.ink }}>{m.label}</span>
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: ".05em", textTransform: "uppercase", color: tone }}>{m.tier}</span>
            </div>
            <div className="mono" style={{ fontSize: 10, color: C.faint, margin: "3px 0 7px" }}>{m.standard}</div>
            <p style={{ fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.45 }}>{m.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModuleShowcase({ modules }: { modules: ModuleDef[] }) {
  const free = modules.filter((m) => m.tier === "free");
  const pro = modules.filter((m) => m.tier === "pro");
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 22px 30px", fontFamily: SANS }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 680, margin: "0 0 8px", color: C.ink }}>One suite, every tolerance question</h2>
        <p style={{ fontSize: 15, color: C.sub, margin: 0 }}>Standards-grounded calculators that ship with the answer — not a blank spreadsheet.</p>
      </div>
      <Group title="Free" subtitle="the everyday hooks, no account needed" modules={free} tone={C.ok} />
      <Group title="Pro" subtitle="the analysis teams pay for" modules={pro} tone={C.accent} />
    </section>
  );
}
