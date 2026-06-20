"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Printer } from "lucide-react";
import { analyzeGdtStack, contributorHalf, CONTRIB_TYPES, contribTypeDef } from "@/lib/gdtStack";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#0E5A6B", add: "#1F7A4D", fail: "#B23A48", warn: "#B5862B",
  addBg: "#E8F2EC", failBg: "#F7E9EB", okBg: "#E8F2EC", ok: "#1F7A4D", greenBand: "#DCEEE3",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 3) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));

const TYPE_COLOR = { size: "#0E5A6B", position: "#6D4C9F", profile: "#C0792B", orientation: "#1C6E8C", flatness: "#1F7A4D", runout: "#B23A48" };

const seed = [
  { id: 1, name: "Bore depth", type: "size", dir: 1, nominal: "40.00", upper: "0.10", lower: "-0.10", geoTol: "0.20", bonus: "0" },
  { id: 2, name: "Hole pattern position", type: "position", dir: -1, nominal: "20.00", upper: "0.05", lower: "-0.05", geoTol: "0.20", bonus: "0" },
  { id: 3, name: "Shoulder profile", type: "profile", dir: -1, nominal: "19.50", upper: "0.05", lower: "-0.05", geoTol: "0.10", bonus: "0" },
];

/**
 * GD&T-aware stack-up. Mix ± dimensions and geometric callouts (position,
 * profile, orientation, form, runout); each geometric tolerance converts to its
 * equivalent ± half and rolls into a worst-case / RSS gap. Persistable.
 */
