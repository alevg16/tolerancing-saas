"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Printer, AlertTriangle, Lock } from "lucide-react";
import { analyzeGear, GEAR_TYPES, GEAR_MATERIALS, gearMaterialById, familyOf } from "@/lib/gears";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#0E5A6B", accentBg: "#E5EEF2", pinion: "#1C6E8C", gear: "#C0792B",
  pinionBg: "#E5EEF2", gearBg: "#F6ECDD", ok: "#1F7A4D", okBg: "#E8F2EC", warn: "#B5862B", warnBg: "#F7F1E2", fail: "#B23A48", failBg: "#F7E9EB",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 2) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));

const GROUPS = [
  ["cylindrical", "Parallel-axis"],
  ["bevel", "Intersecting-axis (bevel)"],
  ["worm", "Right-angle (worm)"],
];

function verdict(sf) {
  if (!isFinite(sf)) return { c: C.faint, t: "—" };
  if (sf >= 1.4) return { c: C.ok, t: "Capable" };
  if (sf >= 1.0) return { c: C.warn, t: "Marginal" };
  return { c: C.fail, t: "Under-rated" };
}

/**
 * Gear calculator — all common types from one involute engine. Exact geometry
 * plus an engineering-estimate strength rating (Lewis bending + Hertzian
 * contact), flagged as an estimate. Persistable via initialState/onStateChange.
 */
