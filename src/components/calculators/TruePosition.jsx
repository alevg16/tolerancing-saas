"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Printer, AlertTriangle, Check, X } from "lucide-react";
import {
  analyzeTruePosition,
  coordToPositionTol,
  roundVsSquareGain,
  floatingFastenerTol,
  fixedFastenerTol,
} from "@/lib/truePosition";

const C = {
  ink: "#16181B", sub: "#5C6066", faint: "#8A8F96", line: "#E4E5E1", paper: "#F2F3F1",
  panel: "#FFFFFF", accent: "#1C6E8C", accentBg: "#E5EEF2",
  ok: "#1F7A4D", okBg: "#E8F2EC", warn: "#B5862B", warnBg: "#F7F1E2", fail: "#B23A48", failBg: "#F7E9EB",
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const numOr = (v, fb = 0) => { const p = parseFloat(v); return isNaN(p) ? fb : p; };
const fmt = (v, d = 3) => (v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(d));

const MOD = { RFS: "Ⓢ RFS", MMC: "Ⓜ MMC", LMC: "Ⓛ LMC" };

/**
 * True position (GD&T) with material-condition bonus tolerance. Verify a
 * measured feature against its position tolerance — including the MMC/LMC
 * bonus — and size the tolerance from a pin-in-hole fit. Diametral zone
 * convention (ASME Y14.5 / ISO 1101). Persistable via initialState/onStateChange.
 */
export default function TruePosition({ initialState, onStateChange } = {}) {
  const init = initialState && Object.keys(initialState).length ? initialState : null;
  const [type, setType] = useState(init?.type ?? "internal");
  const [modifier, setModifier] = useState(init?.modifier ?? "MMC");
  const [sizeMin, setSizeMin] = useState(init?.sizeMin ?? "10.00");
  const [sizeMax, setSizeMax] = useState(init?.sizeMax ?? "10.20");
  const [actualSize, setActualSize] = useState(init?.actualSize ?? "10.10");
  const [positionTol, setPositionTol] = useState(init?.positionTol ?? "0.25");
  const [dx, setDx] = useState(init?.dx ?? "0.06");
  const [dy, setDy] = useState(init?.dy ?? "0.08");
  // design helper
  const [holeMMC, setHoleMMC] = useState(init?.holeMMC ?? "10.50");
  const [fastenerMMC, setFastenerMMC] = useState(init?.fastenerMMC ?? "10.00");
  const [fastenerMode, setFastenerMode] = useState(init?.fastenerMode ?? "floating");

  useEffect(() => {
    onStateChange?.({ type, modifier, sizeMin, sizeMax, actualSize, positionTol, dx, dy, holeMMC, fastenerMMC, fastenerMode });
  }, [type, modifier, sizeMin, sizeMax, actualSize, positionTol, dx, dy, holeMMC, fastenerMMC, fastenerMode, onStateChange]);

  const r = useMemo(() => analyzeTruePosition({
    dx: numOr(dx), dy: numOr(dy), positionTol: numOr(positionTol),
    type, modifier, sizeMin: numOr(sizeMin), sizeMax: numOr(sizeMax), actualSize: numOr(actualSize),
  }), [dx, dy, positionTol, type, modifier, sizeMin, sizeMax, actualSize]);

  const fastenerTol = useMemo(() => {
    const clearance = numOr(holeMMC) - numOr(fastenerMMC);
    const per = fastenerMode === "fixed" ? fixedFastenerTol(numOr(holeMMC), numOr(fastenerMMC)) : floatingFastenerTol(numOr(holeMMC), numOr(fastenerMMC));
    return { clearance, per };
  }, [holeMMC, fastenerMMC, fastenerMode]);

  const coordEq = coordToPositionTol(numOr(dx), numOr(dy));
  const areaGain = roundVsSquareGain(1, 1); // equal-axis illustration = 57%
  const vColor = r.pass ? C.ok : C.fail;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`*{-webkit-font-smoothing:antialiased;box-sizing:border-box}input,select{outline:none;font-family:${MONO}}input:focus,select:focus{border-color:${C.accent}!important}.mono{font-family:${MONO};font-variant-numeric:tabular-nums}@media print{.no-print{display:none!important}}`}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 22px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: C.faint }}>True Position · GD&amp;T · ASME Y14.5</div>
          <button onClick={() => window.print()} className="no-print mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.sub, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Printer size={13} /> Save as PDF</button>
        </div>

        {/* ===== 1 FEATURE ===== */}
        <Step n="1" label="The feature" />
        <Panel title="What you're locating" hint="size limits & material-condition modifier">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, alignItems: "end" }}>
            <Field label="Feature type">
              <Toggle value={type} onChange={setType} options={[["internal", "Hole"], ["external", "Pin"]]} />
            </Field>
            <Field label="Modifier" hint="Ⓜ gives bonus tolerance">
              <Toggle value={modifier} onChange={setModifier} options={[["RFS", "RFS"], ["MMC", "Ⓜ"], ["LMC", "Ⓛ"]]} />
            </Field>
            <Field label="Size min"><input value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Size max"><input value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Actual size" hint="as measured"><input value={actualSize} onChange={(e) => setActualSize(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%", borderColor: r.sizeInSpec ? C.line : C.fail }} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Chip label="MMC" value={fmt(r.mmc, 3)} c={C.accent} />
            <Chip label="LMC" value={fmt(r.lmc, 3)} c={C.sub} />
            <Chip label="bonus" value={modifier === "RFS" ? "none (RFS)" : `+${fmt(r.bonus, 3)}`} c={r.bonus > 0 ? C.ok : C.faint} />
            {!r.sizeInSpec && <Chip label="size" value="out of limits" c={C.fail} />}
          </div>
        </Panel>

        {/* ===== 2 MEASURED ===== */}
        <Step n="2" label="Measured position" />
        <Panel title="Where the axis actually sits" hint="offset from true (basic) position, mm">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14 }}>
            <Field label="ΔX (meas − true)"><input value={dx} onChange={(e) => setDx(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="ΔY (meas − true)"><input value={dy} onChange={(e) => setDy(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label={`Position tol ${MOD[modifier]}`} hint="diametral, Ø"><input value={positionTol} onChange={(e) => setPositionTol(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>The position zone is a cylinder, so the deviation is diametral — twice the radial distance: 2·√(ΔX²+ΔY²) = {fmt(r.deviation, 3)} mm. A ±box of {fmt(numOr(dx), 3)}/{fmt(numOr(dy), 3)} would need Ø{fmt(coordEq, 3)} to contain the same corner.</div>
        </Panel>

        {/* ===== 3 RESULT ===== */}
        <Step n="3" label="Result" />
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 22, fontWeight: 650, color: vColor }}>
              {r.pass ? <Check size={22} /> : <X size={22} />}{r.pass ? "In tolerance" : (!r.sizeInSpec ? "Size out of spec" : "Out of position")}
            </span>
            <span className="mono" style={{ fontSize: 13, color: C.sub, background: C.paper, borderRadius: 6, padding: "4px 9px" }}>Ø{fmt(r.deviation, 3)} of Ø{fmt(r.totalTol, 3)} · {fmt(r.utilization * 100, 0)}% used</span>
          </div>
          <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
            <TargetPlot dx={numOr(dx)} dy={numOr(dy)} stated={numOr(positionTol)} total={r.totalTol} pass={r.pass} />
            <div style={{ flex: 1, minWidth: 230 }}>
              <UtilBar deviation={r.deviation} total={r.totalTol} stated={numOr(positionTol)} pass={r.pass} />
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 16 }}>
                <Mini label="deviation" value={fmt(r.deviation, 3)} unit="mm" />
                <Mini label="allowed (stated + bonus)" value={fmt(r.totalTol, 3)} unit="mm" hint={`Ø${fmt(numOr(positionTol), 3)} + ${fmt(r.bonus, 3)}`} />
                <Mini label="margin" value={fmt(r.margin, 3)} unit="mm" c={r.margin >= 0 ? C.ok : C.fail} />
                {r.vcDefined && <Mini label="virtual condition" value={fmt(r.virtualCondition, 3)} unit="mm" hint={type === "internal" ? "MMC − tol" : "MMC + tol"} c={C.sub} />}
              </div>
            </div>
          </div>
        </Panel>

        {/* ===== DESIGN ===== */}
        <Step n="4" label="Pin in hole — size the tolerance" />
        <Panel title="Allowable position tolerance from the fit" hint="floating vs fixed fastener">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, alignItems: "end" }}>
            <Field label="Hole Ø at MMC" hint="smallest hole"><input value={holeMMC} onChange={(e) => setHoleMMC(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Fastener Ø at MMC" hint="largest pin/bolt"><input value={fastenerMMC} onChange={(e) => setFastenerMMC(e.target.value)} inputMode="decimal" style={{ ...inp, width: "100%" }} /></Field>
            <Field label="Fastener case">
              <Toggle value={fastenerMode} onChange={setFastenerMode} options={[["floating", "Floating"], ["fixed", "Fixed"]]} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14, alignItems: "baseline" }}>
            <Mini label="clearance" value={fmt(fastenerTol.clearance, 3)} unit="mm" hint="hole − fastener" c={C.sub} />
            <Mini label={`position tol per part (${fastenerMode})`} value={`Ø${fmt(fastenerTol.per, 3)}`} c={fastenerTol.per > 0 ? C.accent : C.fail} hint={fastenerMode === "fixed" ? "clearance / 2" : "= clearance"} />
            <button onClick={() => setPositionTol(fmt(Math.max(0, fastenerTol.per), 3))} className="no-print mono" style={{ fontSize: 11.5, color: C.accent, background: C.accentBg, border: `1px solid ${C.accent}44`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}>↑ use as position tol above</button>
          </div>
          {fastenerTol.per <= 0 && <WarnNote>No clearance — the largest fastener doesn&apos;t fit the smallest hole, so there&apos;s no position tolerance to give away. Open up the hole or shrink the fastener.</WarnNote>}
          <div className="mono" style={{ fontSize: 10.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>
            Floating fastener (clearance holes in both parts): each part gets Ø(H−F). Fixed fastener (one part threaded/dowelled): each gets Ø(H−F)/2. Apply at Ⓜ so the parts earn bonus as holes open up.
          </div>
        </Panel>

        <Panel title="Why a round zone, and why Ⓜ" hint="the two ideas this tool encodes">
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 8px" }}><b style={{ color: C.ink }}>Round beats the ± box.</b> A cylindrical position zone keeps the same per-axis limit but accepts the corners too — about <b className="mono" style={{ color: C.ok }}>{fmt(areaGain * 100, 0)}% more</b> zone area than the equivalent ± square. The dashed square in the plot is that ± box.</p>
            <p style={{ margin: "0 0 8px" }}><b style={{ color: C.ink }}>Ⓜ pays a bonus.</b> At maximum material condition the stated tolerance applies. As the feature departs toward least material (the hole opens up / the pin shrinks) the extra clearance becomes usable position tolerance: <span className="mono">bonus = |actual − MMC|</span>. Here that&apos;s <b className="mono" style={{ color: r.bonus > 0 ? C.ok : C.faint }}>+{fmt(r.bonus, 3)} mm</b>, lifting the allowance to Ø{fmt(r.totalTol, 3)}.</p>
            <p style={{ margin: 0 }}>The constant worst-case mating boundary is the <b style={{ color: C.ink }}>virtual condition</b>{r.vcDefined ? <> — here Ø{fmt(r.virtualCondition, 3)} — which a functional gauge pin/hole would check in one shot.</> : <> (defined under Ⓜ).</>}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const inp = { fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", width: 70, background: "#fff", textAlign: "center" };

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
function Chip({ label, value, c }) { return (<span className="mono" style={{ fontSize: 11, color: c, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "4px 9px" }}>{label} <b>{value}</b></span>); }
function WarnNote({ children }) {
  return (<div className="mono" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: C.warn, background: C.warnBg, border: `1px solid ${C.warn}44`, borderRadius: 7, padding: "8px 11px", marginTop: 12, lineHeight: 1.55 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{children}</span></div>);
}
function Toggle({ value, onChange, options }) {
  return (
    <div className="mono" style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: `1px solid ${C.line}` }}>
      {options.map(([v, l]) => { const on = value === v; return <button key={v} onClick={() => onChange(v)} style={{ flex: 1, padding: "8px 4px", fontSize: 12, border: "none", cursor: "pointer", background: on ? C.accent : "#fff", color: on ? "#fff" : C.faint }}>{l}</button>; })}
    </div>
  );
}
function UtilBar({ deviation, total, stated, pass }) {
  const pct = total > 0 ? Math.min(100, (deviation / total) * 100) : 0;
  const statedPct = total > 0 ? (stated / total) * 100 : 0;
  const barC = pass ? C.ok : C.fail;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.ink }}>Tolerance used</span>
        <span className="mono" style={{ fontSize: 12, color: C.sub }}>Ø{fmt(deviation, 3)} / Ø{fmt(total, 3)}</span>
      </div>
      <div style={{ position: "relative", height: 16, background: C.paper, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barC, opacity: 0.85, borderRadius: 4, transition: "width .2s" }} />
        {/* stated-tolerance marker: bonus is everything to its right */}
        {statedPct < 100 && <div title="stated tolerance (bonus to the right)" style={{ position: "absolute", left: `${statedPct}%`, top: -2, bottom: -2, width: 2, background: C.accent }} />}
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: C.faint, marginTop: 5 }}>marker = stated Ø{fmt(stated, 3)}; the band beyond it is the Ⓜ bonus.</div>
    </div>
  );
}

