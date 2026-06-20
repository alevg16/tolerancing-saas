"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Printer, AlertTriangle } from "lucide-react";
import {
  analyzePressFit,
  cteToAlphaPerK,
  PRESS_FIT_MATERIALS,
  pressFitMaterialById,
} from "@/lib/pressFit";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", hub: "#1C6E8C", shaft: "#C0792B", hubBg: "#E5EEF2", shaftBg: "#F6ECDD",
  ok: "#1F7A4D", okBg: "#E8F2EC", warn: "#B5862B", warnBg: "#F7F1E2", fail: "#B23A48", failBg: "#F7E9EB",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 0) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));

/** Verdict colour from the governing safety factor. */
function verdict(sf) {
  if (!isFinite(sf)) return { c: C.faint, t: "—", note: "no contact" };
  if (sf >= 1.5) return { c: C.ok, t: "Holds with margin", note: "elastic, comfortable" };
  if (sf >= 1.0) return { c: C.warn, t: "Holds — thin margin", note: "near yield at max interference" };
  return { c: C.fail, t: "Over-stressed", note: "yields at max interference" };
}

const MAT_DEFAULT = "steel-structural";

/**
 * Press / shrink fit (Lamé thick-wall cylinders). Contact pressure, hoop
 * stresses and yield safety factor over an interference range, plus grip
 * (force / torque) and shrink-fit assembly temperatures. Exact elastic
 * results — no estimates. `initialState` / `onStateChange` make it persistable.
 */