export default function GearCalculator({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [type, setType] = useState(init?.type ?? "spur");
  const [mn, setMn] = useState(init?.mn ?? "2");
  const [z1, setZ1] = useState(init?.z1 ?? "20");
  const [z2, setZ2] = useState(init?.z2 ?? "40");
  const [alpha, setAlpha] = useState(init?.alpha ?? "20");
  const [helix, setHelix] = useState(init?.helix ?? "15");
  const [face, setFace] = useState(init?.face ?? "20");
  const [x1, setX1] = useState(init?.x1 ?? "0");
  const [x2, setX2] = useState(init?.x2 ?? "0");
  const [shaft, setShaft] = useState(init?.shaft ?? "90");
  const [q, setQ] = useState(init?.q ?? "10");
  const [mu, setMu] = useState(init?.mu ?? "0");
  const [loadMode, setLoadMode] = useState(init?.loadMode ?? "power");
  const [power, setPower] = useState(init?.power ?? "5");
  const [speed, setSpeed] = useState(init?.speed ?? "1000");
  const [torque, setTorque] = useState(init?.torque ?? "50");
  const [ka, setKa] = useState(init?.ka ?? "1.25");
  const [mat1, setMat1] = useState(init?.mat1 ?? "steel-case-60");
  const [mat2, setMat2] = useState(init?.mat2 ?? "steel-case-60");
  const [c1, setC1] = useState(init?.c1 ?? { name: "Custom", E: "206", nu: "0.30", sHlim: "1000", sFlim: "350", hardness: "—" });
  const [c2, setC2] = useState(init?.c2 ?? { name: "Custom", E: "206", nu: "0.30", sHlim: "1000", sFlim: "350", hardness: "—" });

  useEffect(() => {
    onStateChange?.({ type, mn, z1, z2, alpha, helix, face, x1, x2, shaft, q, mu, loadMode, power, speed, torque, ka, mat1, mat2, c1, c2 });
  }, [type, mn, z1, z2, alpha, helix, face, x1, x2, shaft, q, mu, loadMode, power, speed, torque, ka, mat1, mat2, c1, c2, onStateChange]);

  const fam = familyOf(type);
  const showHelix = type === "helical" || type === "herringbone" || type === "spiral_bevel";
  const helixLabel = type === "spiral_bevel" ? "Spiral angle (°)" : "Helix angle (°)";
  const showShift = fam === "cylindrical" && type !== "rack";
  const showZ2 = type !== "rack" && type !== "miter";
  const showShaft = fam === "bevel" && type !== "miter";
  const isWorm = fam === "worm";
  const moduleLabel = isWorm ? "Axial module mx" : fam === "bevel" ? "Outer module" : "Normal module mn";
  const z1Label = isWorm ? "Worm starts" : "Pinion teeth";
  const z2Label = type === "internal" ? "Ring teeth" : isWorm ? "Wheel teeth" : "Gear teeth";

  const customMat = (c) => ({ id: "custom", name: c.name || "Custom", kind: "custom", hardness: c.hardness || "—", sHlim: numOr(c.sHlim), sFlim: numOr(c.sFlim), E: numOr(c.E, 206), nu: numOr(c.nu, 0.3), source: "user-defined" });
  const m1 = mat1 === "custom" ? customMat(c1) : (gearMaterialById(mat1) ?? GEAR_MATERIALS[0]);
  const m2 = mat2 === "custom" ? customMat(c2) : (gearMaterialById(mat2) ?? GEAR_MATERIALS[0]);

  const r = useMemo(() => analyzeGear({
    type, module: numOr(mn, 1), z1: numOr(z1, 1), z2: numOr(z2, 1), pressureAngle: numOr(alpha, 20),
    helixAngle: showHelix ? numOr(helix) : 0, faceWidth: numOr(face, 1), profileShift1: numOr(x1), profileShift2: numOr(x2),
    shaftAngle: numOr(shaft, 90), diameterFactor: numOr(q, 10), mu: numOr(mu),
    power: numOr(power), speed: numOr(speed), torque: numOr(torque), useTorque: loadMode === "torque", KA: numOr(ka, 1),
    mat1: m1, mat2: m2,
  }), [type, mn, z1, z2, alpha, helix, face, x1, x2, shaft, q, mu, power, speed, torque, loadMode, ka, m1, m2, showHelix]);

  const minSF = Math.min(r.SF_bending, r.SF_contact);
  const v = verdict(minSF);

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Gear Calculator · geometry + rating</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== TYPE ===== */}
        <Step n="1" label="Gear type" />
        <Panel>
          {GROUPS.map(([famId, label]) => (
            <div key={famId} style={{ marginBottom: 10 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 7 }}>{label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GEAR_TYPES.filter((g) => g.family === famId).map((g) => {
                  const on = type === g.id;
                  return (
                    <button key={g.id} onClick={() => setType(g.id)} title={g.blurb} style={{ fontSize: 12.5, fontFamily: SANS, color: on ? "#fff" : C.ink, background: on ? C.accent : "#fff", border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: on ? 600 : 400 }}>{g.label}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <GearTypeArt type={type} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 3 }}>{GEAR_TYPES.find((g) => g.id === type)?.label}</div>
              <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>{GEAR_TYPES.find((g) => g.id === type)?.blurb}</div>
            </div>
          </div>
        </Panel>

        {/* ===== GEOMETRY INPUTS ===== */}
        <Step n="2" label="Geometry & load" />
        <Panel title="Sizing" hint="mm · degrees">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 14 }}>
            <Field label={moduleLabel}><input value={mn} onChange={(e) => setMn(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label={z1Label}><input value={z1} onChange={(e) => setZ1(e.target.value)} inputMode="numeric" style={{ ...inp, width: "100%" }} /></Field>
            {showZ2 && <Field label={z2Label}><input value={z2} onChange={(e) => setZ2(e.target.value)} inputMode="numeric" style={{ ...inp, width: "100%" }} /></Field>}
            <Field label="Pressure angle (°)"><input value={alpha} onChange={(e) => setAlpha(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            {showHelix && <Field label={helixLabel}><input value={helix} onChange={(e) => setHelix(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            <Field label="Face width b"><input value={face} onChange={(e) => setFace(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            {showShaft && <Field label="Shaft angle (°)"><input value={shaft} onChange={(e) => setShaft(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            {isWorm && <Field label="Diameter factor q" hint="d₁ = q·mx"><input value={q} onChange={(e) => setQ(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            {isWorm && <Field label="Friction µ" hint="0 = auto by speed"><input value={mu} onChange={(e) => setMu(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            {showShift && <Field label="Profile shift x₁"><input value={x1} onChange={(e) => setX1(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            {showShift && showZ2 && <Field label="Profile shift x₂"><input value={x2} onChange={(e) => setX2(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
          </div>
          {r.valid && <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>What the dimensions mean</div>
            <DimensionDiagram r={r} fam={fam} type={type} mn={numOr(mn, 1)} alpha={numOr(alpha, 20)} />
          </div>}
        </Panel>

        <Panel title="Load" hint="drives the strength rating">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 14, alignItems: "end" }}>
            <Field label="Input by">
              <div className="mono" style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: `1px solid ${C.line}` }}>
                {[["power", "Power"], ["torque", "Torque"]].map(([mv, l]) => { const on = loadMode === mv; return <button key={mv} onClick={() => setLoadMode(mv)} style={{ flex: 1, padding: "8px 4px", fontSize: 12, border: "none", cursor: "pointer", background: on ? C.accent : "#fff", color: on ? "#fff" : C.faint }}>{l}</button>; })}
              </div>
            </Field>
            {loadMode === "power"
              ? <Field label="Power (kW)"><input value={power} onChange={(e) => setPower(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
              : <Field label="Torque (N·m)"><input value={torque} onChange={(e) => setTorque(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>}
            <Field label={`Speed n₁ (rpm)`} hint={isWorm ? "worm speed" : "pinion speed"}><input value={speed} onChange={(e) => setSpeed(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Service factor KA" hint="1.0 smooth · 1.5 shock"><input value={ka} onChange={(e) => setKa(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
          </div>
        </Panel>

        <Panel title="Materials" hint="σ allowables by hardness — indicative, verify">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 14 }}>
            <MatField label={isWorm ? "Worm" : "Pinion"} color={C.pinion} matId={mat1} onMat={setMat1} m={m1} cust={c1} onCust={setC1} />
            <MatField label={isWorm ? "Wheel (usually bronze)" : "Gear"} color={C.gear} matId={mat2} onMat={setMat2} m={m2} cust={c2} onCust={setC2} />
          </div>
        </Panel>

        {/* ===== RESULT ===== */}
        <Step n="3" label="Result" />
        {!r.valid ? (
          <Panel><div style={{ display: "flex", alignItems: "center", gap: 8, color: C.fail }}><AlertTriangle size={16} /><span style={{ fontSize: 14, fontWeight: 600 }}>{r.reason}</span></div></Panel>
        ) : (
          <>
            <Panel>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <GearSketch r={r} type={type} fam={fam} />
                <div style={{ flex: 1, minWidth: 230 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 650 }}>{GEAR_TYPES.find((g) => g.id === type)?.label}</span>
                    <span className="mono" style={{ fontSize: 13, color: C.sub }}>{isWorm || type === "rack" ? "" : `i = ${fmt(r.ratio, 3)}`}</span>
                    <span className="mono" style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: v.c, background: v.c + "1A", border: `1px solid ${v.c}33`, borderRadius: 6, padding: "4px 9px" }}>{v.t} · SF {fmt(minSF, 2)}</span>
                  </div>
                  <StressBar label="Bending (tooth root)" stress={r.sigmaF} allow={r.sigmaFAllow} sf={r.SF_bending} />
                  <div style={{ height: 10 }} />
                  <StressBar label="Contact (pitting)" stress={r.sigmaH} allow={r.sigmaHAllow} sf={r.SF_contact} />
                  <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 6, padding: "4px 9px", marginTop: 12 }}><AlertTriangle size={11} /> estimate — verify vs ISO 6336 / AGMA 2001</div>
                </div>
              </div>
            </Panel>

            <Panel title="Geometry" hint="exact (ISO 21771)">
              <Grid>
                {fam === "cylindrical" && <>
                  <Cell k="Pitch Ø — pinion / gear" val={`${fmt(r.d1)} / ${type === "rack" ? "rack" : fmt(r.d2)}`} u="mm" />
                  <Cell k="Tip Ø — pinion" val={fmt(r.da1)} u="mm" />
                  <Cell k="Root Ø — pinion" val={fmt(r.df1)} u="mm" />
                  <Cell k="Base Ø — pinion" val={fmt(r.db1)} u="mm" />
                  {type !== "rack" && <Cell k="Center distance" val={fmt(r.workingCenterDistance)} u="mm" hint={`ref ${fmt(r.centerDistance)}`} />}
                  {type === "rack" && <Cell k="Travel / pinion rev" val={fmt(r.rackTravelPerRev)} u="mm" />}
                  <Cell k="Transverse pressure angle" val={fmt(r.transversePressureAngle)} u="°" />
                  <Cell k="Contact ratio εα" val={fmt(r.contactRatio)} c={r.contactRatio < 1.2 ? C.warn : C.ink} />
                  {r.overlapRatio > 0 && <Cell k="Overlap ratio εβ" val={fmt(r.overlapRatio)} />}
                  {r.overlapRatio > 0 && <Cell k="Total ratio εγ" val={fmt(r.totalContactRatio)} />}
                  {r.axialPitch > 0 && <Cell k="Axial pitch" val={fmt(r.axialPitch)} u="mm" />}
                </>}
                {fam === "bevel" && <>
                  <Cell k="Pitch Ø — pinion / gear" val={`${fmt(r.d1)} / ${fmt(r.d2)}`} u="mm" />
                  <Cell k="Pitch cone angle — pinion" val={fmt(r.coneAngle1)} u="°" />
                  <Cell k="Pitch cone angle — gear" val={fmt(r.coneAngle2)} u="°" />
                  <Cell k="Outer cone distance Re" val={fmt(r.outerConeDistance)} u="mm" />
                  <Cell k="Mean module" val={fmt(r.meanModule)} u="mm" />
                  <Cell k="Virtual teeth (Tredgold)" val={`${fmt(r.virtualTeeth1, 1)} / ${fmt(r.virtualTeeth2, 1)}`} />
                  <Cell k="Tip Ø — pinion / gear" val={`${fmt(r.da1)} / ${fmt(r.da2)}`} u="mm" />
                </>}
                {fam === "worm" && <>
                  <Cell k="Worm pitch Ø d₁" val={fmt(r.d1)} u="mm" />
                  <Cell k="Wheel pitch Ø d₂" val={fmt(r.d2)} u="mm" />
                  <Cell k="Center distance" val={fmt(r.centerDistance)} u="mm" />
                  <Cell k="Ratio i" val={fmt(r.ratio, 1)} />
                  <Cell k="Lead angle γ" val={fmt(r.leadAngle)} u="°" />
                  <Cell k="Sliding velocity" val={fmt(r.slidingVelocity)} u="m/s" />
                  <Cell k="Efficiency η" val={fmt(r.efficiency * 100, 1)} u="%" c={r.efficiency < 0.5 ? C.warn : C.ok} />
                  <Cell k="Output torque" val={fmt(r.outputTorque)} u="N·m" />
                </>}
              </Grid>
              {r.undercut && <WarnNote>Pinion undercuts below ~{r.minTeethNoUndercut} teeth — add positive profile shift (x₁) or increase the pressure angle.</WarnNote>}
              {isWorm && r.selfLocking && <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.accent, background: C.accentBg, border: `1px solid ${C.accent}44`, borderRadius: 7, padding: "8px 11px", marginTop: 12 }}><Lock size={13} /> Self-locking — the wheel can&apos;t back-drive the worm (static; verify under vibration).</div>}
            </Panel>

            <Panel title="Load & rating" hint="Lewis bending · Hertz contact">
              <Grid>
                <Cell k={isWorm ? "Worm torque" : "Pinion torque"} val={fmt(r.torque1)} u="N·m" />
                <Cell k={isWorm ? "Wheel tangential force" : "Tangential force Ft"} val={fmt(r.Ft, 0)} u="N" />
                <Cell k="Pitch-line velocity" val={fmt(r.pitchVelocity)} u="m/s" />
                {!isWorm && <Cell k="Dynamic factor Kv" val={fmt(r.Kv)} />}
                <Cell k="Bending stress σF" val={fmt(r.sigmaF, 0)} u="MPa" hint={`allow ${fmt(r.sigmaFAllow, 0)}`} />
                <Cell k="Contact stress σH" val={fmt(r.sigmaH, 0)} u="MPa" hint={`allow ${fmt(r.sigmaHAllow, 0)}`} />
                <Cell k="Bending SF" val={fmt(r.SF_bending, 2)} c={verdict(r.SF_bending).c} />
                <Cell k="Contact SF" val={fmt(r.SF_contact, 2)} c={verdict(r.SF_contact).c} />
              </Grid>
              {r.notes.length > 0 && <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>{r.notes.join(" ")}</div>}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
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
function Grid({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: "12px 18px" }}>{children}</div>; }
function Cell({ k, val, u, hint, c }) { return (<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${C.line}`, paddingBottom: 5 }}><span style={{ fontSize: 12, color: C.sub }}>{k}</span><span className="mono" style={{ fontSize: 13, fontWeight: 600, color: c || C.ink, whiteSpace: "nowrap" }}>{val}{u && <span style={{ fontSize: 10, color: C.faint, marginLeft: 3 }}>{u}</span>}{hint && <span style={{ fontSize: 9.5, color: C.faint, marginLeft: 5 }}>({hint})</span>}</span></div>); }
function WarnNote({ children }) {
  return (<div className="mono" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 7, padding: "8px 11px", marginTop: 12, lineHeight: 1.55 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{children}</span></div>);
}
function MatField({ label, color, matId, onMat, m, cust, onCust }) {
  const isCustom = matId === "custom";
  const setC = (k, v) => onCust({ ...cust, [k]: v });
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 12.5, fontWeight: 650, color, marginBottom: 8 }}>{label}</div>
      <select value={matId} onChange={(e) => onMat(e.target.value)} style={{ ...sel, fontFamily: SANS }}>
        {GEAR_MATERIALS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        <option value="custom">Custom material…</option>
      </select>
      {isCustom ? (
        <div style={{ marginTop: 9 }}>
          <input value={cust.name} onChange={(e) => setC("name", e.target.value)} placeholder="Material name" style={{ fontFamily: SANS, fontSize: 12, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 8px", width: "100%", background: "#fff", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <CustF label="σ_Hlim (MPa)" v={cust.sHlim} on={(x) => setC("sHlim", x)} />
            <CustF label="σ_Flim (MPa)" v={cust.sFlim} on={(x) => setC("sFlim", x)} />
            <CustF label="E (GPa)" v={cust.E} on={(x) => setC("E", x)} />
            <CustF label="ν" v={cust.nu} on={(x) => setC("nu", x)} />
            <CustF label="Hardness" v={cust.hardness} on={(x) => setC("hardness", x)} text />
          </div>
        </div>
      ) : (
        <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 7, lineHeight: 1.5 }}>σ_Hlim {m.sHlim} · σ_Flim {m.sFlim} MPa · {m.hardness} · {m.source}</div>
      )}
    </div>
  );
}
function CustF({ label, v, on, text }) {
  return (<label style={{ display: "block" }}><div style={{ fontSize: 9.5, color: C.faint, marginBottom: 3 }}>{label}</div><input value={v} onChange={(e) => on(e.target.value)} inputMode={text ? "text" : "decimal"} style={{ fontFamily: MONO, fontSize: 12, color: C.ink, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 6px", width: "100%", background: "#fff" }} /></label>);
}
function StressBar({ label, stress, allow, sf }) {
  const util = allow > 0 ? stress / allow : 0;
  const pct = Math.min(100, util * 100);
  const barC = sf >= 1.4 ? C.ok : sf >= 1.0 ? C.warn : C.fail;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.ink }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: C.sub }}>{fmt(stress, 0)} / {fmt(allow, 0)} MPa · SF {fmt(sf, 2)}</span>
      </div>
      <div style={{ height: 16, background: C.paper, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barC, opacity: 0.85, borderRadius: 4, transition: "width .2s" }} />
      </div>
    </div>
  );
}

function GearSketch({ r, type, fam }) {
  const S = 184;
  if (fam === "cylindrical") {
    if (type === "rack") {
      const scale = Math.min(70 / Math.max(r.d1 / 2, 1), 3);
      const rp = (r.d1 / 2) * scale, cx = S / 2, cy = 60;
      return (
        <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} fontFamily={SANS}>
          <Circle cx={cx} cy={cy} rp={rp} ra={rp * (r.da1 / r.d1)} rb={rp * (r.db1 / r.d1)} color={C.pinion} z={Math.round(r.d1 / 2)} />
          <line x1={14} y1={cy + rp} x2={S - 14} y2={cy + rp} stroke={C.gear} strokeWidth="2.5" />
          {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={20 + i * 14} y1={cy + rp} x2={20 + i * 14} y2={cy + rp + 8} stroke={C.gear} strokeWidth="1.4" />)}
          <text x={S / 2} y={S - 8} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={C.faint}>{fmt(r.rackTravelPerRev)} mm / rev</text>
        </svg>
      );
    }
    const internal = type === "internal";
    const a = isFinite(r.workingCenterDistance) ? r.workingCenterDistance : 0;
    const span = internal ? r.d2 : r.d1 + r.d2;
    const scale = Math.min(150 / Math.max(span, 1), 70 / Math.max(r.d1, 1));
    const r1 = (r.d1 / 2) * scale, r2 = (r.d2 / 2) * scale, ax = a * scale;
    const cx1 = S / 2 - (internal ? ax / 2 : ax / 2), cy = S / 2;
    const cx2 = internal ? cx1 + ax : cx1 + ax;
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} fontFamily={SANS}>
        {internal
          ? <circle cx={cx2} cy={cy} r={r2} fill={C.gearBg} stroke={C.gear} strokeWidth="2" />
          : <Circle cx={cx2} cy={cy} rp={r2} ra={r2 * (r.da2 / r.d2)} rb={r2 * (r.db2 / r.d2)} color={C.gear} z={Math.round(r.d2 / 2)} />}
        <Circle cx={cx1} cy={cy} rp={r1} ra={r1 * (r.da1 / r.d1)} rb={r1 * (r.db1 / r.d1)} color={C.pinion} z={Math.round(r.d1 / 2)} />
        <text x={S / 2} y={S - 8} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={C.faint}>a = {fmt(r.workingCenterDistance)} mm</text>
      </svg>
    );
  }
  if (fam === "bevel") {
    const cx = S / 2, cy = S / 2, L = 62;
    const d1 = r.coneAngle1 * Math.PI / 180, d2 = r.coneAngle2 * Math.PI / 180;
    const tri = (ang, color, flip) => { const dx = Math.cos(ang) * L, dy = Math.sin(ang) * L; const sx = flip ? -1 : 1; return <polygon points={`${cx},${cy} ${cx + sx * dx},${cy - dy} ${cx + sx * dx},${cy + dy}`} fill={color + "22"} stroke={color} strokeWidth="1.8" />; };
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} fontFamily={SANS}>
        {tri(d1, C.pinion, false)}
        {tri(d2, C.gear, true)}
        <circle cx={cx} cy={cy} r="3" fill={C.ink} />
        <text x={S / 2} y={S - 8} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={C.faint}>δ {fmt(r.coneAngle1, 0)}° / {fmt(r.coneAngle2, 0)}°</text>
      </svg>
    );
  }
  // worm
  const cx = S / 2, cy = 64, scale = Math.min(60 / Math.max(r.d2 / 2, 1), 2.4), rw = (r.d2 / 2) * scale;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} fontFamily={SANS}>
      <circle cx={cx} cy={cy} r={rw} fill={C.gearBg} stroke={C.gear} strokeWidth="2" />
      <rect x={cx - 52} y={cy + rw - 4} width="104" height="20" rx="4" fill={C.pinionBg} stroke={C.pinion} strokeWidth="1.8" />
      {Array.from({ length: 7 }).map((_, i) => <line key={i} x1={cx - 46 + i * 15} y1={cy + rw - 4} x2={cx - 52 + i * 15} y2={cy + rw + 16} stroke={C.pinion} strokeWidth="1.3" />)}
      <text x={S / 2} y={S - 8} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={C.faint}>i = {fmt(r.ratio, 0)} · η {fmt(r.efficiency * 100, 0)}%</text>
    </svg>
  );
}
function Circle({ cx, cy, rp, ra, rb, color, z }) {
  const ticks = Math.min(48, Math.max(6, z || 12));
  return (
    <g>
      <circle cx={cx} cy={cy} r={ra} fill={color + "14"} stroke={color} strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r={rp} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
      {rb > 1 && <circle cx={cx} cy={cy} r={rb} fill="none" stroke={color} strokeWidth="0.6" opacity="0.5" />}
      {Array.from({ length: ticks }).map((_, i) => { const ang = (i / ticks) * Math.PI * 2; return <line key={i} x1={cx + Math.cos(ang) * rp} y1={cy + Math.sin(ang) * rp} x2={cx + Math.cos(ang) * ra} y2={cy + Math.sin(ang) * ra} stroke={color} strokeWidth="0.8" />; })}
    </g>
  );
}

/** Castellated gear silhouette path (tip radius rt, root radius rr, n teeth). */
function gearOutline(cx, cy, rt, rr, n) {
  const fr = [[0, rr], [0.16, rr], [0.30, rt], [0.70, rt], [0.84, rr]];
  let d = "";
  for (let i = 0; i < n; i++) for (const [f, rad] of fr) {
    const a = ((i + f) / n) * 2 * Math.PI - Math.PI / 2;
    d += (d ? "L" : "M") + (cx + Math.cos(a) * rad).toFixed(1) + " " + (cy + Math.sin(a) * rad).toFixed(1) + " ";
  }
  return d + "Z";
}

/** Recognizable illustration of the selected gear type (schematic). */
function GearTypeArt({ type }) {
  const P = C.pinion, G = C.gear, W = 130, H = 100;
  const wrap = (ch) => <svg viewBox={`0 0 ${W} ${H}`} width="120" height="92" fontFamily={SANS} style={{ flexShrink: 0 }}>{ch}</svg>;

  if (type === "spur") return wrap(<g>
    <path d={gearOutline(58, 50, 42, 33, 15)} fill={P + "1A"} stroke={P} strokeWidth="1.6" />
    <circle cx="58" cy="50" r="33" fill="none" stroke={P} strokeWidth="0.7" strokeDasharray="3 2" />
    <circle cx="58" cy="50" r="11" fill="#fff" stroke={P} strokeWidth="1.4" />
  </g>);

  if (type === "helical" || type === "herringbone") {
    const lines = [];
    for (let i = 0; i <= 9; i++) {
      const x = 28 + i * 8;
      if (type === "helical") lines.push(<line key={i} x1={x} y1={26} x2={x - 13} y2={74} stroke={P} strokeWidth="1.3" />);
      else { lines.push(<line key={`a${i}`} x1={x} y1={26} x2={x - 9} y2={50} stroke={P} strokeWidth="1.2" />); lines.push(<line key={`b${i}`} x1={x - 9} y1={50} x2={x} y2={74} stroke={P} strokeWidth="1.2" />); }
    }
    return wrap(<g>
      <path d="M30 26 L98 26 L98 74 L30 74 Z" fill={P + "10"} stroke="none" />
      <clipPath id="cylclip"><path d="M30 26 L98 26 L98 74 A34 9 0 0 1 30 74 Z" /></clipPath>
      <g clipPath="url(#cylclip)">{lines}</g>
      <ellipse cx="64" cy="26" rx="34" ry="9" fill={P + "20"} stroke={P} strokeWidth="1.5" />
      <line x1="30" y1="26" x2="30" y2="74" stroke={P} strokeWidth="1.5" />
      <line x1="98" y1="26" x2="98" y2="74" stroke={P} strokeWidth="1.5" />
      <path d="M30 74 A34 9 0 0 0 98 74" fill="none" stroke={P} strokeWidth="1.5" />
    </g>);
  }

  if (type === "internal") return wrap(<g>
    <circle cx="58" cy="50" r="45" fill={G + "10"} stroke={G} strokeWidth="1.6" />
    <path d={gearOutline(58, 50, 30, 38, 16)} fill="#fff" stroke={G} strokeWidth="1.3" />
    <path d={gearOutline(58, 50, 18, 13, 9)} fill={P + "1A"} stroke={P} strokeWidth="1.3" />
  </g>);

  if (type === "rack") {
    const teeth = [];
    for (let i = 0; i < 7; i++) { const x = 16 + i * 15; teeth.push(<path key={i} d={`M${x} 80 L${x + 4} 71 L${x + 11} 71 L${x + 15} 80`} fill="none" stroke={G} strokeWidth="1.4" />); }
    return wrap(<g>
      <path d={gearOutline(64, 38, 27, 20, 12)} fill={P + "1A"} stroke={P} strokeWidth="1.5" />
      <circle cx="64" cy="38" r="7" fill="#fff" stroke={P} strokeWidth="1.2" />
      <line x1="10" y1="80" x2="120" y2="80" stroke={G} strokeWidth="1.6" />
      {teeth}
    </g>);
  }

  if (type === "straight_bevel" || type === "spiral_bevel" || type === "miter") {
    const apex = [64, 86];
    const spiral = type === "spiral_bevel";
    const cone = (x0, color, big) => {
      const topY = big ? 16 : 30, halfTop = big ? 31 : 22, ry = big ? 7 : 5, teeth = [], tn = 7;
      for (let i = 0; i <= tn; i++) {
        const ex = x0 - halfTop + (2 * halfTop * i) / tn;
        teeth.push(spiral
          ? <path key={i} d={`M${ex} ${topY} Q${(ex + apex[0]) / 2 + 7} ${(topY + apex[1]) / 2} ${apex[0]} ${apex[1]}`} fill="none" stroke={color} strokeWidth="0.7" />
          : <line key={i} x1={ex} y1={topY} x2={apex[0]} y2={apex[1]} stroke={color} strokeWidth="0.6" />);
      }
      return <g><path d={`M${x0 - halfTop} ${topY} L${x0 + halfTop} ${topY} L${apex[0]} ${apex[1]} Z`} fill={color + "16"} stroke={color} strokeWidth="1.6" /><ellipse cx={x0} cy={topY} rx={halfTop} ry={ry} fill={color + "26"} stroke={color} strokeWidth="1.4" />{teeth}</g>;
    };
    if (type === "miter") return wrap(<g>{cone(40, P, false)}{cone(88, G, false)}</g>);
    return wrap(<g>{cone(48, G, true)}{cone(98, P, false)}</g>);
  }

  // worm + wheel
  return wrap(<g>
    <path d={gearOutline(64, 28, 27, 21, 16)} fill={G + "1A"} stroke={G} strokeWidth="1.5" />
    <circle cx="64" cy="28" r="7" fill="#fff" stroke={G} strokeWidth="1.2" />
    <rect x="22" y="60" width="84" height="24" rx="12" fill={P + "14"} stroke={P} strokeWidth="1.6" />
    {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={28 + i * 11} y1="60" x2={23 + i * 11} y2="84" stroke={P} strokeWidth="1.1" />)}
  </g>);
}

/** Annotated diagram explaining the geometry the inputs produce (live values). */
function DimensionDiagram({ r, fam, type, mn, alpha }) {
  const lab = (x, y, t, c) => <text x={x} y={y} fontSize="10" fontFamily={MONO} fill={c || C.sub}>{t}</text>;
  if (fam === "cylindrical") {
    const da = r.da1, d = r.d1, df = Math.max(1, r.df1);
    const VB = 470, VH = 200, cx = 116, cy = 100;
    const a = isFinite(r.workingCenterDistance) ? r.workingCenterDistance : d;
    const da2 = isFinite(r.da2) ? r.da2 : da;
    const span = type === "rack" ? da * 1.2 : a + da / 2 + da2 / 2;
    const sc = Math.min(78 / (da / 2), (VB - 200) / Math.max(span, 1));
    const R = (mm) => Math.max(1, (mm / 2) * sc);
    const teeth = Math.min(36, Math.max(7, Math.round(d / Math.max(0.5, mn))));
    const leader = (rr, ty, txt) => <g><line x1={cx} y1={cy} x2={cx} y2={cy - rr} stroke={C.faint} strokeWidth="0.6" /><line x1={cx} y1={cy - rr} x2={cx + 96} y2={ty} stroke={C.faint} strokeWidth="0.6" strokeDasharray="2 2" /><circle cx={cx} cy={cy - rr} r="1.6" fill={C.sub} />{lab(cx + 100, ty + 3, txt)}</g>;
    return (
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${VB} ${VH}`} width="100%" style={{ minWidth: 440, display: "block" }} fontFamily={SANS}>
          <path d={gearOutline(cx, cy, R(da), R(df), teeth)} fill={C.pinionBg} stroke={C.pinion} strokeWidth="1.4" />
          <circle cx={cx} cy={cy} r={R(d)} fill="none" stroke={C.pinion} strokeWidth="1" strokeDasharray="4 3" />
          {R(df) > 6 && <circle cx={cx} cy={cy} r={Math.max(4, R(df) - R(da) + R(d) * 0.5)} fill="#fff" stroke={C.line} strokeWidth="1" />}
          {leader(R(da), 34, `da ${fmt(da, 2)}  tip Ø`)}
          {leader(R(d), 70, `d  ${fmt(d, 2)}  pitch Ø`)}
          {leader(R(df), 106, `df ${fmt(df, 2)}  root Ø`)}
          {/* addendum / dedendum bracket */}
          <line x1={cx - R(da) - 6} y1={cy} x2={cx - R(df) - 6} y2={cy} stroke={C.faint} strokeWidth="0.6" />
          <line x1={cx - R(da)} y1={cy + 0} x2={cx - R(da) - 10} y2={cy} stroke={C.gear} strokeWidth="1" />
          {lab(cx - R(da) - 70, cy - 4, `ha ${fmt((da - d) / 2, 2)}`, C.gear)}
          {lab(cx - R(da) - 70, cy + 12, `hf ${fmt((d - df) / 2, 2)}`, C.gear)}
          {type !== "rack" && <>
            <circle cx={cx + a * sc} cy={cy} r={R(da2)} fill="none" stroke={C.gear} strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
            <line x1={cx} y1={cy} x2={cx + a * sc} y2={cy} stroke={C.ink} strokeWidth="0.8" />
            <circle cx={cx} cy={cy} r="2" fill={C.ink} /><circle cx={cx + a * sc} cy={cy} r="2" fill={C.ink} />
            {lab((2 * cx + a * sc) / 2 - 28, cy - 6, `a ${fmt(a, 2)}`, C.ink)}
          </>}
          {lab(cx + 100, 140, `module ${fmt(mn, 3)}`)}
          {lab(cx + 100, 156, `pressure ∠ ${fmt(alpha, 1)}°`)}
        </svg>
        <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 4, lineHeight: 1.5 }}>Tip (da), pitch (d, dashed) and root (df) circles. Addendum ha and dedendum hf are the tooth above/below the pitch line; a is the centre distance to the mating gear (dashed).</div>
      </div>
    );
  }
  if (fam === "bevel") {
    const VB = 470, VH = 190, ax = 150, ay = 150;
    const d1 = r.coneAngle1 * Math.PI / 180, L = 110;
    const ex = ax + Math.cos(d1) * L, ey = ay - Math.sin(d1) * L;
    return (
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${VB} ${VH}`} width="100%" style={{ minWidth: 440, display: "block" }} fontFamily={SANS}>
          <line x1={ax} y1={ay} x2={ax + 130} y2={ay} stroke={C.faint} strokeWidth="0.7" strokeDasharray="3 3" />
          <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={C.pinion} strokeWidth="1.6" />
          <line x1={ax} y1={ay} x2={ex} y2={ay + (ay - ey)} stroke={C.pinion} strokeWidth="1.6" />
          <line x1={ex} y1={ey} x2={ex} y2={ay + (ay - ey)} stroke={C.pinion} strokeWidth="1.4" />
          <path d={`M${ax + 40} ${ay} A40 40 0 0 0 ${ax + Math.cos(d1) * 40} ${ay - Math.sin(d1) * 40}`} fill="none" stroke={C.gear} strokeWidth="1" />
          {lab(ax + 46, ay - 8, `δ ${fmt(r.coneAngle1, 1)}°`, C.gear)}
          {lab(ex - 18, ey - 8, `Re ${fmt(r.outerConeDistance, 1)}`, C.sub)}
          {lab(ax + 250, 50, `pitch Ø d₁/d₂  ${fmt(r.d1, 1)} / ${fmt(r.d2, 1)}`)}
          {lab(ax + 250, 70, `outer module  ${fmt(mn, 3)}`)}
          {lab(ax + 250, 90, `mean module  ${fmt(r.meanModule, 3)}`)}
          {lab(ax + 250, 110, `cone angles  ${fmt(r.coneAngle1, 1)}° / ${fmt(r.coneAngle2, 1)}°`)}
        </svg>
        <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 4, lineHeight: 1.5 }}>Side view of the pinion cone: δ is the pitch cone angle, Re the outer cone distance. The module shrinks from outer to mean along the face.</div>
      </div>
    );
  }
  // worm
  const VB = 470, VH = 180;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${VB} ${VH}`} width="100%" style={{ minWidth: 440, display: "block" }} fontFamily={SANS}>
        <circle cx="110" cy="56" r="40" fill={C.gearBg} stroke={C.gear} strokeWidth="1.5" />
        <circle cx="110" cy="56" r="8" fill="#fff" stroke={C.gear} strokeWidth="1.2" />
        {lab(150, 40, `wheel d₂ ${fmt(r.d2, 1)}`, C.gear)}
        <rect x="60" y="104" width="160" height="34" rx="17" fill={C.pinionBg} stroke={C.pinion} strokeWidth="1.5" />
        {Array.from({ length: 10 }).map((_, i) => <line key={i} x1={70 + i * 15} y1="104" x2={62 + i * 15} y2="138" stroke={C.pinion} strokeWidth="1" />)}
        {lab(228, 110, `worm d₁ ${fmt(r.d1, 1)}`, C.pinion)}
        {lab(228, 126, `lead ∠ γ ${fmt(r.leadAngle, 1)}°`)}
        {lab(228, 142, `centre a ${fmt(r.centerDistance, 1)}`)}
        {lab(228, 158, `axial pitch ${fmt(Math.PI * mn, 2)}`)}
        {lab(60, 158, `ratio i ${fmt(r.ratio, 1)} · ${r.selfLocking ? "self-locking" : "back-drivable"}`)}
      </svg>
      <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 4, lineHeight: 1.5 }}>The worm (screw) drives the wheel at 90°. Lead angle γ sets the ratio and whether it self-locks; axial pitch = π·mx.</div>
    </div>
  );
}
