"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Printer, Check, X } from "lucide-react";
import { analyzePattern, analyzeCallout, CHARACTERISTICS, characteristicById } from "@/lib/gdt";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#1C6E8C", accentBg: "#E5EEF2", datum: "#5C6066",
  ok: "#1F7A4D", okBg: "#E8F2EC", warn: "#B5862B", warnBg: "#F7F1E2", fail: "#B23A48", failBg: "#F7E9EB",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 3) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));
const MODS = ["RFS", "MMC", "LMC"];
const MODSYM = { RFS: "Ⓢ", MMC: "Ⓜ", LMC: "Ⓛ" };

const seedFeat = [
  { id: 1, name: "H1", x: "0", y: "0", dx: "0.06", dy: "0.08", tol: "0.25", mod: "MMC", ft: "internal", smin: "10.00", smax: "10.20", sact: "10.10" },
  { id: 2, name: "H2", x: "40", y: "0", dx: "0.12", dy: "-0.05", tol: "0.25", mod: "MMC", ft: "internal", smin: "10.00", smax: "10.20", sact: "10.05" },
  { id: 3, name: "H3", x: "40", y: "30", dx: "-0.10", dy: "0.16", tol: "0.25", mod: "MMC", ft: "internal", smin: "10.00", smax: "10.20", sact: "10.18" },
  { id: 4, name: "H4", x: "0", y: "30", dx: "0.05", dy: "0.22", tol: "0.25", mod: "MMC", ft: "internal", smin: "10.00", smax: "10.20", sact: "10.02" },
];
const seedCall = [
  { id: 1, name: "Datum face A", char: "flatness", tol: "0.05", mod: "RFS", hasSize: false, ft: "external", smin: "0", smax: "0", sact: "0", meas: "0.03" },
  { id: 2, name: "Bore ⟂ A", char: "perpendicularity", tol: "0.05", mod: "MMC", hasSize: true, ft: "internal", smin: "20.00", smax: "20.05", sact: "20.02", meas: "0.06" },
  { id: 3, name: "Journal runout", char: "circular_runout", tol: "0.02", mod: "RFS", hasSize: false, ft: "external", smin: "0", smax: "0", sact: "0", meas: "0.015" },
  { id: 4, name: "Top profile", char: "profile_surface", tol: "0.10", mod: "RFS", hasSize: false, ft: "external", smin: "0", smax: "0", sact: "0", meas: "0.07" },
];

/**
 * 2D GD&T feature analyzer. A located-feature pattern on a datum-frame canvas
 * plus a callout checker for profile / orientation / form / runout — each with
 * MMC/LMC bonus, virtual condition and pass/fail. Persistable.
 */
