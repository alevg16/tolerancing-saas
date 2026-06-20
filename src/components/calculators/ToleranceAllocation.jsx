"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Printer, AlertTriangle } from "lucide-react";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#0E5A6B", add: "#1F7A4D", fail: "#B23A48", warn: "#B5862B",
  addBg: "#E8F2EC", failBg: "#F7E9EB", warnBg: "#F7F1E2", okBg: "#E8F2EC", ok: "#1F7A4D",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 3) => (v === null || !isFinite(v) ? "—" : Number(v).toFixed(d));

const seed = [
  { id: 1, name: "Bore depth", nominal: "40.00", dir: 1, weight: "1" },
  { id: 2, name: "Shoulder length", nominal: "20.00", dir: -1, weight: "1.5" },
  { id: 3, name: "Shim thickness", nominal: "19.50", dir: -1, weight: "0.6" },
];

/**
 * Tolerance allocation — the inverse of the stack-up. Given a required
 * assembly tolerance and target capability, budget a ± tolerance to every
 * contributing dimension, weighted by how hard each is to hold.
 * `initialState` / `onStateChange` make it persistable like the stack module.
 */
export default function ToleranceAllocation({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [dims, setDims] = useState(init?.dims ?? seed);
  const [resName, setResName] = useState(init?.resName ?? "Axial clearance");
  const [resNominal, setResNominal] = useState(init?.resNominal ?? "0.50");
  const [resTol, setResTol] = useState(init?.resTol ?? "0.15");
  const [method, setMethod] = useState(init?.method ?? "rss");
  const [cpk, setCpk] = useState(init?.cpk ?? "1.33");
  const [nid, setNid] = useState(init?.nid ?? (init?.dims ? Math.max(0, ...init.dims.map((d) => d.id)) + 1 : 4));

  useEffect(() => {
    onStateChange?.({ dims, resName, resNominal, resTol, method, cpk, nid });
  }, [dims, resName, resNominal, resTol, method, cpk, nid, onStateChange]);

  const add = () => { setDims([...dims, { id: nid, name: "New dimension", nominal: "10.00", dir: 1, weight: "1" }]); setNid(nid + 1); };
  const del = (id) => setDims(dims.filter((d) => d.id !== id));
  const upd = (id, key, val) => setDims(dims.map((d) => (d.id === id ? { ...d, [key]: val } : d)));
  const flip = (id) => setDims(dims.map((d) => (d.id === id ? { ...d, dir: d.dir * -1 } : d)));

  const r = useMemo(() => {
    const parts = dims.map((d) => ({ id: d.id, name: d.name, nominal: numOr(d.nominal), dir: d.dir, w: Math.max(0, numOr(d.weight, 1)) }));
    const gNominal = parts.reduce((s, p) => s + p.dir * p.nominal, 0);
    const T = Math.abs(numOr(resTol));                 // required assembly half-tolerance (budget)
    const k = Math.max(0.1, numOr(cpk, 1.33));         // target Cpk for the statistical method
    const sumW = parts.reduce((s, p) => s + p.w, 0) || 1;
    const sumW2 = parts.reduce((s, p) => s + p.w * p.w, 0) || 1;
    const rssBudget = T / k;                           // target of sqrt(Σ tᵢ²) so the assembly hits Cpk
    const alloc = parts.map((p) => {
      const tiWC = T * (p.w / sumW);                   // worst-case: Σ tᵢ = T
      const tiRSS = rssBudget * (p.w / Math.sqrt(sumW2)); // statistical: sqrt(Σ tᵢ²) = T/Cpk
      const ti = method === "wc" ? tiWC : tiRSS;
      return { ...p, tiWC, tiRSS, ti };
    });
    const sumTiWC = alloc.reduce((s, a) => s + a.tiWC, 0);   // = T
    const sumTiRSS = alloc.reduce((s, a) => s + a.tiRSS, 0); // worst-case spread if built to RSS tols
    const totUsed = method === "wc" ? sumTiWC : sumTiRSS;
    const rssTi = Math.sqrt(alloc.reduce((s, a) => s + a.ti * a.ti, 0)); // 3σ assembly spread for chosen tols
    const sigmaAsm = rssTi / 3;
    const cpkResult = sigmaAsm > 0 ? T / (3 * sigmaAsm) : Infinity;
    const yieldStat = sigmaAsm > 0 ? 2 * phi(T / sigmaAsm) - 1 : 1;
    // statistical vs worst-case: how much looser the budget runs for the same spec
    const looser = sumTiWC > 0 ? sumTiRSS / sumTiWC - 1 : 0;
    const maxTi = Math.max(...alloc.map((a) => a.ti), 1e-9);
    const closes = Math.abs(gNominal - numOr(resNominal)) < 1e-6;
    return { alloc, gNominal, T, k, totUsed, rssTi, cpkResult, yieldStat, looser, maxTi, closes, sumTiWC, sumTiRSS };
  }, [dims, resNominal, resTol, method, cpk]);

  const isWC = method === "wc";
  const yp = (y) => (y > 0.99995 ? (y * 100).toFixed(3) : (y * 100).toFixed(1));

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Tolerance Allocation · budget a stack</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="The requirement" />
        <Panel title="What the assembly must hold" hint="the spec you must hit">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14 }}>
            <Field label="Characteristic"><input value={resName} onChange={(e) => setResName(e.target.value)} style={{ ...inp, fontFamily: SANS, width: "100%", textAlign: "left" }} /></Field>
            <Field label="Target nominal"><input value={resNominal} onChange={(e) => setResNominal(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Allowed ± (budget)"><input value={resTol} onChange={(e) => setResTol(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Method">
              <div className="mono" style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: `1px solid ${C.line}` }}>
                {[["wc", "Worst-case"], ["rss", "Statistical"]].map(([m, l]) => { const on = method === m; return <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, padding: "8px 4px", fontSize: 12, border: "none", cursor: "pointer", background: on ? C.accent : "#fff", color: on ? "#fff" : C.faint }}>{l}</button>; })}
              </div>
            </Field>
            {!isWC && <Field label="Target Cpk" hint="1.33 = healthy"><input value={cpk} onChange={(e) => setCpk(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
          </div>
          {!r.closes && (
            <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 6, padding: "5px 10px" }}>
              <AlertTriangle size={12} /> nominals sum to {fmt(r.gNominal, 2)}, not your target {fmt(numOr(resNominal), 2)} — the dimensions don&apos;t close
            </div>
          )}
        </Panel>

        <Step n="2" label="The dimensions" />
        <Panel title="What stacks up" hint="weight = how hard to hold tight">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ color: C.faint }}>{["#", "Name", "Nominal", "± / −", "Difficulty", "", ""].map((h, i) => (<th key={i} style={{ textAlign: i >= 2 && i <= 2 ? "right" : "left", fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 500, padding: "0 7px 8px", whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>
                {dims.map((d, i) => (
                  <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="mono" style={{ color: C.faint, fontSize: 11, padding: "8px 7px" }}>{i + 1}</td>
                    <td style={{ padding: "6px 7px" }}><input value={d.name} onChange={(e) => upd(d.id, "name", e.target.value)} style={{ fontFamily: SANS, fontSize: 13, color: C.ink, border: "1px solid transparent", borderRadius: 6, padding: "5px 7px", width: 150, background: C.paper }} /></td>
                    <Num val={d.nominal} on={(x) => upd(d.id, "nominal", x)} />
                    <td style={{ padding: "6px 4px", textAlign: "center" }}><button onClick={() => flip(d.id)} title="adds or subtracts" style={{ width: 34, height: 28, borderRadius: 6, border: `1px solid ${C.line}`, background: d.dir > 0 ? C.addBg : C.failBg, color: d.dir > 0 ? C.add : C.fail, fontSize: 13, cursor: "pointer" }}>{d.dir > 0 ? "▶" : "◀"}</button></td>
                    <td style={{ padding: "6px 7px", textAlign: "center" }}><input value={d.weight} onChange={(e) => upd(d.id, "weight", e.target.value)} inputMode="decimal" style={{ fontFamily: MONO, fontSize: 13, color: C.accent, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 7px", width: 60, background: "#fff" }} /></td>
                    <td className="mono" style={{ fontSize: 11, color: C.faint, padding: "6px 7px", textAlign: "right", whiteSpace: "nowrap" }}>→ ±{fmt(r.alloc[i]?.ti)}</td>
                    <td style={{ padding: "6px 2px", textAlign: "center" }}><button onClick={() => del(d.id)} className="no-print" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={add} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: C.accent, background: "transparent", border: `1px dashed ${C.accent}66`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}><Plus size={14} /> Add dimension</button>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>Difficulty is a relative weight — a part that&apos;s expensive or hard to hold tight gets a larger share of the tolerance budget. Equal weights → equal split.</div>
        </Panel>

        <Panel title="How it stacks up" hint="parts → the required window">
          <AllocationSketch parts={r.alloc} gNominal={r.gNominal} T={r.T} resName={resName} resNominal={numOr(resNominal)} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>
            Each block is one of your dimensions — the <b>left column adds</b> to the gap, the <b>right subtracts</b> — and each shows the <b style={{ color: C.accent }}>± tolerance it was just allocated</b>. Stacked together they must land inside the <b style={{ color: C.ok }}>green window</b>: the ±{fmt(r.T)} you allow on {resName}. Flip the method above and watch the allocated tolerances change.
          </div>
        </Panel>

        {/* ===== RESULT ===== */}
        <Step n="3" label="Allocated tolerances" />
        <Panel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <span className="mono" style={{ fontSize: 22, fontWeight: 650, color: C.accent }}>{resName} = {fmt(numOr(resNominal), 2)} ± {fmt(r.T)}</span>
            <span className="mono" style={{ fontSize: 12, color: C.sub, background: C.paper, borderRadius: 6, padding: "4px 9px" }}>{isWC ? "worst-case" : `statistical · Cpk ${fmt(r.k, 2)}`}</span>
            <span style={{ flex: 1 }} />
            <Mini label={isWC ? "guaranteed yield" : "predicted yield"} value={isWC ? "100%" : yp(r.yieldStat) + "%"} hint={isWC ? "every part within spec" : `Cpk ${fmt(r.cpkResult, 2)}`} />
          </div>
          {r.alloc.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 0" }}>
              <span style={{ width: 150, fontSize: 12.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
              <div style={{ flex: 1, height: 16, background: C.paper, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${(a.ti / r.maxTi) * 100}%`, height: "100%", background: C.accent, opacity: 0.85, borderRadius: 4, transition: "width .2s" }} /></div>
              <span className="mono" style={{ width: 150, textAlign: "right", fontSize: 12.5, color: C.sub }}>{fmt(a.nominal, 2)} ±{fmt(a.ti)}</span>
            </div>
          ))}
        </Panel>

        {/* ===== ANALYSIS ===== */}
        <Step n="4" label="Why statistical is cheaper" />
        <Panel>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12 }}>
            <Mini label="worst-case budget" value={`Σ ±${fmt(r.sumTiWC)}`} hint="all tolerances add" />
            <Mini label="statistical budget" value={`Σ ±${fmt(r.sumTiRSS)}`} hint="tolerances add in RSS" />
            <Mini label="looser by" value={`${(r.looser * 100).toFixed(0)}%`} c={r.looser > 0 ? C.ok : C.fail} hint="more tolerance, same spec" />
          </div>
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, background: C.paper, borderRadius: 8, padding: "10px 12px" }}>
            Because all parts rarely hit their limits at once, the <b style={{ color: C.accent }}>statistical</b> method gives every dimension about <b className="mono" style={{ color: C.ok }}>{(r.looser * 100).toFixed(0)}% more</b> tolerance than worst-case for the same {fmt(r.T)} assembly spec — at a predicted Cpk of <b className="mono">{fmt(r.cpkResult, 2)}</b>. Looser tolerances are cheaper to make, so this is where the money is. Use worst-case only when 100% interchangeability is mandatory.
          </div>
        </Panel>
      </div>
    </div>
  );
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", background: "#fff", textAlign: "center" };
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
function Field({ label, hint, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 4 }}>{hint}</div>}</label>); }
function Num({ val, on }) { return (<td style={{ padding: "6px 7px", textAlign: "right" }}><input value={val} onChange={(e) => on(e.target.value)} inputMode="decimal" style={{ fontFamily: MONO, fontSize: 13, color: C.ink, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 7px", width: 72, background: "#fff" }} /></td>); }
function Mini({ label, value, unit, hint, c }) { return (<div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: c || C.ink, lineHeight: 1 }}>{value}{unit && <span style={{ fontSize: 11, color: C.faint, marginLeft: 3 }}>{unit}</span>}</div>{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{hint}</div>}</div>); }

function AllocationSketch({ parts, gNominal, T, resName, resNominal }) {
  const adds = parts.filter((p) => p.dir > 0), subs = parts.filter((p) => p.dir < 0);
  const sumAdd = adds.reduce((s, p) => s + p.nominal, 0), sumSub = subs.reduce((s, p) => s + p.nominal, 0);
  const maxSum = Math.max(sumAdd, sumSub, 0.001);
  const colW = 124, leftX = 74, rightX = 302, topPad = 70, Hpx = 168, baseY = topPad + Hpx, W = 500;
  const scale = Hpx / maxSum;
  const cx = (leftX + colW + rightX) / 2;
  const col = (items, x, color, bg) => {
    let y = baseY; const els = [];
    items.forEach((p) => {
      const h = Math.max(26, p.nominal * scale);
      els.push(
        <g key={p.id}>
          <rect x={x} y={y - h} width={colW} height={h} fill={bg} stroke={color} strokeWidth="1.5" rx="2" />
          <text x={x + colW / 2} y={y - h / 2 - (h >= 42 ? 7 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={C.ink}>{p.name}</text>
          {h >= 42 && <text x={x + colW / 2} y={y - h / 2 + 9} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize="10" fill={color}>±{fmt(p.ti)}</text>}
        </g>
      );
      y -= h;
    });
    return { els, top: y };
  };
  const A = col(adds, leftX, C.accent, C.addBg), S = col(subs, rightX, C.warn, C.warnBg);
  const winW = 132, winX = cx - winW / 2, winY = 22, winH = 20;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${baseY + 26}`} width="100%" style={{ minWidth: 470, display: "block" }} fontFamily={SANS}>
        {/* required spec window */}
        <text x={cx} y={winY - 7} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.ok}>{resName} = {fmt(resNominal, 2)} ± {fmt(T)}</text>
        <rect x={winX} y={winY} width={winW} height={winH} rx="4" fill={C.okBg} stroke={C.ok} strokeWidth="1.4" />
        <line x1={cx} y1={winY - 3} x2={cx} y2={winY + winH + 3} stroke={C.ok} strokeWidth="1.1" strokeDasharray="2 2" />
        <text x={winX - 5} y={winY + winH / 2 + 4} textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.ok}>−{fmt(T)}</text>
        <text x={winX + winW + 5} y={winY + winH / 2 + 4} fontFamily={MONO} fontSize="9" fill={C.ok}>+{fmt(T)}</text>
        {/* connector */}
        <line x1={cx} y1={winY + winH + 3} x2={cx} y2={Math.min(A.top, S.top, baseY) - 4} stroke={C.line} strokeWidth="1.2" strokeDasharray="3 3" />
        {/* column headers */}
        <text x={leftX + colW / 2} y={topPad - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.accent}>Adds (+)</text>
        <text x={rightX + colW / 2} y={topPad - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.warn}>Subtracts (−)</text>
        {A.els}{S.els}
        <line x1={leftX - 12} y1={baseY} x2={rightX + colW + 12} y2={baseY} stroke={C.faint} strokeWidth="1.5" />
        <text x={leftX - 16} y={baseY + 4} textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.faint}>0</text>
      </svg>
    </div>
  );
}
