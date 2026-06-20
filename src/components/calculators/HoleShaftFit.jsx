"use client";

import React, { useState, useMemo } from "react";
import { Printer, AlertTriangle } from "lucide-react";
import {
  fitAtTemperature,
  cteToAlphaPerK,
  MATERIALS,
  CRYO_LIMIT_C,
  SOFT_MIN_C,
  SOFT_MAX_C,
} from "@/lib/thermalFit";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", hole: "#1C6E8C", shaft: "#C0792B", holeBg: "#E5EEF2", shaftBg: "#F6ECDD",
  clear: "#1F7A4D", inter: "#B23A48", trans: "#B5862B", warn: "#B5862B", warnBg: "#F7F1E2",
  clearBg: "#E8F2EC", interBg: "#F7E9EB", transBg: "#F7F1E2",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const STEPS = [
  [3, 1.732], [6, 4.243], [10, 7.746], [18, 13.416], [30, 23.238], [50, 38.730],
  [80, 63.246], [120, 97.980], [180, 146.969], [250, 212.132], [315, 280.624], [400, 354.965], [500, 447.214],
];
const gm = (D) => { for (const [hi, g] of STEPS) if (D <= hi) return g; return STEPS[STEPS.length - 1][1]; };
const ITM = { 5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100, 12: 160 };
const itVal = (D, gr) => { const d = gm(D), i = 0.45 * Math.cbrt(d) + 0.001 * d; return Math.round(ITM[gr] * i); };
const shaftDev = (L, D, gr) => {
  const d = gm(D), IT = itVal(D, gr), it7 = itVal(D, 7), it8 = itVal(D, 8);
  const up = { d: -16 * d ** 0.44, e: -11 * d ** 0.41, f: -5.5 * d ** 0.41, g: -2.5 * d ** 0.34, h: 0 };
  if (L in up) { const es = Math.round(up[L]); return { es, ei: es - IT, exact: true }; }
  if (L === "js") { const hf = IT / 2; return { es: hf, ei: -hf, exact: true }; }
  if (L === "k") { const ei = gr >= 4 && gr <= 7 ? Math.round(0.6 * Math.cbrt(d)) : 0; return { ei, es: ei + IT, exact: true }; }
  if (L === "n") { const ei = Math.round(5 * d ** 0.34); return { ei, es: ei + IT, exact: true }; }
  if (L === "a") { const es = Math.round(d <= 120 ? -(265 + 1.3 * d) : -3.5 * d); return { es, ei: es - IT, exact: false }; }
  if (L === "b") { const es = Math.round(d < 160 ? -(140 + 0.85 * d) : -1.8 * d); return { es, ei: es - IT, exact: false }; }
  if (L === "c") { const es = Math.round(d <= 40 ? -(95 + 0.8 * d) : -52 * d ** 0.2); return { es, ei: es - IT, exact: false }; }
  if (L === "m") { const ei = it7 - itVal(D, 6); return { ei, es: ei + IT, exact: false }; }
  if (L === "p") { const ei = it7; return { ei, es: ei + IT, exact: false }; }
  if (L === "s") { const ei = Math.round(d <= 50 ? it8 + 2 : it7 + 0.4 * d); return { ei, es: ei + IT, exact: false }; }
  if (L === "t") { const ei = Math.round(it7 + 0.63 * d); return { ei, es: ei + IT, exact: false }; }
  if (L === "u") { const ei = Math.round(it7 + d); return { ei, es: ei + IT, exact: false }; }
  if (L === "r") { const p = it7, s = d <= 50 ? it8 + 2 : it7 + 0.4 * d; const ei = Math.round(Math.sqrt(p * s)); return { ei, es: ei + IT, exact: false }; }
  return null;
};
const holeDev = (L, D, gr) => {
  const IT = itVal(D, gr);
  if (L === "H") return { ES: IT, EI: 0, exact: true };
  if (L === "JS") { const hf = IT / 2; return { ES: hf, EI: -hf, exact: true }; }
  const sd = shaftDev(L.toLowerCase(), D, gr);
  if (!sd) return null;
  if ("defg".includes(L.toLowerCase()) && sd.exact) { const EI = -sd.es; return { ES: EI + IT, EI, exact: true }; }
  const ES = -sd.ei; return { ES, EI: ES - IT, exact: false };
};
const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };

