"use client";

import React, { useState, useMemo } from "react";
import { Printer, AlertTriangle } from "lucide-react";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#34618E", accentBg: "#E5EBF2",
  ok: "#1F7A4D", warn: "#B5862B", over: "#B23A48", okBg: "#E8F2EC", warnBg: "#F7F1E2", overBg: "#F7E9EB",
  pitch: "#1F7A4D", thread: "#C0792B", head: "#34618E",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// metric coarse: [name, d, pitch, d2, As]
const BOLTS = [
  ["M3", 3, 0.5, 2.675, 5.03], ["M4", 4, 0.7, 3.545, 8.78], ["M5", 5, 0.8, 4.480, 14.2],
  ["M6", 6, 1.0, 5.350, 20.1], ["M8", 8, 1.25, 7.188, 36.6], ["M10", 10, 1.5, 9.026, 58.0],
  ["M12", 12, 1.75, 10.863, 84.3], ["M16", 16, 2.0, 14.701, 157], ["M20", 20, 2.5, 18.376, 245], ["M24", 24, 3.0, 22.051, 353],
];
// bolt materials → grades [label, proof Sp (MPa), tensile Rm (MPa)]
const BOLT_MAT = {
  Steel: [["4.6", 225, 400], ["8.8", 600, 800], ["10.9", 830, 1040], ["12.9", 970, 1220]],
  Stainless: [["A2-50", 210, 500], ["A2-70", 450, 700], ["A4-80", 600, 800]],
  Titanium: [["Ti-6Al-4V", 830, 900]],
  Aluminium: [["7075-T6", 380, 450]],
};
// base material → tensile Rm (MPa) for thread-stripping guidance
const BASE_MAT = [["Steel", 400], ["Stainless", 600], ["Titanium", 900], ["Aluminium", 310]];
// friction condition: [label, µ, K]
const FRICTION = [
  ["Dry / as-received steel", 0.14, 0.20], ["Lightly oiled", 0.12, 0.18],
  ["Zinc plated", 0.13, 0.20], ["MoS₂ / grease", 0.10, 0.16], ["Wax / PTFE", 0.08, 0.12],
];
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };

export default function BoltTorque() {
  const [bolt, setBolt] = useState("M8");
  const [boltMat, setBoltMat] = useState("Steel");
  const [grade, setGrade] = useState(1); // index into BOLT_MAT[boltMat]
  const [baseMat, setBaseMat] = useState("Aluminium");
  const [fr, setFr] = useState(0);
  const [mode, setMode] = useState("pct");
  const [pct, setPct] = useState("65");
  const [kN, setKN] = useState("20");

  const grades = BOLT_MAT[boltMat];
  const g = grades[Math.min(grade, grades.length - 1)];
  const [, Sp, RmBolt] = g;
  const RmBase = BASE_MAT.find((m) => m[0] === baseMat)[1];
  const b = BOLTS.find((x) => x[0] === bolt);
  const [, mu, K] = FRICTION[fr];
  const pickMat = (m) => { setBoltMat(m); setGrade(BOLT_MAT[m].length > 1 ? 1 : 0); };

  const r = useMemo(() => {
    const [, d, P, d2, As] = b;
    const F = mode === "pct" ? (numOr(pct) / 100) * Sp * As : numOr(kN) * 1000;
    const DKm = 1.3 * d;
    const Tp = F * 0.16 * P / 1000, Tth = F * 0.58 * d2 * mu / 1000, Th = F * 0.5 * DKm * mu / 1000;
    const T = Tp + Tth + Th, Tsimple = K * d * F / 1000;
    const sigma = F / As, util = sigma / Sp;
    const LeD = Math.max(0.8, 0.5 * (RmBolt / RmBase)); // ×d, first-order
    return { d, P, d2, As, F, DKm, Tp, Tth, Th, T, Tsimple, sigma, util, usefulShare: Tp / T, LeD, Le: LeD * d };
  }, [b, Sp, RmBolt, RmBase, mu, K, mode, pct, kN]);

  const u = r.util;
  const V = u > 0.9 ? { c: C.over, bg: C.overBg, t: "Over proof load" } : u > 0.75 ? { c: C.warn, bg: C.warnBg, t: "High preload" } : { c: C.ok, bg: C.okBg, t: "Within range" };
  const soft = RmBase < RmBolt * 0.5;
  const f1 = (v) => v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0);

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Bolt Tightening Torque</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Inputs" />
        <Panel>
          <Grid>
            <Field label="Bolt material"><select value={boltMat} onChange={(e) => pickMat(e.target.value)} style={sel}>{Object.keys(BOLT_MAT).map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label={boltMat === "Steel" ? "Property class" : "Grade"}><select value={grade} onChange={(e) => setGrade(+e.target.value)} style={sel} disabled={grades.length === 1}>{grades.map((x, i) => <option key={i} value={i}>{x[0]}</option>)}</select></Field>
            <Field label="Size (coarse)"><select value={bolt} onChange={(e) => setBolt(e.target.value)} style={sel}>{BOLTS.map((x) => <option key={x[0]} value={x[0]}>{x[0]} × {x[2]}</option>)}</select></Field>
            <Field label="Base material (threaded into)"><select value={baseMat} onChange={(e) => setBaseMat(e.target.value)} style={sel}>{BASE_MAT.map((m) => <option key={m[0]}>{m[0]}</option>)}</select></Field>
            <Field label="Friction condition"><select value={fr} onChange={(e) => setFr(+e.target.value)} style={sel}>{FRICTION.map((f, i) => <option key={i} value={i}>{f[0]} — µ {f[1].toFixed(2)}</option>)}</select></Field>
            <Field label="Clamping force">
              <div style={{ display: "flex", gap: 6 }}>
                <div className="mono" style={{ fontSize: 11, display: "inline-flex", borderRadius: 7, overflow: "hidden", border: `1px solid ${C.line}` }}>
                  {[["pct", "% proof"], ["force", "kN"]].map(([m, l]) => { const on = mode === m; return <button key={m} onClick={() => setMode(m)} style={{ padding: "0 9px", border: "none", cursor: "pointer", background: on ? C.accentBg : "#fff", color: on ? C.accent : C.faint }}>{l}</button>; })}
                </div>
                {mode === "pct"
                  ? <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" style={{ ...inp, width: 64 }} />
                  : <input value={kN} onChange={(e) => setKN(e.target.value)} inputMode="decimal" style={{ ...inp, width: 64 }} />}
              </div>
            </Field>
          </Grid>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12 }}>{boltMat} {g[0]}: proof {Sp} MPa, tensile {RmBolt} MPa · base {baseMat} ≈ {RmBase} MPa</div>
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 15, color: C.sub }}>Tighten to</span>
              <span className="mono" style={{ fontSize: 42, fontWeight: 650, color: C.accent, lineHeight: 1 }}>{f1(r.T)}</span>
              <span style={{ fontSize: 18, color: C.sub }}>N·m</span>
            </div>
            <div style={{ display: "flex", gap: 22 }}>
              <Mini label="clamping force" value={(r.F / 1000).toFixed(1)} unit="kN" />
              <Mini label="bolt stress" value={f1(r.sigma)} unit="MPa" />
              <Mini label="of proof" value={(u * 100).toFixed(0) + "%"} c={V.c} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.sub }}>Min. thread engagement into {baseMat}:</span>
            <span className="mono" style={{ fontSize: 15, color: C.ink, fontWeight: 600 }}>{r.LeD.toFixed(1)}·d ≈ {r.Le.toFixed(1)} mm</span>
            {soft && <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 6, padding: "4px 9px" }}><AlertTriangle size={11} /> soft base — round up; consider a threaded insert</span>}
          </div>
        </Panel>

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="Analysis" />
        <Panel title="Where the torque goes" hint="only the green part clamps">
          <div style={{ display: "flex", height: 26, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}` }}>
            <Seg w={r.Tp / r.T} c={C.pitch} /><Seg w={r.Tth / r.T} c={C.thread} /><Seg w={r.Th / r.T} c={C.head} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
            <Key c={C.pitch} label="Useful (clamping)" v={`${f1(r.Tp)} N·m · ${(r.Tp / r.T * 100).toFixed(0)}%`} />
            <Key c={C.thread} label="Thread friction" v={`${f1(r.Tth)} N·m · ${(r.Tth / r.T * 100).toFixed(0)}%`} />
            <Key c={C.head} label="Head friction" v={`${f1(r.Th)} N·m · ${(r.Th / r.T * 100).toFixed(0)}%`} />
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 12, lineHeight: 1.5, background: C.paper, borderRadius: 8, padding: "10px 12px" }}>
            Only about <b className="mono" style={{ color: C.pitch }}>{(r.usefulShare * 100).toFixed(0)}%</b> of your torque becomes clamping force — the rest is lost to friction. That’s why friction control matters more than torque precision.
          </div>
        </Panel>
        <Panel title="Preload vs bolt strength">
          <div style={{ position: "relative", height: 22, background: C.paper, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, u * 100)}%`, background: V.c, opacity: 0.85 }} />
            <div style={{ position: "absolute", left: "90%", top: 0, height: "100%", width: 2, background: C.over }} />
            <span className="mono" style={{ position: "absolute", left: 8, top: 3, fontSize: 12, color: u > 0.45 ? "#fff" : C.ink }}>{(u * 100).toFixed(0)}% of proof</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <span className="mono" style={{ fontSize: 11, color: V.c, background: V.bg, border: `1px solid ${V.c}44`, borderRadius: 6, padding: "4px 9px" }}>{V.t}</span>
            {u > 0.9 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.over }}><AlertTriangle size={13} /> exceeds proof — reduce target preload</span>}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: C.sub, marginTop: 14, lineHeight: 1.6 }}>
            Cross-check T = K·d·F (K {K.toFixed(2)}): {f1(r.Tsimple)} N·m vs model {f1(r.T)} N·m
          </div>
        </Panel>
        <div className="mono" style={{ fontSize: 10.5, color: C.faint, padding: "0 4px", lineHeight: 1.6 }}>
          T = F·(0.16·P + 0.58·d₂·µ + 0.5·D_Km·µ), VDI 2230 form · D_Km ≈ 1.3·d · engagement is a first-order strength-ratio estimate — verify for critical joints.
        </div>
      </div>
    </div>
  );
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", background: "#fff", textAlign: "center" };
const sel = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 8px", background: "#fff", width: "100%" };
function Step({ n, label }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 10px" }}>
    <span className="mono" style={{ width: 20, height: 20, borderRadius: 5, background: C.ink, color: "#fff", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
    <span className="mono" style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: C.sub, fontWeight: 600 }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: C.line }} />
  </div>);
}
function Panel({ title, hint, children }) {
  return (<div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px 18px", marginBottom: 16 }}>
    {title && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13, gap: 8 }}><div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div>{hint && <div className="mono" style={{ fontSize: 10, color: C.faint }}>{hint}</div>}</div>}
    {children}
  </div>);
}
function Grid({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>{children}</div>; }
function Field({ label, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}</label>); }
function Mini({ label, value, unit, c }) { return (<div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 19, fontWeight: 600, color: c || C.ink, lineHeight: 1 }}>{value}{unit && <span style={{ fontSize: 11, color: C.faint, marginLeft: 3 }}>{unit}</span>}</div></div>); }
function Seg({ w, c }) { return <div style={{ width: `${w * 100}%`, background: c, opacity: 0.85 }} />; }
function Key({ c, label, v }) { return (<div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} /><span style={{ fontSize: 12, color: C.sub }}>{label}</span><span className="mono" style={{ fontSize: 11.5, color: C.ink }}>{v}</span></div>); }
