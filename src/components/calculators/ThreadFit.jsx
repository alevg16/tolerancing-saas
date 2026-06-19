"use client";

import React, { useState, useMemo } from "react";
import { Printer, AlertTriangle } from "lucide-react";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", bolt: "#C0792B", nut: "#1C6E8C", boltBg: "#F6ECDD", nutBg: "#E5EEF2",
  clear: "#1F7A4D", warn: "#B5862B", warnBg: "#F7F1E2", clearBg: "#E8F2EC",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/* ---------- ISO 965 engine (µm, P & d in mm) ---------- */
const D2OFF = 0.649519, D1OFF = 1.082532;
const SIZES = { M3: [3, [0.5, 0.35]], M4: [4, [0.7, 0.5]], M5: [5, [0.8, 0.5]], M6: [6, [1.0, 0.75]], M8: [8, [1.25, 1.0]], M10: [10, [1.5, 1.25, 1.0]], M12: [12, [1.75, 1.5, 1.25]], M16: [16, [2.0, 1.5]], M20: [20, [2.5, 1.5]], M24: [24, [3.0, 2.0]] };
const EXTMULT = { 3: 0.5, 4: 0.63, 5: 0.8, 6: 1.0, 7: 1.25, 8: 1.6, 9: 2.0 };   // ext Td2 / Td grade factors
const INTMULT = { 4: 0.85, 5: 1.06, 6: 1.32, 7: 1.7, 8: 2.12 };                  // int TD2 factors (× ext Td2 grade-6 base)
const extES = (pos, P) => (pos === "h" ? 0 : pos === "g" ? -(15 + 11 * P) : pos === "f" ? -(30 + 11 * P) : -(50 + 11 * P));
const intEI = (pos, P) => (pos === "H" ? 0 : 15 + 11 * P);
const Td2base = (P, d) => 90 * P ** 0.4 * d ** 0.1;
const Tdbase = (P) => 180 * P ** (2 / 3) - 3.15 / Math.sqrt(P);

const EXT_POS = ["e", "f", "g", "h"], INT_POS = ["G", "H"];
const EXT_GRADES = [3, 4, 5, 6, 7, 8, 9], INT_GRADES = [4, 5, 6, 7, 8];

