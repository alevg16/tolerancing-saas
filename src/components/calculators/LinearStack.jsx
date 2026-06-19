"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Printer } from "lucide-react";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#0E5A6B", add: "#1F7A4D", sub2: "#B5862B", fail: "#B23A48",
  addBg: "#E8F2EC", failBg: "#F7E9EB", green: "#1F7A4D", greenBand: "#DCEEE3",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
const ncdf = (x, mu, sd) => (sd <= 0 ? (x >= mu ? 1 : 0) : 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2))));
const randn = () => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const fmt = (v, d = 3) => (v === null || !isFinite(v) ? "—" : Number(v).toFixed(d));
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };

const seed = [
  { id: 1, name: "Bore depth", nominal: "40.00", upper: "0.10", lower: "-0.10", dir: 1 },
  { id: 2, name: "Shoulder length", nominal: "20.00", upper: "0.05", lower: "-0.05", dir: -1 },
  { id: 3, name: "Shim thickness", nominal: "19.50", upper: "0.00", lower: "-0.08", dir: -1 },
];

/**
 * `initialState` seeds the inputs from a saved project; `onStateChange` reports
 * the serializable input state up so the project workspace can persist it.
 * With neither prop the module behaves exactly like the standalone tool.
 */
export default function LinearStack({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [dims, setDims] = useState(init?.dims ?? seed);
  const [resName, setResName] = useState(init?.resName ?? "Axial clearance");
  const [lsl, setLsl] = useState(init?.lsl ?? "0.35"), [usl, setUsl] = useState(init?.usl ?? "0.65");
  const [k, setK] = useState(init?.k ?? "3"), [dist, setDist] = useState(init?.dist ?? "normal");
  const [nid, setNid] = useState(init?.nid ?? (init?.dims ? Math.max(0, ...init.dims.map((d) => d.id)) + 1 : 4));

  useEffect(() => {
    onStateChange?.({ dims, resName, lsl, usl, k, dist, nid });
  }, [dims, resName, lsl, usl, k, dist, nid, onStateChange]);

  const add = () => { setDims([...dims, { id: nid, name: "New dimension", nominal: "0", upper: "0.05", lower: "-0.05", dir: 1 }]); setNid(nid + 1); };
  const del = (id) => setDims(dims.filter((d) => d.id !== id));
  const upd = (id, key, val) => setDims(dims.map((d) => (d.id === id ? { ...d, [key]: val } : d)));
  const flip = (id) => setDims(dims.map((d) => (d.id === id ? { ...d, dir: d.dir * -1 } : d)));

  const r = useMemo(() => {
    const kv = Math.max(0.0001, numOr(k, 3)), L = lsl === "" ? null : numOr(lsl), U = usl === "" ? null : numOr(usl);
    const parts = dims.map((d) => { const nom = numOr(d.nominal), up = numOr(d.upper), lo = numOr(d.lower); const half = Math.abs(up - lo) / 2, mean = nom + (up + lo) / 2, sd = half / kv; return { id: d.id, name: d.name, dir: d.dir, mean, half, sd, varc: sd * sd }; });
    const gMean = parts.reduce((s, p) => s + p.dir * p.mean, 0), wcHalf = parts.reduce((s, p) => s + p.half, 0);
    const varTot = parts.reduce((s, p) => s + p.varc, 0), sdRss = Math.sqrt(varTot);
    const cap = (sd) => { const yld = (U !== null ? ncdf(U, gMean, sd) : 1) - (L !== null ? ncdf(L, gMean, sd) : 0); const cpu = U !== null ? (U - gMean) / (3 * sd) : Infinity, cpl = L !== null ? (gMean - L) / (3 * sd) : Infinity; return { cpk: Math.min(cpu, cpl), yld, ppm: (1 - yld) * 1e6 }; };
    const inSpec = (U === null || gMean <= U) && (L === null || gMean >= L);
    const rss = sdRss > 0 ? cap(sdRss) : { cpk: Infinity, yld: inSpec ? 1 : 0, ppm: 0 };
    const n = 40000; let sum = 0, sq = 0, lo = Infinity, hi = -Infinity, ins = 0; const samp = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (const p of parts) s += p.dir * (dist === "normal" ? p.mean + p.sd * randn() : p.mean + (Math.random() * 2 - 1) * p.half); samp[i] = s; sum += s; sq += s * s; if (s < lo) lo = s; if (s > hi) hi = s; if ((L === null || s >= L) && (U === null || s <= U)) ins++; }
    const mcMean = sum / n, mcSd = Math.sqrt(Math.max(0, sq / n - mcMean * mcMean)), mcYld = ins / n;
    const bins = 40; if (lo === hi) { lo -= 0.5; hi += 0.5; } const bw = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, i) => ({ x: lo + bw * (i + 0.5), count: 0 }));
    for (let i = 0; i < n; i++) { let b = Math.floor((samp[i] - lo) / bw); if (b < 0) b = 0; if (b >= bins) b = bins - 1; hist[b].count++; }
    const contrib = parts.map((p) => ({ id: p.id, name: p.name, pct: varTot > 0 ? (p.varc / varTot) * 100 : 0 })).sort((a, b) => b.pct - a.pct);
    return { parts, gMean, wcMin: gMean - wcHalf, wcMax: gMean + wcHalf, sdRss, rss, mc: { mean: mcMean, sd: mcSd, yld: mcYld, lo, hi }, hist, contrib, L, U, kv, hasSpec: L !== null || U !== null };
  }, [dims, lsl, usl, k, dist]);

  const v = !r.hasSpec ? { label: "No spec set", color: C.faint } : r.rss.cpk >= 1.33 ? { label: "Capable", color: C.green } : r.rss.cpk >= 1.0 ? { label: "Marginal", color: C.sub2 } : { label: "Not capable", color: C.fail };
  const yp = (y) => (y == null ? "—" : y > 0.99995 ? (y * 100).toFixed(3) : (y * 100).toFixed(1));
  const top = r.contrib[0];

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Linear Gap · Tolerance Stack-Up</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Inputs" />
        <Panel title="The dimensions" hint="▶ adds · ◀ subtracts">
          <div style={{ marginBottom: 12 }}><input value={resName} onChange={(e) => setResName(e.target.value)} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 10px", width: "min(360px,90vw)", background: C.paper }} /></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ color: C.faint }}>{["#", "Name", "Nominal", "+ tol", "− tol", "", ""].map((h, i) => (<th key={i} style={{ textAlign: i >= 2 && i <= 4 ? "right" : "left", fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 500, padding: "0 7px 8px", whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>
                {dims.map((d, i) => (
                  <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="mono" style={{ color: C.faint, fontSize: 11, padding: "8px 7px" }}>{i + 1}</td>
                    <td style={{ padding: "6px 7px" }}><input value={d.name} onChange={(e) => upd(d.id, "name", e.target.value)} style={{ fontFamily: SANS, fontSize: 13, color: C.ink, border: "1px solid transparent", borderRadius: 6, padding: "5px 7px", width: 140, background: C.paper }} /></td>
                    <Num val={d.nominal} on={(x) => upd(d.id, "nominal", x)} />
                    <Num val={d.upper} on={(x) => upd(d.id, "upper", x)} tint={C.accent} />
                    <Num val={d.lower} on={(x) => upd(d.id, "lower", x)} tint={C.accent} />
                    <td style={{ padding: "6px 4px", textAlign: "center" }}><button onClick={() => flip(d.id)} title="adds or subtracts" style={{ width: 34, height: 28, borderRadius: 6, border: `1px solid ${C.line}`, background: d.dir > 0 ? C.addBg : C.failBg, color: d.dir > 0 ? C.add : C.fail, fontSize: 13, cursor: "pointer" }}>{d.dir > 0 ? "▶" : "◀"}</button></td>
                    <td style={{ padding: "6px 2px", textAlign: "center" }}><button onClick={() => del(d.id)} className="no-print" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={add} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: C.accent, background: "transparent", border: `1px dashed ${C.accent}66`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}><Plus size={14} /> Add dimension</button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Field label="Smallest OK (min)"><input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Largest OK (max)"><input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Tol = ± how many σ" hint="usually 3"><input value={k} onChange={(e) => setK(e.target.value)} style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Spread shape"><select value={dist} onChange={(e) => setDist(e.target.value)} style={{ ...sel, fontFamily: SANS }}><option value="normal">Bell curve</option><option value="uniform">Flat</option></select></Field>
          </div>
        </Panel>
        <Panel title="What each dimension is" hint="boxes stacked — adds vs subtracts">
          <StackSketch parts={r.parts} gMean={r.gMean} resName={resName} />
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 40, fontWeight: 650, color: v.color, lineHeight: 1 }}>{r.hasSpec ? yp(r.rss.yld) + "%" : "—"}</span>
            <span style={{ fontSize: 14, color: C.sub }}>of assemblies meet spec</span>
            {r.hasSpec && <span className="mono" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: v.color, background: v.color + "1A", border: `1px solid ${v.color}33`, borderRadius: 6, padding: "5px 10px" }}>{v.label}</span>}
            <span style={{ flex: 1 }} />
            <Mini label="Cpk" value={r.hasSpec ? (isFinite(r.rss.cpk) ? r.rss.cpk.toFixed(2) : "∞") : "—"} hint="≥1.33 healthy" />
            <Mini label="result" value={fmt(r.gMean)} hint={`± ${fmt(3 * r.sdRss)}`} />
          </div>
        </Panel>
        <Panel title="Does the result fit?" hint="spread vs allowed range">
          <FitGauge mean={r.mc.mean} sd={r.mc.sd} L={r.L} U={r.U} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>The <b style={{ color: C.ink }}>grey band</b> is where parts land (±3σ); the <b style={{ color: C.green }}>green zone</b> is your allowed range. Capable when grey sits inside green.</div>
        </Panel>

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="Analysis" />
        <Panel title="What drives the variation" hint="tighten from the top">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {r.contrib.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 132, fontSize: 12.5, color: i === 0 ? C.ink : C.sub, fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ flex: 1, height: 18, background: C.paper, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${c.pct}%`, height: "100%", background: i === 0 ? C.accent : "#9FB3B8", borderRadius: 4, transition: "width .25s" }} /></div>
                <div className="mono" style={{ width: 48, textAlign: "right", fontSize: 12.5, color: i === 0 ? C.accent : C.sub, fontWeight: i === 0 ? 700 : 400 }}>{c.pct.toFixed(0)}%</div>
              </div>
            ))}
          </div>
          {top && top.pct > 0 && <div style={{ marginTop: 13, fontSize: 12.5, color: C.sub, background: C.paper, borderRadius: 8, padding: "10px 12px", lineHeight: 1.5 }}>Tighten <b style={{ color: C.ink }}>{top.name}</b> first — it causes <b className="mono" style={{ color: C.accent }}>{top.pct.toFixed(0)}%</b> of the spread. Loosening the small ones costs almost nothing.</div>}
        </Panel>
        <Panel title="Distribution detail" hint="for the report">
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.7, marginBottom: 10 }}>
            <div>Statistical estimate <b className="mono" style={{ color: C.ink }}>{yp(r.rss.yld)}%</b> · Monte Carlo <b className="mono" style={{ color: C.ink }}>{yp(r.mc.yld)}%</b> in spec.</div>
            <div>Worst case — every part at its limit: <b className="mono" style={{ color: C.ink }}>{fmt(r.wcMin)} … {fmt(r.wcMax)}</b>.</div>
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.hist} margin={{ top: 14, right: 6, bottom: 0, left: 6 }}>
                <XAxis dataKey="x" type="number" domain={[r.mc.lo, r.mc.hi]} tick={{ fontSize: 9, fontFamily: MONO, fill: C.faint }} tickFormatter={(x) => x.toFixed(2)} tickCount={6} stroke={C.line} />
                <Tooltip cursor={{ fill: "#00000008" }} contentStyle={{ fontFamily: MONO, fontSize: 11, borderRadius: 8, border: `1px solid ${C.line}` }} formatter={(x) => [x.toLocaleString(), "parts"]} labelFormatter={(x) => "≈ " + Number(x).toFixed(3)} />
                <Bar dataKey="count" isAnimationActive={false}>{r.hist.map((b, i) => { const out = (r.L !== null && b.x < r.L) || (r.U !== null && b.x > r.U); return <Cell key={i} fill={out ? C.fail : C.green} fillOpacity={0.8} />; })}</Bar>
                {r.L !== null && <ReferenceLine x={r.L} stroke={C.fail} strokeDasharray="4 3" />}
                {r.U !== null && <ReferenceLine x={r.U} stroke={C.fail} strokeDasharray="4 3" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", background: "#fff" };
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
function Field({ label, hint, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 4 }}>{hint}</div>}</label>); }
function Num({ val, on, tint }) { return (<td style={{ padding: "6px 7px", textAlign: "right" }}><input value={val} onChange={(e) => on(e.target.value)} inputMode="decimal" style={{ fontFamily: MONO, fontSize: 13, color: tint || C.ink, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 7px", width: 64, background: "#fff" }} /></td>); }
function Mini({ label, value, hint }) { return (<div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{value}</div>{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{hint}</div>}</div>); }

function StackSketch({ parts, gMean, resName }) {
  const adds = parts.filter((p) => p.dir > 0), subs = parts.filter((p) => p.dir < 0);
  const sumAdd = adds.reduce((s, p) => s + p.mean, 0), sumSub = subs.reduce((s, p) => s + p.mean, 0);
  const maxSum = Math.max(sumAdd, sumSub, 0.001);
  const colW = 116, leftX = 96, rightX = 286, topPad = 50, Hpx = 180, baseY = topPad + Hpx, W = 498;
  const scale = Hpx / maxSum;
  const col = (items, x, color, bg) => {
    let y = baseY; const els = [];
    items.forEach((p) => {
      const h = Math.max(22, p.mean * scale);
      els.push(<g key={p.id}>
        <rect x={x} y={y - h} width={colW} height={h} fill={bg} stroke={color} strokeWidth="1.5" rx="2" />
        <text x={x + colW / 2} y={y - h / 2 - (h >= 34 ? 6 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={C.ink}>{p.name}</text>
        {h >= 34 && <text x={x + colW / 2} y={y - h / 2 + 9} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize="10" fill={color}>{fmt(p.mean, 2)}</text>}
      </g>);
      y -= h;
    });
    return { els, top: y };
  };
  const A = col(adds, leftX, C.add, C.addBg), S = col(subs, rightX, C.fail, C.failBg);
  const cx = (leftX + colW + rightX) / 2, tallTop = Math.min(A.top, S.top), shortTop = Math.max(A.top, S.top);
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${baseY + 30}`} width="100%" style={{ minWidth: 460, display: "block" }} fontFamily={SANS}>
        <text x={leftX + colW / 2} y={26} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.add}>Adds (+)</text>
        <text x={rightX + colW / 2} y={26} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.fail}>Subtracts (−)</text>
        {A.els}{S.els}
        <line x1={leftX - 14} y1={baseY} x2={rightX + colW + 14} y2={baseY} stroke={C.faint} strokeWidth="1.5" />
        <text x={leftX - 18} y={baseY + 4} textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.faint}>0</text>
        <line x1={leftX} y1={A.top} x2={cx} y2={A.top} stroke={C.add} strokeDasharray="3 3" strokeWidth="1" opacity="0.7" />
        <line x1={cx} y1={S.top} x2={rightX + colW} y2={S.top} stroke={C.fail} strokeDasharray="3 3" strokeWidth="1" opacity="0.7" />
        <line x1={cx} y1={tallTop} x2={cx} y2={shortTop} stroke={C.accent} strokeWidth="1.5" />
        <rect x={cx - 66} y={tallTop - 26} width="132" height="22" rx="5" fill={C.accent} opacity="0.12" />
        <text x={cx} y={tallTop - 11} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.accent}>{resName} = <tspan fontFamily={MONO}>{fmt(gMean, 2)}</tspan></text>
      </svg>
    </div>
  );
}