export default function PressFit({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [dFit, setDFit] = useState(init?.dFit ?? "50");
  const [dBore, setDBore] = useState(init?.dBore ?? "0");
  const [dOut, setDOut] = useState(init?.dOut ?? "100");
  const [iMin, setIMin] = useState(init?.iMin ?? "30");
  const [iMax, setIMax] = useState(init?.iMax ?? "50");
  const [length, setLength] = useState(init?.length ?? "40");
  const [mu, setMu] = useState(init?.mu ?? "0.12");
  const [clearance, setClearance] = useState(init?.clearance ?? "20");
  const [shaftMat, setShaftMat] = useState(init?.shaftMat ?? MAT_DEFAULT);
  const [hubMat, setHubMat] = useState(init?.hubMat ?? MAT_DEFAULT);
  const [shaftE, setShaftE] = useState(init?.shaftE ?? "207");
  const [shaftNu, setShaftNu] = useState(init?.shaftNu ?? "0.30");
  const [shaftSy, setShaftSy] = useState(init?.shaftSy ?? "250");
  const [shaftCte, setShaftCte] = useState(init?.shaftCte ?? "11.7");
  const [hubE, setHubE] = useState(init?.hubE ?? "207");
  const [hubNu, setHubNu] = useState(init?.hubNu ?? "0.30");
  const [hubSy, setHubSy] = useState(init?.hubSy ?? "250");
  const [hubCte, setHubCte] = useState(init?.hubCte ?? "11.7");

  useEffect(() => {
    onStateChange?.({
      dFit, dBore, dOut, iMin, iMax, length, mu, clearance,
      shaftMat, hubMat, shaftE, shaftNu, shaftSy, shaftCte, hubE, hubNu, hubSy, hubCte,
    });
  }, [dFit, dBore, dOut, iMin, iMax, length, mu, clearance, shaftMat, hubMat,
    shaftE, shaftNu, shaftSy, shaftCte, hubE, hubNu, hubSy, hubCte, onStateChange]);

  const pickShaft = (id) => { setShaftMat(id); const m = pressFitMaterialById(id); if (m) { setShaftE(String(m.E)); setShaftNu(String(m.nu)); setShaftSy(String(m.Sy)); setShaftCte(String(m.cteUmPerMK)); } };
  const pickHub = (id) => { setHubMat(id); const m = pressFitMaterialById(id); if (m) { setHubE(String(m.E)); setHubNu(String(m.nu)); setHubSy(String(m.Sy)); setHubCte(String(m.cteUmPerMK)); } };

  const r = useMemo(() => analyzePressFit({
    interfaceDia: numOr(dFit, 1), shaftBore: numOr(dBore, 0), hubOuterDia: numOr(dOut, 2),
    interferenceMinDia: numOr(iMin) / 1000, interferenceMaxDia: numOr(iMax) / 1000,
    shaftE: numOr(shaftE) * 1000, shaftNu: numOr(shaftNu), hubE: numOr(hubE) * 1000, hubNu: numOr(hubNu),
    shaftSy: numOr(shaftSy), hubSy: numOr(hubSy),
    shaftAlphaPerK: cteToAlphaPerK(numOr(shaftCte)), hubAlphaPerK: cteToAlphaPerK(numOr(hubCte)),
    length: numOr(length, 1), mu: numOr(mu), assemblyClearance: numOr(clearance) / 1000,
  }), [dFit, dBore, dOut, iMin, iMax, length, mu, clearance, shaftE, shaftNu, shaftSy, shaftCte, hubE, hubNu, hubSy, hubCte]);

  const v = verdict(r.governingSF);
  const hubUtil = r.stress.hubVonMises / Math.max(1e-9, numOr(hubSy));
  const brittle = pressFitMaterialById(shaftMat)?.brittle || pressFitMaterialById(hubMat)?.brittle;
  const ambient = 20;
  const hubTarget = ambient + r.dThubHeat;     // heat the hub to here
  const shaftTarget = ambient - r.dTshaftCool; // or cool the shaft to here

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.hub}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Press / Shrink Fit · Lamé thick-wall</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 GEOMETRY ===== */}
        <Step n="1" label="Geometry" />
        <Panel title="The two parts" hint="shaft inside hub · mm">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 14 }}>
            <Field label="Shaft bore Ø" hint="0 = solid shaft"><input value={dBore} onChange={(e) => setDBore(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Interface Ø (fit)" hint="where they meet"><input value={dFit} onChange={(e) => setDFit(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Hub outer Ø"><input value={dOut} onChange={(e) => setDOut(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Engagement length"><input value={length} onChange={(e) => setLength(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
          </div>
        </Panel>

        <Panel title="Interference" hint="diametral · µm">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 14 }}>
            <Field label="Min interference"><input value={iMin} onChange={(e) => setIMin(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Max interference"><input value={iMax} onChange={(e) => setIMax(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Friction µ" hint="0.1–0.15 dry steel"><input value={mu} onChange={(e) => setMu(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Assembly clearance" hint="µm, to slip on warm"><input value={clearance} onChange={(e) => setClearance(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>The interference is the diametral overlap from your fit tolerance (e.g. an ISO H7/s6). Max interference drives stress; min interference drives grip — both are shown.</div>
        </Panel>

        <Step n="2" label="Materials" />
        <Panel hint="E in GPa · Sy in MPa · α in µm/m·K — indicative, verify">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))", gap: 14 }}>
            <MatBlock title="Shaft" color={C.shaft} matId={shaftMat} onMat={pickShaft}
              E={shaftE} onE={setShaftE} nu={shaftNu} onNu={setShaftNu} Sy={shaftSy} onSy={setShaftSy} cte={shaftCte} onCte={setShaftCte} />
            <MatBlock title="Hub" color={C.hub} matId={hubMat} onMat={pickHub}
              E={hubE} onE={setHubE} nu={hubNu} onNu={setHubNu} Sy={hubSy} onSy={setHubSy} cte={hubCte} onCte={setHubCte} />
          </div>
          {brittle && <WarnNote>A brittle material (e.g. cast iron) is selected — von Mises vs yield isn&apos;t the right criterion; check the peak tensile hoop stress against the material&apos;s tensile strength and a brittle-material safety factor.</WarnNote>}
        </Panel>

        {/* ===== 3 RESULT ===== */}
        <Step n="3" label="Result" />
        {!r.valid ? (
          <Panel>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.fail }}><AlertTriangle size={16} /><span style={{ fontSize: 14, fontWeight: 600 }}>{r.reason}</span></div>
          </Panel>
        ) : (
          <>
            <Panel>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{ fontSize: 22, fontWeight: 650, color: v.c }}>{v.t}</span>
                <span className="mono" style={{ fontSize: 13, color: C.sub, background: C.paper, borderRadius: 6, padding: "4px 9px" }}>SF {fmt(r.governingSF, 2)} · {v.note}</span>
                <span style={{ flex: 1 }} />
                <Mini label="contact pressure" value={pMinMax(r)} unit="MPa" />
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <PressFitSketch dFit={numOr(dFit, 1)} dBore={numOr(dBore, 0)} dOut={numOr(dOut, 2)} pressure={r.pMax} util={hubUtil} color={v.c} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <StressBar label="Hub bore (von Mises)" stress={r.stress.hubVonMises} Sy={numOr(hubSy)} sf={r.hubSF} color={C.hub} />
                  <div style={{ height: 12 }} />
                  <StressBar label="Shaft (von Mises)" stress={r.stress.shaftVonMises} Sy={numOr(shaftSy)} sf={r.shaftSF} color={C.shaft} />
                  <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Stresses at max interference ({fmt(numOr(iMax))} µm). The peak is the tensile hoop stress at the hub bore — that&apos;s what cracks an over-pressed hub.</div>
                </div>
              </div>
            </Panel>

            <Panel title="What it holds" hint="at min interference — worst-case grip">
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 10 }}>
                <Mini label="axial slip force" value={fmt(r.holdAxialForce / 1000, 1)} unit="kN" hint={`µ ${fmt(numOr(mu), 2)} · p ${fmt(r.pMin, 1)} MPa`} />
                <Mini label="torque capacity" value={fmt(r.holdTorque / 1000, 1)} unit="N·m" hint="before it slips" />
                <Mini label="press-in force" value={fmt(r.pressInForce / 1000, 1)} unit="kN" hint="cold press, at max interference" c={C.sub} />
              </div>
              {r.pMin <= 0 && <WarnNote>At minimum interference the fit can run to a clearance — there&apos;s no guaranteed grip. Tighten the lower interference limit or it may spin/walk.</WarnNote>}
              <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>Friction-grip only (no keys/adhesive). µ dominates the result and is uncertain — use a conservative value and a margin.</div>
            </Panel>

            <Panel title="Assembling it" hint="shrink-fit alternative to cold pressing">
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                <Mini label="heat the hub by" value={`+${fmt(r.dThubHeat, 0)}`} unit="K" hint={`to ≈ ${fmt(hubTarget, 0)} °C`} c={C.hub} />
                <Mini label="or cool the shaft by" value={`−${fmt(r.dTshaftCool, 0)}`} unit="K" hint={`to ≈ ${fmt(shaftTarget, 0)} °C`} c={C.shaft} />
                <Mini label="cold-press force" value={fmt(r.pressInForce / 1000, 1)} unit="kN" hint="if pressed, not shrunk" c={C.sub} />
              </div>
              {shaftTarget < -50 && <WarnNote>Cooling the shaft to ≈ {fmt(shaftTarget, 0)} °C is below −50 °C — feasible with dry-ice/LN₂ but the linear-expansion estimate is approximate that cold; verify.</WarnNote>}
              <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>Heating the hub (or cooling the shaft) opens the bore by the max interference plus your {fmt(numOr(clearance))} µm slip clearance, so the parts drop together with little force.</div>
            </Panel>

            <div className="mono" style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.6, padding: "0 2px" }}>
              Lamé elastic model: homogeneous isotropic parts at one temperature, stresses below yield, long fit (no end effects), uniform interface pressure. Surface roughness smooths a few µm off the effective interference at assembly. Verify material strengths and µ for your application.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function pMinMax(r) {
  if (r.pMin <= 0) return `0 – ${fmt(r.pMax, 1)}`;
  return `${fmt(r.pMin, 1)} – ${fmt(r.pMax, 1)}`;
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", width: 70, background: "#fff", textAlign: "center" };
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
    {(title || hint) && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13, gap: 8 }}>{title ? <div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div> : <span />}{hint && <div className="mono" style={{ fontSize: 10, color: C.faint }}>{hint}</div>}</div>}
    {children}
  </div>);
}
function Field({ label, hint, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 4 }}>{hint}</div>}</label>); }
function Mini({ label, value, unit, hint, c }) { return (<div><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 3 }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: c || C.ink, lineHeight: 1 }}>{value}{unit && <span style={{ fontSize: 11, color: C.faint, marginLeft: 4 }}>{unit}</span>}</div>{hint && <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{hint}</div>}</div>); }
function WarnNote({ children }) {
  return (<div className="mono" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 7, padding: "8px 11px", marginTop: 12, lineHeight: 1.55 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{children}</span></div>);
}