const SHAFTS = ["a", "b", "c", "d", "e", "f", "g", "h", "js", "k", "m", "n", "p", "r", "s", "t", "u"];
const HOLES = ["D", "E", "F", "G", "H", "JS", "K", "M", "N", "P", "S", "U"];
const GRADES = [5, 6, 7, 8, 9, 10, 11];
const FITS = [
  ["clearance", "Loose running", "H11/c11", "H", 11, "c", 11], ["clearance", "Free running", "H9/d9", "H", 9, "d", 9],
  ["clearance", "Close running", "H8/f7", "H", 8, "f", 7], ["clearance", "Sliding fit", "H7/g6", "H", 7, "g", 6],
  ["clearance", "Location / slip", "H7/h6", "H", 7, "h", 6], ["transition", "Push fit · snug", "H7/k6", "H", 7, "k", 6],
  ["transition", "Push fit · tight", "H7/n6", "H", 7, "n", 6], ["interference", "Location interference", "H7/p6", "H", 7, "p", 6],
  ["interference", "Medium drive / press", "H7/s6", "H", 7, "s", 6], ["interference", "Force / shrink", "H7/u6", "H", 7, "u", 6],
];
const fitByCode = (c) => FITS.find((f) => f[2] === c);
const GROUPS = [["clearance", "Clearance — slides with a gap"], ["transition", "Transition — light push"], ["interference", "Interference — press or shrink"]];
const catTitle = (c) => (c === "clearance" ? "Clearance" : c === "interference" ? "Interference" : "Transition");