function FitGauge({ mean, sd, L, U }) {
  const W = 520, H = 70, pad = 44, trackY = 26, trackH = 22;
  const lo3 = mean - 3 * sd, hi3 = mean + 3 * sd; let lo = Math.min(L ?? lo3, lo3), hi = Math.max(U ?? hi3, hi3);
  const m = (hi - lo) * 0.14 || 1; lo -= m; hi += m; const X = (v) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
  const gx1 = X(L ?? lo - m), gx2 = X(U ?? hi + m), sx1 = X(lo3), sx2 = X(hi3), mx = X(mean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" fontFamily={SANS}>
      <rect x={pad} y={trackY} width={W - 2 * pad} height={trackH} rx="4" fill="#F0E5E6" />
      <rect x={gx1} y={trackY} width={Math.max(0, gx2 - gx1)} height={trackH} rx="4" fill={C.greenBand} />
      <rect x={sx1} y={trackY + 3} width={Math.max(2, sx2 - sx1)} height={trackH - 6} rx="3" fill={C.ink} opacity="0.55" />
      <line x1={mx} y1={trackY - 4} x2={mx} y2={trackY + trackH + 4} stroke={C.ink} strokeWidth="2" />
      <text x={mx} y={trackY - 8} fontFamily={MONO} fontSize="10" fill={C.ink} textAnchor="middle">μ {fmt(mean, 2)}</text>
      {L !== null && <><line x1={gx1} y1={trackY} x2={gx1} y2={trackY + trackH} stroke={C.fail} strokeWidth="1.5" /><text x={gx1} y={trackY + trackH + 14} fontFamily={MONO} fontSize="10" fill={C.fail} textAnchor="middle">{fmt(L, 2)}</text></>}
      {U !== null && <><line x1={gx2} y1={trackY} x2={gx2} y2={trackY + trackH} stroke={C.fail} strokeWidth="1.5" /><text x={gx2} y={trackY + trackH + 14} fontFamily={MONO} fontSize="10" fill={C.fail} textAnchor="middle">{fmt(U, 2)}</text></>}
    </svg>
  );
}