export default function GdtAnalyzer({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [feats, setFeats] = useState(init?.feats ?? seedFeat);
  const [calls, setCalls] = useState(init?.calls ?? seedCall);
  const [fid, setFid] = useState(init?.fid ?? 5);
  const [cid, setCid] = useState(init?.cid ?? 5);

  useEffect(() => { onStateChange?.({ feats, calls, fid, cid }); }, [feats, calls, fid, cid, onStateChange]);

  const addFeat = () => { setFeats([...feats, { id: fid, name: "H" + fid, x: "0", y: "0", dx: "0", dy: "0", tol: "0.25", mod: "MMC", ft: "internal", smin: "10.00", smax: "10.20", sact: "10.10" }]); setFid(fid + 1); };
  const delFeat = (id) => setFeats(feats.filter((f) => f.id !== id));
  const updFeat = (id, k, v) => setFeats(feats.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const addCall = () => { setCalls([...calls, { id: cid, name: "Callout " + cid, char: "position", tol: "0.1", mod: "RFS", hasSize: false, ft: "internal", smin: "10", smax: "10.1", sact: "10.05", meas: "0.05" }]); setCid(cid + 1); };
  const delCall = (id) => setCalls(calls.filter((c) => c.id !== id));
  const updCall = (id, k, v) => setCalls(calls.map((c) => (c.id === id ? { ...c, [k]: v } : c)));

  const pat = useMemo(() => analyzePattern(feats.map((f) => ({
    id: f.id, name: f.name, trueX: numOr(f.x), trueY: numOr(f.y), measDx: numOr(f.dx), measDy: numOr(f.dy),
    positionTol: numOr(f.tol), modifier: f.mod, featureType: f.ft, sizeMin: numOr(f.smin), sizeMax: numOr(f.smax), actualSize: numOr(f.sact),
  }))), [feats]);

  const callRes = useMemo(() => calls.map((c) => ({
    c, r: analyzeCallout({
      characteristic: c.char, tol: numOr(c.tol), modifier: c.mod, hasSizeFeature: c.hasSize,
      featureType: c.ft, sizeMin: numOr(c.smin), sizeMax: numOr(c.smax), actualSize: numOr(c.sact), measured: numOr(c.meas),
    }),
  })), [calls]);

  const callPass = callRes.filter((x) => x.r.pass).length;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>2D GD&amp;T · feature analyzer · ASME Y14.5</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== A — PATTERN ===== */}
        <Step n="1" label="Located features (position pattern)" />
        <Panel title="The pattern" hint="basic X/Y from the datum origin · Ⓜ gives bonus">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead><tr style={{ color: C.faint }}>{["Feature", "X", "Y", "ΔX", "ΔY", "Pos tol", "Mod", "Type", "size min/max/act", "→ Ø dev / zone", ""].map((h, i) => <th key={i} style={{ textAlign: "left", fontSize: 9.5, letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 500, padding: "0 6px 8px", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {feats.map((f, i) => {
                  const res = pat.features[i];
                  return (
                    <tr key={f.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "5px 6px" }}><input value={f.name} onChange={(e) => updFeat(f.id, "name", e.target.value)} style={nameInp} /></td>
                      <NumC v={f.x} on={(x) => updFeat(f.id, "x", x)} />
                      <NumC v={f.y} on={(x) => updFeat(f.id, "y", x)} />
                      <NumC v={f.dx} on={(x) => updFeat(f.id, "dx", x)} tint={C.accent} />
                      <NumC v={f.dy} on={(x) => updFeat(f.id, "dy", x)} tint={C.accent} />
                      <NumC v={f.tol} on={(x) => updFeat(f.id, "tol", x)} />
                      <td style={{ padding: "5px 4px" }}><Sel v={f.mod} on={(x) => updFeat(f.id, "mod", x)} opts={MODS.map((m) => [m, MODSYM[m]])} w={52} /></td>
                      <td style={{ padding: "5px 4px" }}><Sel v={f.ft} on={(x) => updFeat(f.id, "ft", x)} opts={[["internal", "hole"], ["external", "pin"]]} w={58} /></td>
                      <td style={{ padding: "5px 4px", whiteSpace: "nowrap" }}>
                        <input value={f.smin} onChange={(e) => updFeat(f.id, "smin", e.target.value)} style={miniInp} />/<input value={f.smax} onChange={(e) => updFeat(f.id, "smax", e.target.value)} style={miniInp} />/<input value={f.sact} onChange={(e) => updFeat(f.id, "sact", e.target.value)} style={{ ...miniInp, color: C.accent }} />
                      </td>
                      <td className="mono" style={{ padding: "5px 6px", whiteSpace: "nowrap", color: res?.pass ? C.ok : C.fail }}>{fmt(res?.deviation)} / {fmt(res?.totalTol)} {res?.pass ? "✓" : "✗"}</td>
                      <td style={{ padding: "5px 2px" }}><button onClick={() => delFeat(f.id)} className="no-print" style={delBtn}><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addFeat} className="no-print mono" style={addBtn}><Plus size={14} /> Add feature</button>
        </Panel>

        <Panel title="Feature map" hint={`datum frame · deviations magnified`}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <FeatureMap features={pat.features} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 650, color: pat.passCount === pat.total ? C.ok : C.fail, lineHeight: 1 }}>{pat.passCount}/{pat.total}</span>
                <span style={{ fontSize: 13, color: C.sub }}>features in position</span>
              </div>
              {pat.features.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <span style={{ width: 16, color: f.pass ? C.ok : C.fail, display: "inline-flex" }}>{f.pass ? <Check size={14} /> : <X size={14} />}</span>
                  <span style={{ width: 46, fontSize: 12.5, color: C.ink }}>{f.name}</span>
                  <div style={{ flex: 1, height: 12, background: C.paper, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(100, (f.totalTol > 0 ? f.deviation / f.totalTol : 1) * 100)}%`, height: "100%", background: f.pass ? C.ok : C.fail, opacity: 0.8 }} /></div>
                  <span className="mono" style={{ width: 96, textAlign: "right", fontSize: 11, color: C.sub }}>Ø{fmt(f.deviation)}/{fmt(f.totalTol)}</span>
                </div>
              ))}
              <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>Each green ring is a feature&apos;s position zone (stated + Ⓜ bonus); the dot is the measured axis. Deviations and zones are magnified together, so in-ring = in-tolerance.</div>
            </div>
          </div>
        </Panel>

        {/* ===== B — CALLOUTS ===== */}
        <Step n="2" label="Other callouts (profile · orientation · form · runout)" />
        <Panel title="Callout checker" hint="zone + bonus where legal → pass/fail">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead><tr style={{ color: C.faint }}>{["Callout", "Characteristic", "Tol", "Mod", "Feature of size", "Measured", "→ zone / result", ""].map((h, i) => <th key={i} style={{ textAlign: "left", fontSize: 9.5, letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 500, padding: "0 6px 8px", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {callRes.map(({ c, r }) => {
                  const def = characteristicById(c.char);
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${C.line}`, verticalAlign: "top" }}>
                      <td style={{ padding: "6px 6px" }}><input value={c.name} onChange={(e) => updCall(c.id, "name", e.target.value)} style={nameInp} /></td>
                      <td style={{ padding: "6px 4px" }}>
                        <Sel v={c.char} on={(x) => updCall(c.id, "char", x)} opts={CHARACTERISTICS.map((ch) => [ch.id, `${ch.symbol} ${ch.label}`])} w={150} sans />
                        <div className="mono" style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{def?.zone.replace(/_/g, " ")} · datum {def?.datum}</div>
                      </td>
                      <NumC v={c.tol} on={(x) => updCall(c.id, "tol", x)} />
                      <td style={{ padding: "6px 4px" }}>{def?.allowsModifier ? <Sel v={c.mod} on={(x) => updCall(c.id, "mod", x)} opts={MODS.map((m) => [m, MODSYM[m]])} w={52} /> : <span className="mono" style={{ fontSize: 11, color: C.faint }}>—</span>}</td>
                      <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>
                        {def?.allowsModifier ? (
                          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}>
                            <input type="checkbox" checked={c.hasSize} onChange={(e) => updCall(c.id, "hasSize", e.target.checked)} />
                            {c.hasSize && <>
                              <Sel v={c.ft} on={(x) => updCall(c.id, "ft", x)} opts={[["internal", "hole"], ["external", "pin"]]} w={52} />
                              <input value={c.smin} onChange={(e) => updCall(c.id, "smin", e.target.value)} style={miniInp} />/<input value={c.smax} onChange={(e) => updCall(c.id, "smax", e.target.value)} style={miniInp} />/<input value={c.sact} onChange={(e) => updCall(c.id, "sact", e.target.value)} style={{ ...miniInp, color: C.accent }} />
                            </>}
                          </label>
                        ) : <span className="mono" style={{ fontSize: 11, color: C.faint }}>n/a</span>}
                      </td>
                      <NumC v={c.meas} on={(x) => updCall(c.id, "meas", x)} tint={C.accent} />
                      <td className="mono" style={{ padding: "6px 6px", whiteSpace: "nowrap", color: r.pass ? C.ok : C.fail }}>
                        {fmt(r.deviation)} / {fmt(r.totalTol)} {r.pass ? "✓" : "✗"}
                        {r.bonusApplied && <span style={{ color: C.faint }}> (+{fmt(r.bonus)})</span>}
                        {r.virtualCondition != null && <div style={{ fontSize: 9.5, color: C.faint }}>VC Ø{fmt(r.virtualCondition)}</div>}
                      </td>
                      <td style={{ padding: "6px 2px" }}><button onClick={() => delCall(c.id)} className="no-print" style={delBtn}><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addCall} className="no-print mono" style={addBtn}><Plus size={14} /> Add callout</button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
            <span className="mono" style={{ fontSize: 13, color: callPass === callRes.length ? C.ok : C.fail }}>{callPass}/{callRes.length} callouts pass</span>
            <span className="mono" style={{ fontSize: 10.5, color: C.faint }}>· Ⓜ bonus applies only to position & orientation of a feature of size; form/profile/runout are RFS.</span>
          </div>
        </Panel>

        <div className="mono" style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.6, padding: "0 2px" }}>
          Zones follow ASME Y14.5 / ISO 1101: position is a Ø (diametral) cylinder; orientation/form are parallel-plane or radial bands; runout is full-indicator movement (FIM) about the datum axis. Enter each measured value in its zone&apos;s metric. Datum precedence and simultaneous requirements are not modelled — treat results per individual callout.
        </div>
      </div>
    </div>
  );
}