export default function ThreadFit() {
  const [size, setSize] = useState("M10");
  const [pitch, setPitch] = useState(1.5);
  const [eP, setEP] = useState("g"), [eG, setEG] = useState(6);
  const [iP, setIP] = useState("H"), [iG, setIG] = useState(6);

  const [d, pitches] = SIZES[size];
  const setSizeFix = (s) => { setSize(s); setPitch(SIZES[s][1][0]); };

  const r = useMemo(() => {
    const P = pitch;
    const d2b = d - D2OFF * P, d1b = d - D1OFF * P;
    const es = Math.round(extES(eP, P)), EI = Math.round(intEI(iP, P));
    const Td2 = Math.round(Td2base(P, d) * EXTMULT[eG]), Td = Math.round(Tdbase(P) * (EXTMULT[eG] || 1));
    const TD2 = Math.round(Td2base(P, d) * (INTMULT[iG] || 1.32));
    // bolt (external) limits, mm
    const d2max = d2b + es / 1000, d2min = d2max - Td2 / 1000;
    const dmax = d + es / 1000, dmin = dmax - Td / 1000;
    // nut (internal) limits, mm
    const D2min = d2b + EI / 1000, D2max = D2min + TD2 / 1000;
    const D1min = d1b + EI / 1000;
    const clrMin = EI - es, clrMax = EI - es + TD2 + Td2; // pitch-dia clearance, µm
    return { P, d2b, d1b, es, EI, Td2, Td, TD2, d2max, d2min, dmax, dmin, D2min, D2max, D1min, clrMin, clrMax };
  }, [d, pitch, eP, eG, iP, iG]);

  const lineToLine = r.clrMin <= 0;
  const um = (v) => (v >= 0 ? "+" : "") + Math.round(v);
  const mm = (v) => v.toFixed(3);

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.nut}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Thread Fit · ISO 965</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Inputs" />
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 14 }}>
            <Field label="Thread size"><select value={size} onChange={(e) => setSizeFix(e.target.value)} style={sel}>{Object.keys(SIZES).map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Pitch (mm)"><select value={pitch} onChange={(e) => setPitch(+e.target.value)} style={sel}>{pitches.map((p, i) => <option key={p} value={p}>{p}{i === 0 ? " (coarse)" : " (fine)"}</option>)}</select></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 14, marginTop: 10 }}>
            <ClassBox title="Bolt (external)" color={C.bolt} bg={C.boltBg} pos={eP} setPos={setEP} grade={eG} setGrade={setEG} positions={EXT_POS} grades={EXT_GRADES} code={`${eG}${eP}`} />
            <ClassBox title="Nut (internal)" color={C.nut} bg={C.nutBg} pos={iP} setPos={setIP} grade={iG} setGrade={setIG} positions={INT_POS} grades={INT_GRADES} code={`${iG}${iP}`} />
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Positions e–h (bolt) / G–H (nut) are the full standard set; grades 3–9 (ext) / 4–8 (int). Geometry &amp; fundamental deviations exact; tolerance grades from the ISO 965-1 formulae — verify vs tables for gauging / QC. (a–d coating positions: ISO 965-4/5.)</div>
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 650, color: lineToLine ? C.warn : C.clear }}>{lineToLine ? "Line-to-line fit" : "Clearance fit"}</span>
            <span className="mono" style={{ fontSize: 15, color: C.ink }}>pitch-Ø clearance {um(r.clrMin)} … {um(r.clrMax)} µm</span>
            <span className="mono" style={{ fontSize: 12, color: C.sub, background: C.paper, borderRadius: 6, padding: "4px 9px" }}>{size}×{r.P} · {eG}{eP}/{iG}{iP}</span>
            <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 6, padding: "4px 9px" }}><AlertTriangle size={11} /> tolerances: verify vs ISO 965-1</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 6, marginBottom: 16 }}>{lineToLine ? "No guaranteed clearance — the h/H positions sit on the basic size." : "The bolt thread is undersized relative to the nut, so it always assembles with a flank clearance."}</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <ThreadSketch />
            <div style={{ flex: 1, minWidth: 240 }}>
              <DimRow color={C.bolt} label="Bolt pitch Ø (d₂)" min={r.d2min} max={r.d2max} mm={mm} />
              <DimRow color={C.bolt} label="Bolt major Ø (d)" min={r.dmin} max={r.dmax} mm={mm} />
              <DimRow color={C.nut} label="Nut pitch Ø (D₂)" min={r.D2min} max={r.D2max} mm={mm} />
              <DimRow color={C.nut} label="Nut minor Ø (D₁)" min={r.D1min} max={null} mm={mm} note="min (tap drill ≥)" />
            </div>
          </div>
        </Panel>

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="Analysis" />
        <Panel title="Pitch-diameter tolerance zones" hint="bolt below basic, nut above → clearance">
          <ThreadZone es={r.es} ei={r.es - r.Td2} EI={r.EI} ES={r.EI + r.TD2} um={um} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>
            Deviations from the basic pitch diameter ({mm(r.d2b)} mm). The nut band sits above the line and the bolt band below — the gap between them is the clearance that lets the threads mate.
          </div>
        </Panel>
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
function Field({ label, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}</label>); }
function ClassBox({ title, color, bg, pos, setPos, grade, setGrade, positions, grades, code }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px 14px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 650, color, marginBottom: 11 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <Field label="Grade"><select value={grade} onChange={(e) => setGrade(+e.target.value)} style={{ ...sel, width: 64 }}>{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label="Position"><select value={pos} onChange={(e) => setPos(e.target.value)} style={{ ...sel, width: 64 }}>{positions.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <div className="mono" style={{ fontSize: 15, fontWeight: 600, color, paddingBottom: 7 }}>{code}</div>
      </div>
    </div>
  );
}
function DimRow({ color, label, min, max, mm, note }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
    <span style={{ fontSize: 12.5, color: C.ink, width: 132 }}>{label}</span>
    <span className="mono" style={{ fontSize: 12.5, color: C.sub }}>{mm(min)}{max !== null ? ` … ${mm(max)}` : ""} <span style={{ color: C.faint }}>{note || "mm"}</span></span>
  </div>);
}
function ThreadSketch() {
  // schematic 60° thread engagement (not to scale): nut teeth down, bolt teeth up, meshed with a gap
  const W = 150, H = 120, n = 4, p = 26, x0 = 14, baseY = 70, ht = 22;
  const tooth = (yTop, up) => { let d = ""; for (let i = 0; i < n; i++) { const x = x0 + i * p; const ya = up ? yTop : yTop, yb = up ? yTop - ht : yTop + ht; d += `M ${x} ${ya} L ${x + p / 2} ${yb} L ${x + p} ${ya} `; } return d; };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="140" height="112" fontFamily={SANS}>
      <rect x="6" y="14" width={W - 12} height="14" fill={C.nutBg} stroke={C.nut} strokeWidth="1.2" />
      <path d={tooth(28, false)} fill="none" stroke={C.nut} strokeWidth="1.6" />
      <path d={tooth(92, true)} fill="none" stroke={C.bolt} strokeWidth="1.6" />
      <rect x="6" y="92" width={W - 12} height="14" fill={C.boltBg} stroke={C.bolt} strokeWidth="1.2" />
      <line x1="4" y1={baseY} x2={W - 4} y2={baseY} stroke={C.faint} strokeDasharray="3 3" strokeWidth="1" />
      <text x={W - 6} y={baseY - 4} textAnchor="end" fontFamily={MONO} fontSize="8" fill={C.faint}>pitch Ø</text>
    </svg>
  );
}
function ThreadZone({ es, ei, EI, ES, um }) {
  const W = 460, H = 176, padL = 8, zx1 = 96, zw = 120, gap = 36;
  const vals = [es, ei, EI, ES, 0]; let vmax = Math.max(...vals), vmin = Math.min(...vals);
  const pad = Math.max(5, (vmax - vmin) * 0.3); vmax += pad; vmin -= pad;
  const Y = (v) => 20 + (1 - (v - vmin) / (vmax - vmin)) * (H - 44);
  const y0 = Y(0), step = niceStep((vmax - vmin) / 5), ticks = [];
  for (let t = Math.ceil(vmin / step) * step; t <= vmax; t += step) ticks.push(Math.round(t));
  const Zone = (x, top, bot, col, bg, label) => (
    <g>
      <rect x={x} y={Y(top)} width={zw} height={Math.max(2, Y(bot) - Y(top))} fill={bg} stroke={col} strokeWidth="1.6" rx="2" />
      <text x={x + zw / 2} y={Y(top) - 7} textAnchor="middle" fontSize="11" fill={col} fontWeight="600">{label}</text>
      <text x={x + zw + 6} y={Y(top) + 4} fontSize="10" fontFamily={MONO} fill={C.sub}>{um(top)}</text>
      <text x={x + zw + 6} y={Y(bot) + 4} fontSize="10" fontFamily={MONO} fill={C.sub}>{um(bot)}</text>
    </g>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: "block" }} fontFamily={SANS}>
        {ticks.map((t, i) => (<g key={i}><line x1={zx1 - 6} y1={Y(t)} x2={W - 10} y2={Y(t)} stroke="#F0F0EE" /><text x={padL} y={Y(t) + 3} fontSize="9" fontFamily={MONO} fill={C.faint}>{t > 0 ? "+" + t : t}</text></g>))}
        <line x1={zx1 - 6} y1={y0} x2={W - 10} y2={y0} stroke={C.faint} strokeDasharray="4 3" strokeWidth="1.2" />
        <text x={padL} y={y0 - 4} fontSize="9" fontFamily={MONO} fill={C.ink}>0</text>
        {Zone(zx1, EI > ES ? EI : ES, EI > ES ? ES : EI, C.nut, C.nutBg, "Nut")}
        {Zone(zx1 + zw + gap, es > ei ? es : ei, es > ei ? ei : es, C.bolt, C.boltBg, "Bolt")}
      </svg>
    </div>
  );
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, x)))); const f = x / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