export default function HoleShaftFit() {
  const [D, setD] = useState("25");
  const [hL, setHL] = useState("H"), [hG, setHG] = useState(7);
  const [sL, setSL] = useState("g"), [sG, setSG] = useState(6);
  const [hMan, setHMan] = useState(false), [sMan, setSMan] = useState(false);
  const [hES, setHES] = useState("21"), [hEI, setHEI] = useState("0");
  const [sES, setSES] = useState("-7"), [sEI, setSEI] = useState("-20");
  const [fit, setFit] = useState("H7/g6");
  // Thermal fit-at-temperature
  const [temp, setTemp] = useState("20");
  const [holeMatId, setHoleMatId] = useState("steel-mild"), [shaftMatId, setShaftMatId] = useState("steel-mild");
  const [holeCte, setHoleCte] = useState("11.7"), [shaftCte, setShaftCte] = useState("11.7");
  const [advanced, setAdvanced] = useState(false);
  const [holeTemp, setHoleTemp] = useState("20"), [shaftTemp, setShaftTemp] = useState("20");

  const applyFit = (code) => { const f = fitByCode(code); if (!f) return; setFit(code); setHMan(false); setSMan(false); setHL(f[3]); setHG(f[4]); setSL(f[5]); setSG(f[6]); };
  const customize = () => setFit("custom");
  const pickHoleMat = (id) => { setHoleMatId(id); const m = MATERIALS.find((x) => x.id === id); if (m) setHoleCte(String(m.cteUmPerMK)); };
  const pickShaftMat = (id) => { setShaftMatId(id); const m = MATERIALS.find((x) => x.id === id); if (m) setShaftCte(String(m.cteUmPerMK)); };
  const toggleAdvanced = () => setAdvanced((a) => { const na = !a; if (na) { setHoleTemp(temp); setShaftTemp(temp); } return na; });

  const r = useMemo(() => {
    const d = numOr(D, 1);
    const hd = hMan ? { ES: numOr(hES), EI: numOr(hEI), exact: true } : (holeDev(hL, d, hG) || { ES: 0, EI: 0, exact: true });
    const sd = sMan ? { es: numOr(sES), ei: numOr(sEI), exact: true } : (shaftDev(sL, d, sG) || { es: 0, ei: 0, exact: true });
    const Cmax = hd.ES - sd.ei, Cmin = hd.EI - sd.es;
    const type = Cmin >= 0 ? "clearance" : Cmax <= 0 ? "interference" : "transition";
    return { d, hole: hd, shaft: sd, Cmax, Cmin, type, estimate: !hd.exact || !sd.exact,
      holeMax: d + hd.ES / 1000, holeMin: d + hd.EI / 1000, shaftMax: d + sd.es / 1000, shaftMin: d + sd.ei / 1000 };
  }, [D, hL, hG, sL, sG, hMan, sMan, hES, hEI, sES, sEI]);

  const thermal = useMemo(() => {
    const Th = advanced ? numOr(holeTemp, 20) : numOr(temp, 20);
    const Ts = advanced ? numOr(shaftTemp, 20) : numOr(temp, 20);
    const aH = cteToAlphaPerK(numOr(holeCte, 0));
    const aS = cteToAlphaPerK(numOr(shaftCte, 0));
    // Thermal effects exist only when a part is off the 20 °C reference; at 20 °C
    // the expansion term is zero regardless of material, so the panel stays hidden.
    const active = Th !== 20 || Ts !== 20;
    const cryo = Math.min(Th, Ts) < CRYO_LIMIT_C;
    const soft = !cryo && (Th < SOFT_MIN_C || Th > SOFT_MAX_C || Ts < SOFT_MIN_C || Ts > SOFT_MAX_C);
    const fitT = fitAtTemperature({
      holeMin20: r.holeMin, holeMax20: r.holeMax, shaftMin20: r.shaftMin, shaftMax20: r.shaftMax,
      alphaHolePerK: aH, alphaShaftPerK: aS, holeTempC: Th, shaftTempC: Ts,
    });
    return { Th, Ts, active, cryo, soft, fitT, changed: active && !cryo && fitT.category !== r.type };
  }, [r, holeCte, shaftCte, temp, holeTemp, shaftTemp, advanced]);

  const TY = {
    clearance: { c: C.clear, t: "Clearance fit", d: "The shaft is always smaller than the hole — it slides in with a gap." },
    interference: { c: C.inter, t: "Interference fit", d: "The shaft is always larger than the hole — it must be pressed or shrunk in." },
    transition: { c: C.trans, t: "Transition fit", d: "It may end up with a small gap or a small overlap, depending on the parts." },
  }[r.type];
  const um = (v) => (v >= 0 ? "+" : "") + v.toFixed(v % 1 ? 1 : 0);
  const mm3 = (v) => v.toFixed(3);
  const fitMeta = fit !== "custom" ? fitByCode(fit) : null;
  const codeStr = !hMan && !sMan ? `Ø${r.d} ${hL}${hG}/${sL}${sG}` : fitMeta ? `Ø${r.d} ${fitMeta[2]}` : "";
  const summary = r.type === "clearance" ? `gap ${um(r.Cmin)} … ${um(r.Cmax)} µm`
    : r.type === "interference" ? `overlap ${um(-r.Cmin)} … ${um(-r.Cmax)} µm` : `${um(r.Cmax)} µm gap … ${um(-r.Cmin)} µm overlap`;

  const tLabel = advanced ? (thermal.Th === thermal.Ts ? `${thermal.Th}` : `${thermal.Th}/${thermal.Ts}`) : `${numOr(temp, 20)}`;
  const worst = thermal.fitT.clearanceMinUm < 0
    ? `up to ${Math.round(-thermal.fitT.clearanceMinUm)} µm interference`
    : `min gap ${Math.round(thermal.fitT.clearanceMinUm)} µm`;
  const bannerText = `${catTitle(r.type)} → ${catTitle(thermal.fitT.category)} at ${tLabel} °C — ${worst}`;
  // Shaft band translated relative to the (20 °C) hole band so the at-T clearance reads off the diagram.
  const shaftT = thermal.active && !thermal.cryo
    ? { es: r.hole.EI - thermal.fitT.clearanceMinUm, ei: r.hole.ES - thermal.fitT.clearanceMaxUm }
    : null;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.hole}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>Hole &amp; Shaft Fit · ISO 286</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 INPUTS ===== */}
        <Step n="1" label="Inputs" />
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginBottom: 4 }}>
            <Field label="Fit type"><select value={fit} onChange={(e) => applyFit(e.target.value)} style={{ ...sel, fontFamily: SANS }}>{fit === "custom" && <option value="custom">Custom</option>}{GROUPS.map(([gp, lbl]) => (<optgroup key={gp} label={lbl}>{FITS.filter((f) => f[0] === gp).map((f) => <option key={f[2]} value={f[2]}>{f[1]} — {f[2]}</option>)}</optgroup>))}</select></Field>
            <Field label="Basic size Ø (mm)"><input value={D} onChange={(e) => setD(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 14, marginTop: 8 }}>
            <ClassPanel title="Hole" color={C.hole} bg={C.holeBg} man={hMan} setMan={(v) => { setHMan(v); customize(); }} letter={hL} setLetter={(v) => { setHL(v); customize(); }} grade={hG} setGrade={(v) => { setHG(v); customize(); }} letters={HOLES} up={hES} setUp={setHES} lo={hEI} setLo={setHEI} upLabel="Upper (ES)" loLabel="Lower (EI)" dev={r.hole} devKeys={["ES", "EI"]} um={um} />
            <ClassPanel title="Shaft" color={C.shaft} bg={C.shaftBg} man={sMan} setMan={(v) => { setSMan(v); customize(); }} letter={sL} setLetter={(v) => { setSL(v); customize(); }} grade={sG} setGrade={(v) => { setSG(v); customize(); }} letters={SHAFTS} up={sES} setUp={setSES} lo={sEI} setLo={setSEI} upLabel="Upper (es)" loLabel="Lower (ei)" dev={r.shaft} devKeys={["es", "ei"]} um={um} />
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>Deviations in µm. Clearance &amp; transition fits (d–h, k, n) verified exact; a/b/c and interference (p–u) are formula estimates — confirm vs ISO 286-2.</div>
        </Panel>

        <Panel title="Temperature &amp; material" hint="thermal fit · 20 °C ref (ISO 1)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
            <Field label="Temperature (°C)"><input value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" disabled={advanced} style={{ ...inp, width: "100%", opacity: advanced ? 0.5 : 1 }} /></Field>
            <MatField label="Hole material" matId={holeMatId} onMat={pickHoleMat} cte={holeCte} onCte={setHoleCte} />
            <MatField label="Shaft material" matId={shaftMatId} onMat={pickShaftMat} cte={shaftCte} onCte={setShaftCte} />
          </div>
          <button onClick={toggleAdvanced} className="no-print mono" style={{ marginTop: 12, fontSize: 11.5, color: C.sub, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            {advanced ? "− Hide per-part temperatures" : "+ Advanced: per-part temperatures (shrink-fit / gradients)"}
          </button>
          {advanced && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginTop: 10 }}>
              <Field label="Hole temperature (°C)"><input value={holeTemp} onChange={(e) => setHoleTemp(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
              <Field label="Shaft temperature (°C)"><input value={shaftTemp} onChange={(e) => setShaftTemp(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            </div>
          )}
          {thermal.cryo && <WarnNote>Below −50 °C the linear mean-CTE model doesn&apos;t apply — cryogenic ranges need integrated thermal-contraction data. No fit-at-temperature is shown.</WarnNote>}
          {thermal.soft && <WarnNote>Outside −50…+300 °C — mean-CTE linearity is approximate here; verify against your data.</WarnNote>}
        </Panel>

        {/* ===== 2 RESULT ===== */}
        <Step n="2" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 650, color: TY.c }}>{fitMeta ? fitMeta[1] : TY.t}</span>
            <span className="mono" style={{ fontSize: 15, color: C.ink }}>{summary}</span>
            {codeStr && <span className="mono" style={{ fontSize: 12, color: C.sub, background: C.paper, borderRadius: 6, padding: "4px 9px" }}>{codeStr}</span>}
            {r.estimate && <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 6, padding: "4px 9px" }}><AlertTriangle size={11} /> estimate — verify vs ISO 286-2</span>}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 6, marginBottom: 16 }}>{TY.d}</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Pictogram type={r.type} color={TY.c} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <Lim color={C.hole} name="Hole" max={r.holeMax} min={r.holeMin} mm3={mm3} />
              <div style={{ height: 8 }} />
              <Lim color={C.shaft} name="Shaft" max={r.shaftMax} min={r.shaftMin} mm3={mm3} />
            </div>
          </div>
        </Panel>

        {thermal.active && (
          <Panel title="Fit at temperature" hint={`20 °C → ${tLabel} °C`}>
            {thermal.changed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.warnBg, border: `1px solid ${C.warn}66`, borderRadius: 8, padding: "10px 12px", marginBottom: 14, color: C.warn }}>
                <AlertTriangle size={15} /><span style={{ fontSize: 13, fontWeight: 600 }}>{bannerText}</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
              <ResultBlock label="At 20 °C" cat={r.type} min={r.Cmin} max={r.Cmax} um={um} />
              {thermal.cryo ? (
                <div style={{ background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 10, padding: "12px 14px" }}>
                  <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginBottom: 6 }}>At {tLabel} °C</div>
                  <div style={{ fontSize: 12.5, color: C.warn, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.5 }}><AlertTriangle size={13} /> Cryogenic — linear CTE model doesn&apos;t apply.</div>
                </div>
              ) : (
                <ResultBlock label={`At ${tLabel} °C`} cat={thermal.fitT.category} min={thermal.fitT.clearanceMinUm} max={thermal.fitT.clearanceMaxUm} um={um} highlight />
              )}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>
              Mean CTE assumed constant over 20→T; linear model for moderate temperatures only. Cryogenic ranges need integrated thermal-contraction data. Verify CTE against your source.
            </div>
          </Panel>
        )}

        {/* ===== 3 ANALYSIS ===== */}
        <Step n="3" label="Analysis" />
        <Panel title="Tolerance zones" hint="how the bands sit on the size line">
          <ZoneDiagram hole={r.hole} shaft={r.shaft} shaftT={shaftT} um={um} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>
            Each band is the allowed range for that part, measured from the basic size (the dashed line). Shaft band fully below the hole band → clearance; overlapping → transition; above → interference.{shaftT ? " The faded band is the shaft at 20 °C; the solid band is at temperature — the gap between them is the differential expansion." : ""}
          </div>
        </Panel>
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
    {title && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13, gap: 8 }}><div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div>{hint && <div className="mono" style={{ fontSize: 10, color: C.faint }}>{hint}</div>}</div>}
    {children}
  </div>);
}
function ClassPanel({ title, color, bg, man, setMan, letter, setLetter, grade, setGrade, letters, up, setUp, lo, setLo, upLabel, loLabel, dev, devKeys, um }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px 14px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <div style={{ fontSize: 13.5, fontWeight: 650, color }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, display: "inline-flex", borderRadius: 7, overflow: "hidden", border: `1px solid ${C.line}` }}>
          {["class", "manual"].map((m) => { const on = (m === "manual") === man; return <button key={m} onClick={() => setMan(m === "manual")} style={{ padding: "4px 9px", border: "none", cursor: "pointer", background: on ? bg : "#fff", color: on ? color : C.faint }}>{m}</button>; })}
        </div>
      </div>
      {man ? (
        <div style={{ display: "flex", gap: 10 }}>
          <Field label={upLabel}><input value={up} onChange={(e) => setUp(e.target.value)} inputMode="decimal" style={inp} /></Field>
          <Field label={loLabel}><input value={lo} onChange={(e) => setLo(e.target.value)} inputMode="decimal" style={inp} /></Field>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Letter"><select value={letter} onChange={(e) => setLetter(e.target.value)} style={{ ...sel, width: 72 }}>{letters.map((l) => <option key={l} value={l}>{l}</option>)}</select></Field>
          <Field label="IT"><select value={grade} onChange={(e) => setGrade(+e.target.value)} style={{ ...sel, width: 64 }}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <div className="mono" style={{ fontSize: 12, color: dev.exact ? C.sub : C.warn, paddingBottom: 9 }}>{um(dev[devKeys[0]])}/{um(dev[devKeys[1]])}{dev.exact ? "" : " ≈"}</div>
        </div>
      )}
    </div>
  );
}
function Field({ label, children }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>{children}</label>); }
function MatField({ label, matId, onMat, cte, onCte }) {
  const mat = MATERIALS.find((m) => m.id === matId);
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={matId} onChange={(e) => onMat(e.target.value)} style={{ ...sel, fontFamily: SANS, flex: 1, width: "auto" }}>
          {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.cteUmPerMK}</option>)}
          <option value="custom">Custom…</option>
        </select>
        <input value={cte} onChange={(e) => onCte(e.target.value)} inputMode="decimal" title="CTE in µm/m·K" style={{ ...inp, width: 58 }} />
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 4 }}>{matId === "custom" ? "custom CTE · µm/m·K" : `${mat ? mat.source : ""} · µm/m·K`}</div>
    </label>
  );
}
function WarnNote({ children }) {
  return (<div className="mono" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 7, padding: "8px 11px", marginTop: 12, lineHeight: 1.55 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{children}</span></div>);
}
function ResultBlock({ label, cat, min, max, um, highlight }) {
  const info = { clearance: { c: C.clear, t: "Clearance fit" }, interference: { c: C.inter, t: "Interference fit" }, transition: { c: C.trans, t: "Transition fit" } }[cat];
  const summary = cat === "clearance" ? `gap ${um(min)} … ${um(max)} µm`
    : cat === "interference" ? `overlap ${um(-min)} … ${um(-max)} µm`
    : `${um(max)} µm gap … ${um(-min)} µm overlap`;
  return (
    <div style={{ background: "#fff", border: `1px solid ${highlight ? info.c + "66" : C.line}`, borderRadius: 10, padding: "12px 14px" }}>
      <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 650, color: info.c }}>{info.t}</div>
      <div className="mono" style={{ fontSize: 13, color: C.ink, marginTop: 3 }}>{summary}</div>
    </div>
  );
}
function Lim({ color, name, max, min, mm3 }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: color }} /><span style={{ fontSize: 13, color: C.ink, width: 44 }}>{name}</span><span className="mono" style={{ fontSize: 13, color: C.sub }}>{mm3(min)} … {mm3(max)} <span style={{ color: C.faint }}>mm</span></span></div>);
}
function Pictogram({ type, color }) {
  const holeR = 46, shaftR = type === "clearance" ? holeR - 9 : type === "interference" ? holeR - 1 : holeR - 4, over = type === "interference";
  return (
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r={holeR + 8} fill="#EDEDEA" />
      <circle cx="60" cy="60" r={holeR} fill={type === "clearance" ? C.clearBg : "#fff"} stroke={C.hole} strokeWidth="2.5" />
      <circle cx="60" cy="60" r={over ? holeR + 3 : shaftR} fill={over ? C.interBg : C.shaftBg} stroke={C.shaft} strokeWidth="2.5" />
      {over && <circle cx="60" cy="60" r={holeR} fill="none" stroke={C.inter} strokeWidth="1.5" strokeDasharray="3 2" />}
      <text x="60" y="64" textAnchor="middle" fontFamily={MONO} fontSize="10" fill={color} fontWeight="600">{type === "clearance" ? "gap" : type === "interference" ? "press" : "≈"}</text>
    </svg>
  );
}
function ZoneDiagram({ hole, shaft, shaftT, um }) {
  const W = 460, H = 196, padL = 8, zx1 = 96, zw = 120, gap = 36;
  const vals = [hole.ES, hole.EI, shaft.es, shaft.ei, 0];
  if (shaftT) { vals.push(shaftT.es, shaftT.ei); }
  let vmax = Math.max(...vals), vmin = Math.min(...vals);
  const pad = Math.max(5, (vmax - vmin) * 0.25); vmax += pad; vmin -= pad;
  const Y = (v) => 24 + (1 - (v - vmin) / (vmax - vmin)) * (H - 48);
  const y0 = Y(0), step = niceStep((vmax - vmin) / 5), ticks = [];
  for (let t = Math.ceil(vmin / step) * step; t <= vmax; t += step) ticks.push(Math.round(t));
  const Zone = (x, top, bot, col, bg, label, opacity = 1, dash) => (
    <g opacity={opacity}>
      <rect x={x} y={Y(top)} width={zw} height={Math.max(2, Y(bot) - Y(top))} fill={bg} stroke={col} strokeWidth="1.6" rx="2" strokeDasharray={dash} />
      <text x={x + zw / 2} y={Y(top) - 7} textAnchor="middle" fontSize="11" fill={col} fontWeight="600">{label}</text>
      <text x={x + zw + 6} y={Y(top) + 4} fontSize="10" fontFamily={MONO} fill={C.sub}>{um(top)}</text>
      <text x={x + zw + 6} y={Y(bot) + 4} fontSize="10" fontFamily={MONO} fill={C.sub}>{um(bot)}</text>
    </g>
  );
  const sx = zx1 + zw + gap;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: "block" }} fontFamily={SANS}>
        {ticks.map((t, i) => (<g key={i}><line x1={zx1 - 6} y1={Y(t)} x2={W - 10} y2={Y(t)} stroke="#F0F0EE" /><text x={padL} y={Y(t) + 3} fontSize="9" fontFamily={MONO} fill={C.faint}>{t > 0 ? "+" + t : t}</text></g>))}
        <line x1={zx1 - 6} y1={y0} x2={W - 10} y2={y0} stroke={C.faint} strokeDasharray="4 3" strokeWidth="1.2" />
        <text x={padL} y={y0 - 4} fontSize="9" fontFamily={MONO} fill={C.ink}>0</text>
        {Zone(zx1, hole.ES, hole.EI, C.hole, C.holeBg, "Hole")}
        {shaftT ? (
          <>
            {Zone(sx, shaft.es, shaft.ei, C.shaft, C.shaftBg, "20 °C", 0.32, "4 3")}
            {Zone(sx, shaftT.es, shaftT.ei, C.shaft, C.shaftBg, "at T", 1)}
          </>
        ) : (
          Zone(sx, shaft.es, shaft.ei, C.shaft, C.shaftBg, "Shaft")
        )}
      </svg>
    </div>
  );
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
