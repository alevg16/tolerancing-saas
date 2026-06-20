"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, ReferenceLine, ReferenceArea, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Printer, Thermometer } from "lucide-react";
import { analyzeThermalStack, cteToAlphaPerK } from "@/lib/thermalStack";
import { MATERIALS } from "@/lib/thermalFit";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#0E5A6B", add: "#1F7A4D", warn: "#B5862B", fail: "#B23A48",
  addBg: "#E8F2EC", failBg: "#F7E9EB", green: "#1F7A4D", greenBand: "#DCEEE3", hot: "#C0792B", hotBg: "#F6ECDD",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const fmt = (v, d = 3) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };

const seed = [
  { id: 1, name: "Aluminium frame", nominal: "200.00", upper: "0.10", lower: "-0.10", dir: 1, matId: "al-6082-t6", cte: "23.4" },
  { id: 2, name: "Steel scale", nominal: "199.80", upper: "0.05", lower: "-0.05", dir: -1, matId: "steel-mild", cte: "11.7" },
];

/**
 * Thermal stack-up: a 1-D gap whose dimensions are on different materials, so
 * the gap drifts with temperature (differential expansion). Reuses the verified
 * thermalFit expansion math. Persistable via initialState/onStateChange.
 */
export default function ThermalStack({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [dims, setDims] = useState(init?.dims ?? seed);
  const [resName, setResName] = useState(init?.resName ?? "Gap at temperature");
  const [temp, setTemp] = useState(init?.temp ?? "50");
  const [lsl, setLsl] = useState(init?.lsl ?? "0.00"), [usl, setUsl] = useState(init?.usl ?? "0.50");
  const [k, setK] = useState(init?.k ?? "3");
  const [nid, setNid] = useState(init?.nid ?? (init?.dims ? Math.max(0, ...init.dims.map((d) => d.id)) + 1 : 3));

  useEffect(() => {
    onStateChange?.({ dims, resName, temp, lsl, usl, k, nid });
  }, [dims, resName, temp, lsl, usl, k, nid, onStateChange]);

  const add = () => { setDims([...dims, { id: nid, name: "New dimension", nominal: "10.00", upper: "0.05", lower: "-0.05", dir: 1, matId: "steel-mild", cte: "11.7" }]); setNid(nid + 1); };
  const del = (id) => setDims(dims.filter((d) => d.id !== id));
  const upd = (id, key, val) => setDims(dims.map((d) => (d.id === id ? { ...d, [key]: val } : d)));
  const flip = (id) => setDims(dims.map((d) => (d.id === id ? { ...d, dir: d.dir * -1 } : d)));
  const pickMat = (id, matId) => setDims(dims.map((d) => { if (d.id !== id) return d; const m = MATERIALS.find((x) => x.id === matId); return { ...d, matId, cte: m ? String(m.cteUmPerMK) : d.cte }; }));

  const r = useMemo(() => analyzeThermalStack({
    dims: dims.map((d) => ({ id: d.id, name: d.name, nominal: numOr(d.nominal), upper: numOr(d.upper), lower: numOr(d.lower), dir: d.dir, alphaPerK: cteToAlphaPerK(numOr(d.cte)) })),
    tempC: numOr(temp, 20), k: numOr(k, 3),
    lsl: lsl === "" ? null : numOr(lsl), usl: usl === "" ? null : numOr(usl),
  }), [dims, temp, lsl, usl, k]);

  const T = numOr(temp, 20);
  const chart = useMemo(() => {
    const lo = Math.min(20, T) - 60, hi = Math.max(20, T) + 60, n = 41, pts = [];
    for (let i = 0; i < n; i++) { const t = lo + ((hi - lo) * i) / (n - 1); const nom = r.gap20 + r.slopePerK * (t - 20); pts.push({ t, nom, band: [nom - r.wcHalf, nom + r.wcHalf] }); }
    return { pts, lo, hi };
  }, [r, T]);

  const v = !r.hasSpec ? { label: "No spec set", color: C.faint } : (r.inWindowAtT ? (r.rss.cpk >= 1.33 ? { label: "Capable at " + fmt(T, 0) + " °C", color: C.green } : r.rss.cpk >= 1.0 ? { label: "Marginal at " + fmt(T, 0) + " °C", color: C.warn } : { label: "Spread too wide", color: C.fail }) : { label: "Out of spec at " + fmt(T, 0) + " °C", color: C.fail });
  const yp = (y) => (y == null ? "—" : y > 0.99995 ? (y * 100).toFixed(3) : (y * 100).toFixed(1));
  const windowText = !r.hasSpec ? "set a spec to find the window"
    : Number.isNaN(r.tempWindowLow) ? "never in spec at any temperature"
    : `${r.tempWindowLow == null ? "−∞" : fmt(r.tempWindowLow, 0)} … ${r.tempWindowHigh == null ? "+∞" : fmt(r.tempWindowHigh, 0)} °C`;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Thermal Stack-Up · differential expansion</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Inputs" />
        <Panel title="The dimensions" hint="▶ adds · ◀ subtracts · each on its own material">
          <div style={{ marginBottom: 12 }}><input value={resName} onChange={(e) => setResName(e.target.value)} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 10px", width: "min(360px,90vw)", background: C.paper }} /></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ color: C.faint }}>{["#", "Name", "Nominal", "+ tol", "− tol", "Material", "α", "", ""].map((h, i) => (<th key={i} style={{ textAlign: i >= 2 && i <= 4 ? "right" : "left", fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 500, padding: "0 7px 8px", whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>
                {dims.map((d, i) => (
                  <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="mono" style={{ color: C.faint, fontSize: 11, padding: "8px 7px" }}>{i + 1}</td>
                    <td style={{ padding: "6px 7px" }}><input value={d.name} onChange={(e) => upd(d.id, "name", e.target.value)} style={{ fontFamily: SANS, fontSize: 13, color: C.ink, border: "1px solid transparent", borderRadius: 6, padding: "5px 7px", width: 120, background: C.paper }} /></td>
                    <Num val={d.nominal} on={(x) => upd(d.id, "nominal", x)} />
                    <Num val={d.upper} on={(x) => upd(d.id, "upper", x)} tint={C.accent} />
                    <Num val={d.lower} on={(x) => upd(d.id, "lower", x)} tint={C.accent} />
                    <td style={{ padding: "6px 7px" }}><select value={d.matId} onChange={(e) => pickMat(d.id, e.target.value)} style={{ fontFamily: SANS, fontSize: 12, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 6px", background: "#fff", maxWidth: 130 }}>{MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}<option value="custom">Custom…</option></select></td>
                    <td style={{ padding: "6px 5px", textAlign: "right" }}><input value={d.cte} onChange={(e) => upd(d.id, "cte", e.target.value)} inputMode="decimal" title="CTE µm/m·K" style={{ fontFamily: MONO, fontSize: 12, color: C.hot, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 6px", width: 50, background: "#fff" }} /></td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}><button onClick={() => flip(d.id)} title="adds or subtracts" style={{ width: 34, height: 28, borderRadius: 6, border: `1px solid ${C.line}`, background: d.dir > 0 ? C.addBg : C.failBg, color: d.dir > 0 ? C.add : C.fail, fontSize: 13, cursor: "pointer" }}>{d.dir > 0 ? "▶" : "◀"}</button></td>
                    <td style={{ padding: "6px 2px", textAlign: "center" }}><button onClick={() => del(d.id)} className="no-print" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={add} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: C.accent, background: "transparent", border: `1px dashed ${C.accent}66`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}><Plus size={14} /> Add dimension</button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 14, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Field label="Operating temp (°C)" hint="20 °C is the reference"><input value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%", color: C.hot }} /></Field>
            <Field label="Smallest OK (min)"><input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Largest OK (max)"><input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Tol = ± how many σ" hint="usually 3"><input value={k} onChange={(e) => setK(e.target.value)} style={{ ...inp, width: "100%" }} /></Field>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>α in µm/m·K (CTE). Nominal lengths expand with temperature; tolerances are kept at their 20 °C values (their thermal scaling is sub-micron). Same material everywhere → no drift.</div>
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{resName} at {fmt(T, 0)} °C</div>
              <div className="mono" style={{ fontSize: 34, fontWeight: 650, color: v.color, lineHeight: 1 }}>{fmt(r.gapT)}</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: r.shift >= 0 ? C.add : C.fail, background: r.shift >= 0 ? C.addBg : C.failBg, borderRadius: 8, padding: "7px 11px" }}>
              <Thermometer size={14} />{r.shift >= 0 ? "+" : ""}{fmt(r.shift * 1000, 0)} µm vs 20 °C
            </div>
            {r.hasSpec && <span className="mono" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: v.color, background: v.color + "1A", border: `1px solid ${v.color}33`, borderRadius: 6, padding: "5px 10px" }}>{v.label}</span>}
            <span style={{ flex: 1 }} />
            <Mini label="at 20 °C" value={fmt(r.gap20)} />
            <Mini label={r.hasSpec ? "yield @ T" : "Cpk"} value={r.hasSpec ? yp(r.rss.yield) + "%" : "—"} hint={r.hasSpec ? `Cpk ${isFinite(r.rss.cpk) ? r.rss.cpk.toFixed(2) : "∞"}` : ""} />
          </div>
        </Panel>

        <Panel title="Operating-temperature window" hint="where the nominal gap stays in spec">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 22, fontWeight: 650, color: r.inWindowAtT ? C.green : C.fail }}>{windowText}</span>
            {r.hasSpec && !Number.isNaN(r.tempWindowLow) && <span style={{ fontSize: 12.5, color: C.sub }}>the gap drifts <b className="mono" style={{ color: C.hot }}>{fmt(r.slopePerK * 1000, 2)} µm/K</b> — {Math.abs(r.slopePerK) < 1e-9 ? "flat (same materials)" : r.slopePerK > 0 ? "opens as it heats" : "closes as it heats"}</span>}
          </div>
        </Panel>

        <Panel title="Gap vs temperature" hint="nominal ± worst-case · spec band · your temp">
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart.pts} margin={{ top: 10, right: 14, bottom: 4, left: 4 }}>
                <XAxis dataKey="t" type="number" domain={[chart.lo, chart.hi]} tick={{ fontSize: 9, fontFamily: MONO, fill: C.faint }} tickFormatter={(x) => x.toFixed(0)} tickCount={7} stroke={C.line} unit="°" />
                <YAxis tick={{ fontSize: 9, fontFamily: MONO, fill: C.faint }} tickFormatter={(x) => x.toFixed(2)} width={42} stroke={C.line} />
                {r.hasSpec && !Number.isNaN(r.tempWindowLow) && <ReferenceArea x1={r.tempWindowLow ?? chart.lo} x2={r.tempWindowHigh ?? chart.hi} fill={C.green} fillOpacity={0.07} />}
                <Area dataKey="band" stroke="none" fill={C.accent} fillOpacity={0.13} isAnimationActive={false} />
                <Line dataKey="nom" stroke={C.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                {lsl !== "" && <ReferenceLine y={numOr(lsl)} stroke={C.fail} strokeDasharray="4 3" />}
                {usl !== "" && <ReferenceLine y={numOr(usl)} stroke={C.fail} strokeDasharray="4 3" />}
                <ReferenceLine x={20} stroke={C.faint} strokeDasharray="2 2" label={{ value: "20°", fontSize: 9, fill: C.faint, position: "insideTopLeft" }} />
                <ReferenceLine x={T} stroke={C.hot} strokeWidth={1.5} label={{ value: `${fmt(T, 0)}°`, fontSize: 9, fill: C.hot, position: "insideTopRight" }} />
                <Tooltip cursor={{ stroke: C.line }} contentStyle={{ fontFamily: MONO, fontSize: 11, borderRadius: 8, border: `1px solid ${C.line}` }} formatter={(val, name) => [fmt(val), name === "nom" ? "gap" : name]} labelFormatter={(x) => `${Number(x).toFixed(0)} °C`} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>The <b style={{ color: C.accent }}>line</b> is the gap as temperature changes (band = worst-case tolerance); the <b style={{ color: C.green }}>green span</b> is the temperature window where it stays inside your <b style={{ color: C.fail }}>spec</b> limits. The <b style={{ color: C.hot }}>orange line</b> is your operating temperature.</div>
        </Panel>

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="What drives the drift" />
        <Panel title="Thermal shift by dimension" hint="bigger length × bigger α moves the gap more">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {r.contributions.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 130, fontSize: 12.5, color: i === 0 ? C.ink : C.sub, fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ flex: 1, height: 18, background: C.paper, borderRadius: 4, overflow: "hidden", position: "relative" }}><div style={{ position: "absolute", left: c.shift >= 0 ? "50%" : `${50 - c.shiftPct / 2}%`, width: `${c.shiftPct / 2}%`, height: "100%", background: c.shift >= 0 ? C.add : C.fail, opacity: 0.85 }} /><div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.faint }} /></div>
                <div className="mono" style={{ width: 78, textAlign: "right", fontSize: 12, color: c.shift >= 0 ? C.add : C.fail }}>{c.shift >= 0 ? "+" : ""}{fmt(c.shift * 1000, 0)} µm</div>
              </div>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>Right (green) opens the gap, left (red) closes it, from 20 °C to {fmt(T, 0)} °C. To stabilise the gap, match the materials on the adding and subtracting sides.</div>
        </Panel>

        <Panel title="Worst-case & statistical detail" hint="at the operating temperature">
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.7 }}>
            <div>Worst case at {fmt(T, 0)} °C — every part at its limit: <b className="mono" style={{ color: C.ink }}>{fmt(r.wcMin)} … {fmt(r.wcMax)}</b>.</div>
            <div>Statistical (RSS, ±{fmt(numOr(k), 0)}σ): mean <b className="mono" style={{ color: C.ink }}>{fmt(r.gapT)}</b> ± <b className="mono" style={{ color: C.ink }}>{fmt(3 * r.sdRss)}</b>{r.hasSpec ? <> · yield <b className="mono" style={{ color: C.ink }}>{yp(r.rss.yield)}%</b></> : null}.</div>
            {r.hasSpec && Number.isNaN(r.tempWindowLow) && <div style={{ color: C.fail }}>The gap never falls within spec — re-centre the nominal or widen the spec.</div>}
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
function Num({ val, on, tint }) { return (<td style={{ padding: "6px 7px", textAlign: "right" }}><input value={val} onChange={(e) => on(e.target.value)} inputMode="decimal" style={{ fontFamily: MONO, fontSize: 13, color: tint || C.ink, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 7px", width: 64, background: "#fff" }} /></td>); }
function Mini({ label, value, hint }) { return (<div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{value}</div>{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{hint}</div>}</div>); }