function MatBlock({ title, color, matId, onMat, E, onE, nu, onNu, Sy, onSy, cte, onCte }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px 14px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 650, color, marginBottom: 10 }}>{title}</div>
      <select value={matId} onChange={(e) => onMat(e.target.value)} style={{ ...sel, fontFamily: SANS, marginBottom: 10 }}>
        {PRESS_FIT_MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        <option value="custom">Custom…</option>
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <SmallField label="E (GPa)"><input value={E} onChange={(e) => onE(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></SmallField>
        <SmallField label="ν"><input value={nu} onChange={(e) => onNu(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></SmallField>
        <SmallField label="Yield Sy (MPa)"><input value={Sy} onChange={(e) => onSy(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></SmallField>
        <SmallField label="α (µm/m·K)"><input value={cte} onChange={(e) => onCte(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></SmallField>
      </div>
    </div>
  );
}
function SmallField({ label, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 9.5, color: C.faint, marginBottom: 4 }}>{label}</div>{children}</label>); }

function StressBar({ label, stress, Sy, sf, color }) {
  const util = Sy > 0 ? stress / Sy : 0;
  const pct = Math.min(100, util * 100);
  const barC = sf >= 1.5 ? C.ok : sf >= 1.0 ? C.warn : C.fail;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.ink }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: C.sub }}>{fmt(stress, 0)} / {fmt(Sy, 0)} MPa · SF {fmt(sf, 2)}</span>
      </div>
      <div style={{ position: "relative", height: 16, background: C.paper, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barC, opacity: 0.85, borderRadius: 4, transition: "width .2s" }} />
      </div>
    </div>
  );
}

function PressFitSketch({ dFit, dBore, dOut, pressure, util, color }) {
  const S = 150, cx = S / 2, cy = S / 2, maxR = 66;
  const dRef = Math.max(dOut, 1);
  const rOut = maxR, rFit = maxR * (dFit / dRef), rBore = maxR * (dBore / dRef);
  // hub tint deepens with utilisation
  const hubFill = util >= 1 ? C.failBg : util >= 0.66 ? C.warnBg : C.hubBg;
  const arrows = 12;
  return (
    <div>
      <svg viewBox={`0 0 ${S} ${S}`} width="158" height="158" fontFamily={SANS}>
        {/* hub */}
        <circle cx={cx} cy={cy} r={rOut} fill={hubFill} stroke={C.hub} strokeWidth="2" />
        {/* shaft */}
        <circle cx={cx} cy={cy} r={rFit} fill={C.shaftBg} stroke={C.shaft} strokeWidth="2" />
        {/* bore */}
        {rBore > 0.5 && <circle cx={cx} cy={cy} r={rBore} fill="#fff" stroke={C.shaft} strokeWidth="1.3" strokeDasharray="3 2" />}
        {/* interface pressure ring — short inward arrows */}
        {Array.from({ length: arrows }).map((_, i) => {
          const a = (i / arrows) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * (rFit + 7), y1 = cy + Math.sin(a) * (rFit + 7);
          const x2 = cx + Math.cos(a) * (rFit + 1), y2 = cy + Math.sin(a) * (rFit + 1);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.4" markerEnd="url(#pfArrow)" opacity="0.8" />;
        })}
        <defs>
          <marker id="pfArrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0,0 L4,2.5 L0,5 Z" fill={color} /></marker>
        </defs>
        <text x={cx} y={cy + 3} textAnchor="middle" fontFamily={MONO} fontSize="10" fontWeight="600" fill={color}>p={fmt(pressure, 0)}</text>
      </svg>
      <div className="mono" style={{ fontSize: 9.5, color: C.faint, textAlign: "center", marginTop: -6 }}>
        <span style={{ color: C.shaft }}>shaft</span> in <span style={{ color: C.hub }}>hub</span> · MPa
      </div>
    </div>
  );
}