function TargetPlot({ dx, dy, stated, total, pass }) {
  const S = 200, cx = S / 2, cy = S / 2, half = 84;
  const rTotal = total / 2, rStated = stated / 2;
  const ext = Math.max(rTotal, Math.abs(dx), Math.abs(dy), 1e-4) * 1.18;
  const k = half / ext; // px per mm
  const px = (mm) => mm * k;
  const ptx = cx + px(dx), pty = cy - px(dy); // screen y is flipped
  const col = pass ? C.ok : C.fail;
  const sqHalf = px(rTotal) / Math.SQRT2; // square inscribed in the total circle
  return (
    <div>
      <svg viewBox={`0 0 ${S} ${S}`} width="200" height="200" fontFamily={SANS}>
        {/* datum crosshair */}
        <line x1={cx} y1={10} x2={cx} y2={S - 10} stroke={C.line} strokeWidth="1" strokeDasharray="3 3" />
        <line x1={10} y1={cy} x2={S - 10} y2={cy} stroke={C.line} strokeWidth="1" strokeDasharray="3 3" />
        {/* bonus annulus (stated → total) */}
        {rTotal > rStated && <circle cx={cx} cy={cy} r={px(rTotal)} fill={pass ? C.okBg : C.failBg} stroke="none" />}
        {/* ± square inscribed in the round zone (round gives the corners for free) */}
        <rect x={cx - sqHalf} y={cy - sqHalf} width={sqHalf * 2} height={sqHalf * 2} fill="none" stroke={C.faint} strokeWidth="1" strokeDasharray="3 2" />
        {/* stated zone */}
        <circle cx={cx} cy={cy} r={px(rStated)} fill="#fff" stroke={C.accent} strokeWidth="1.4" strokeDasharray="4 3" />
        {/* total zone */}
        <circle cx={cx} cy={cy} r={px(rTotal)} fill="none" stroke={col} strokeWidth="2" />
        {/* deviation vector + point */}
        <line x1={cx} y1={cy} x2={ptx} y2={pty} stroke={col} strokeWidth="1.3" />
        <circle cx={ptx} cy={pty} r="4.2" fill={col} stroke="#fff" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="1.6" fill={C.ink} />
      </svg>
      <div className="mono" style={{ fontSize: 9.5, color: C.faint, textAlign: "center", marginTop: -4, lineHeight: 1.5 }}>
        <span style={{ color: C.accent }}>– – stated Ø{fmt(stated, 2)}</span> · <span style={{ color: col }}>total Ø{fmt(total, 2)}</span><br />dashed square = the ± box it beats
      </div>
    </div>
  );
}