const nameInp = { fontFamily: SANS, fontSize: 12.5, color: C.ink, border: "1px solid transparent", borderRadius: 6, padding: "5px 6px", width: 96, background: C.paper };
const miniInp = { fontFamily: MONO, fontSize: 11, color: C.ink, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 3px", width: 46, background: "#fff" };
const delBtn = { border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: 4 };
const addBtn = { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: C.accent, background: "transparent", border: `1px dashed ${C.accent}66`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" };

function NumC({ v, on, tint }) { return (<td style={{ padding: "5px 4px" }}><input value={v} onChange={(e) => on(e.target.value)} inputMode="decimal" style={{ fontFamily: MONO, fontSize: 12, color: tint || C.ink, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 5px", width: 56, background: "#fff" }} /></td>); }
function Sel({ v, on, opts, w, sans }) { return (<select value={v} onChange={(e) => on(e.target.value)} style={{ fontFamily: sans ? SANS : MONO, fontSize: 11.5, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 4px", background: "#fff", width: w || 60 }}>{opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select>); }

function Step({ n, label }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 10px" }}>
    <span className="mono" style={{ width: 20, height: 20, borderRadius: 5, background: C.ink, color: "#fff", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
    <span className="mono" style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: C.sub, fontWeight: 600 }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: C.line }} />
  </div>);
}
function Panel({ title, hint, children }) {
  return (<div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px 18px", marginBottom: 16 }}>
    {(title || hint) && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13, gap: 8 }}>{title ? <div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div> : <span />}{hint && <div className="mono" style={{ fontSize: 10, color: C.faint }}>{hint}</div>}</div>}
    {children}
  </div>);
}

function FeatureMap({ features }) {
  const S = 260, H = 220;
  if (!features.length) return <svg viewBox={`0 0 ${S} ${H}`} width={S} height={H} />;
  const xs = features.map((f) => f.trueX), ys = features.map((f) => f.trueY);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 40, spanY = maxY - minY || 40;
  const span = Math.max(spanX, spanY);
  const maxTot = Math.max(0.001, ...features.map((f) => f.totalTol));
  const mag = Math.max(1, Math.min(8000, (0.10 * span) / (maxTot / 2)));
  const margin = Math.max(span * 0.18, (maxTot / 2) * mag * 1.4, 6);
  minX -= margin; maxX += margin; minY -= margin; maxY += margin;
  const padL = 30, padB = 28, padT = 12, padR = 14;
  const pw = maxX - minX, ph = maxY - minY;
  const sc = Math.min((S - padL - padR) / pw, (H - padT - padB) / ph);
  const ox = padL + ((S - padL - padR) - pw * sc) / 2;
  const oy = padT + ((H - padT - padB) - ph * sc) / 2;
  const px = (x) => ox + (x - minX) * sc;
  const py = (y) => oy + (maxY - y) * sc;
  return (
    <div>
      <svg viewBox={`0 0 ${S} ${H}`} width={S} height={H} fontFamily={SANS}>
        {/* part outline */}
        <rect x={px(minX)} y={py(maxY)} width={pw * sc} height={ph * sc} fill="#FBFBFA" stroke={C.line} strokeWidth="1" rx="3" />
        {/* datums */}
        <line x1={px(minX)} y1={py(minY)} x2={px(maxX)} y2={py(minY)} stroke={C.datum} strokeWidth="1.6" />
        <line x1={px(minX)} y1={py(minY)} x2={px(minX)} y2={py(maxY)} stroke={C.datum} strokeWidth="1.6" />
        <DatumTag x={px((minX + maxX) / 2)} y={py(minY) + 16} t="A" />
        <DatumTag x={px(minX) - 16} y={py((minY + maxY) / 2)} t="B" />
        {features.map((f) => {
          const cx = px(f.trueX), cy = py(f.trueY);
          const zr = (f.totalTol / 2) * mag * sc;
          const mx = px(f.trueX + f.measDx * mag), my = py(f.trueY + f.measDy * mag);
          const col = f.pass ? C.ok : C.fail;
          return (
            <g key={f.id}>
              <circle cx={cx} cy={cy} r={Math.max(3, zr)} fill={f.pass ? C.okBg : C.failBg} stroke={col} strokeWidth="1.4" />
              <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke={C.ink} strokeWidth="0.8" />
              <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke={C.ink} strokeWidth="0.8" />
              <line x1={cx} y1={cy} x2={mx} y2={my} stroke={col} strokeWidth="1" />
              <circle cx={mx} cy={my} r="2.6" fill={col} stroke="#fff" strokeWidth="0.8" />
              <text x={cx} y={cy - Math.max(3, zr) - 3} textAnchor="middle" fontSize="8.5" fill={C.sub}>{f.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="mono" style={{ fontSize: 9.5, color: C.faint, textAlign: "center", marginTop: -2 }}>datum A ▸ bottom · B ▸ left · deviations ×{Math.round(mag)}</div>
    </div>
  );
}
function DatumTag({ x, y, t }) {
  return (<g><rect x={x - 8} y={y - 8} width="16" height="16" rx="2" fill="#fff" stroke={C.datum} strokeWidth="1" /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.datum} fontFamily={MONO}>{t}</text></g>);
}