export default function GdtStack({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [rows, setRows] = useState(init?.rows ?? seed);
  const [resName, setResName] = useState(init?.resName ?? "Assembly gap");
  const [lsl, setLsl] = useState(init?.lsl ?? "0.10"), [usl, setUsl] = useState(init?.usl ?? "0.90");
  const [k, setK] = useState(init?.k ?? "3");
  const [nid, setNid] = useState(init?.nid ?? (init?.rows ? Math.max(0, ...init.rows.map((d) => d.id)) + 1 : 4));

  useEffect(() => { onStateChange?.({ rows, resName, lsl, usl, k, nid }); }, [rows, resName, lsl, usl, k, nid, onStateChange]);

  const add = () => { setRows([...rows, { id: nid, name: "New contributor", type: "size", dir: 1, nominal: "10.00", upper: "0.05", lower: "-0.05", geoTol: "0.10", bonus: "0" }]); setNid(nid + 1); };
  const del = (id) => setRows(rows.filter((r) => r.id !== id));
  const upd = (id, key, val) => setRows(rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  const flip = (id) => setRows(rows.map((r) => (r.id === id ? { ...r, dir: r.dir * -1 } : r)));

  const contribs = useMemo(() => rows.map((r) => ({
    id: r.id, name: r.name, type: r.type, dir: r.dir,
    nominal: numOr(r.nominal), upper: numOr(r.upper), lower: numOr(r.lower), geoTol: numOr(r.geoTol), bonus: numOr(r.bonus),
  })), [rows]);

  const res = useMemo(() => analyzeGdtStack({
    contributors: contribs, k: numOr(k, 3), lsl: lsl === "" ? null : numOr(lsl), usl: usl === "" ? null : numOr(usl),
  }), [contribs, k, lsl, usl]);

  const halves = rows.map((_, i) => contributorHalf(contribs[i]));
  const maxHalf = Math.max(1e-9, ...halves);
  const v = !res.hasSpec ? { label: "No spec set", color: C.faint } : res.rss.cpk >= 1.33 ? { label: "Capable", color: C.ok } : res.rss.cpk >= 1.0 ? { label: "Marginal", color: C.warn } : { label: "Not capable", color: C.fail };
  const yp = (y) => (y == null ? "—" : y > 0.99995 ? (y * 100).toFixed(3) : (y * 100).toFixed(1));
  const geoCount = contribs.filter((c) => c.type !== "size").length;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>GD&amp;T-aware Stack-Up · ± + geometric</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Contributors" />
        <Panel title="What stacks up" hint="± dimensions and geometric callouts together">
          <div style={{ marginBottom: 12 }}><input value={resName} onChange={(e) => setResName(e.target.value)} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 10px", width: "min(360px,90vw)", background: C.paper }} /></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead><tr style={{ color: C.faint }}>{["Contributor", "Type", "+/−", "Nominal", "Tol / GD&T", "± equiv", "", ""].map((h, i) => <th key={i} style={{ textAlign: "left", fontSize: 9.5, letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 500, padding: "0 6px 8px", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const def = contribTypeDef(r.type);
                  const col = TYPE_COLOR[r.type] || C.accent;
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.line}`, verticalAlign: "middle" }}>
                      <td style={{ padding: "6px 6px" }}><input value={r.name} onChange={(e) => upd(r.id, "name", e.target.value)} style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink, border: "1px solid transparent", borderRadius: 6, padding: "5px 6px", width: 130, background: C.paper }} /></td>
                      <td style={{ padding: "6px 4px" }}><select value={r.type} onChange={(e) => upd(r.id, "type", e.target.value)} style={{ fontFamily: SANS, fontSize: 11.5, color: col, fontWeight: 600, border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 4px", background: "#fff", width: 120 }}>{CONTRIB_TYPES.map((t) => <option key={t.id} value={t.id}>{t.symbol} {t.label}</option>)}</select></td>
                      <td style={{ padding: "6px 4px", textAlign: "center" }}><button onClick={() => flip(r.id)} title="adds or subtracts" style={{ width: 32, height: 26, borderRadius: 6, border: `1px solid ${C.line}`, background: r.dir > 0 ? C.addBg : C.failBg, color: r.dir > 0 ? C.add : C.fail, fontSize: 12, cursor: "pointer" }}>{r.dir > 0 ? "▶" : "◀"}</button></td>
                      <td style={{ padding: "6px 4px" }}><input value={r.nominal} onChange={(e) => upd(r.id, "nominal", e.target.value)} inputMode="decimal" style={cellInp} /></td>
                      <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>
                        {r.type === "size" ? (
                          <span><input value={r.upper} onChange={(e) => upd(r.id, "upper", e.target.value)} inputMode="decimal" style={{ ...cellInp, color: C.accent }} title="upper" /> <input value={r.lower} onChange={(e) => upd(r.id, "lower", e.target.value)} inputMode="decimal" style={{ ...cellInp, color: C.accent }} title="lower" /></span>
                        ) : (
                          <span><input value={r.geoTol} onChange={(e) => upd(r.id, "geoTol", e.target.value)} inputMode="decimal" style={{ ...cellInp, color: col }} title="geometric tolerance" />{def.allowsBonus && <> +<input value={r.bonus} onChange={(e) => upd(r.id, "bonus", e.target.value)} inputMode="decimal" style={{ ...cellInp, width: 46 }} title="Ⓜ bonus (0 = worst case)" /></>}</span>
                        )}
                      </td>
                      <td className="mono" style={{ padding: "6px 6px", fontSize: 12, color: col, fontWeight: 600, whiteSpace: "nowrap" }}>±{fmt(halves[i])}</td>
                      <td style={{ padding: "6px 2px" }}><button onClick={() => del(r.id)} className="no-print" style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={add} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: C.accent, background: "transparent", border: `1px dashed ${C.accent}66`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}><Plus size={14} /> Add contributor</button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Field label="Smallest OK (min)"><input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Largest OK (max)"><input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder="none" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Tol = ± how many σ" hint="usually 3"><input value={k} onChange={(e) => setK(e.target.value)} style={{ ...inp, width: "100%" }} /></Field>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Each geometric callout converts to an equivalent ±: position &amp; orientation → ±(T+bonus)/2 (Ø zone); profile, form &amp; runout → ±T/2. Bonus 0 = worst-case (virtual condition). {geoCount} of {rows.length} contributors are GD&amp;T.</div>
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 34, fontWeight: 650, color: v.color, lineHeight: 1 }}>{res.hasSpec ? yp(res.rss.yield) + "%" : "—"}</span>
            <span style={{ fontSize: 14, color: C.sub }}>meet spec (statistical)</span>
            {res.hasSpec && <span className="mono" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: v.color, background: v.color + "1A", border: `1px solid ${v.color}33`, borderRadius: 6, padding: "5px 10px" }}>{v.label}</span>}
            <span style={{ flex: 1 }} />
            <Mini label="gap" value={fmt(res.gapNominal)} hint={`± ${fmt(3 * res.sdRss)} (3σ)`} />
            <Mini label="Cpk" value={res.hasSpec ? (isFinite(res.rss.cpk) ? res.rss.cpk.toFixed(2) : "∞") : "—"} hint="≥1.33 healthy" />
          </div>
          <FitGauge mean={res.gapNominal} sd={res.sdRss} L={lsl === "" ? null : numOr(lsl)} U={usl === "" ? null : numOr(usl)} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>Worst case (every contributor at its limit): <b className="mono" style={{ color: C.ink }}>{fmt(res.wcMin)} … {fmt(res.wcMax)}</b>. The grey band is ±3σ; the green zone is your allowed range.</div>
        </Panel>

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="What drives the variation" />
        <Panel title="Variance contribution" hint="tighten from the top — ± and GD&T compared fairly">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {res.contributions.map((c, i) => {
              const col = TYPE_COLOR[c.type] || C.accent;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 150, fontSize: 12.5, color: i === 0 ? C.ink : C.sub, fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contribTypeDef(c.type).symbol} {c.name}</div>
                  <div style={{ flex: 1, height: 16, background: C.paper, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${c.varPct}%`, height: "100%", background: col, opacity: 0.85, borderRadius: 4, transition: "width .25s" }} /></div>
                  <div className="mono" style={{ width: 46, textAlign: "right", fontSize: 12, color: col, fontWeight: i === 0 ? 700 : 400 }}>{c.varPct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Because every callout is reduced to an equivalent ±, GD&amp;T and dimensional tolerances are compared on the same footing — so you can see whether a position or profile callout, not a ± dimension, is really driving your stack.</div>
        </Panel>
      </div>
    </div>
  );
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", background: "#fff", textAlign: "center" };
const cellInp = { fontFamily: MONO, fontSize: 12, color: C.ink, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 5px", width: 58, background: "#fff" };
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
function Mini({ label, value, hint }) { return (<div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{value}</div>{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{hint}</div>}</div>); }

function FitGauge({ mean, sd, L, U }) {
  const W = 520, H = 64, pad = 44, trackY = 20, trackH = 22;
  const lo3 = mean - 3 * sd, hi3 = mean + 3 * sd;
  let lo = Math.min(L ?? lo3, lo3), hi = Math.max(U ?? hi3, hi3);
  const m = (hi - lo) * 0.14 || 1; lo -= m; hi += m;
  const X = (v) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
  const gx1 = X(L ?? lo - m), gx2 = X(U ?? hi + m), sx1 = X(lo3), sx2 = X(hi3), mx = X(mean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 12 }} fontFamily={SANS}>
      <rect x={pad} y={trackY} width={W - 2 * pad} height={trackH} rx="4" fill="#F0E5E6" />
      <rect x={gx1} y={trackY} width={Math.max(0, gx2 - gx1)} height={trackH} rx="4" fill={C.greenBand} />
      <rect x={sx1} y={trackY + 3} width={Math.max(2, sx2 - sx1)} height={trackH - 6} rx="3" fill={C.ink} opacity="0.55" />
      <line x1={mx} y1={trackY - 4} x2={mx} y2={trackY + trackH + 4} stroke={C.ink} strokeWidth="2" />
      <text x={mx} y={trackY - 7} fontFamily={MONO} fontSize="10" fill={C.ink} textAnchor="middle">μ {fmt(mean, 2)}</text>
      {L !== null && <><line x1={gx1} y1={trackY} x2={gx1} y2={trackY + trackH} stroke={C.fail} strokeWidth="1.5" /><text x={gx1} y={trackY + trackH + 13} fontFamily={MONO} fontSize="10" fill={C.fail} textAnchor="middle">{fmt(L, 2)}</text></>}
      {U !== null && <><line x1={gx2} y1={trackY} x2={gx2} y2={trackY + trackH} stroke={C.fail} strokeWidth="1.5" /><text x={gx2} y={trackY + trackH + 13} fontFamily={MONO} fontSize="10" fill={C.fail} textAnchor="middle">{fmt(U, 2)}</text></>}
    </svg>
  );
}
