/**
 * Thermal tolerance stack-up. A 1-D stack of dimensions, each on its own
 * material, evaluated at an operating temperature instead of only the 20 °C
 * reference. Different CTEs make the gap drift with temperature (differential
 * expansion) — the effect this module exists to expose.
 *
 * Reuses the verified expansion math in thermalFit. The conventional model is
 * applied: a dimension's NOMINAL/mean position scales with temperature,
 *
 *     mean_i(T) = mean_i,20 · (1 + α_i · (T − 20))
 *
 * while its manufacturing tolerance (specified at 20 °C) is held constant — the
 * thermal scaling of a ± tolerance is sub-micron and conventionally ignored.
 *
 * Because each mean is linear in T, the gap is linear in T:
 *     gap(T) = gap20 + B · (T − 20),   B = Σ dir_i · mean_i,20 · α_i
 * which gives an exact operating-temperature window in closed form.
 *
 * Pure and UI-free for unit testing. Lengths in mm, temperatures in °C.
 */

import { expandLimit, REFERENCE_TEMP_C } from "./thermalFit";

export { cteToAlphaPerK, REFERENCE_TEMP_C } from "./thermalFit";

const erf = (x: number): number => {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax));
  return s * y;
};

/** Normal CDF at x for mean µ, std-dev σ. */
export function normalCdf(x: number, mu: number, sd: number): number {
  if (sd <= 0) return x >= mu ? 1 : 0;
  return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
}

export interface ThermalDim {
  id: number;
  name: string;
  /** Nominal length at 20 °C, mm. */
  nominal: number;
  /** Signed upper/lower deviations at 20 °C, mm (e.g. +0.10 / −0.10). */
  upper: number;
  lower: number;
  /** +1 adds to the gap, −1 subtracts. */
  dir: number;
  /** Mean CTE, 1/K (use cteToAlphaPerK on a µm/m·K value). */
  alphaPerK: number;
}

export interface ThermalStackInput {
  dims: ThermalDim[];
  /** Operating temperature, °C. */
  tempC: number;
  /** Tolerance corresponds to ± k·σ (usually 3). */
  k: number;
  /** Spec window on the gap, mm. null = unbounded on that side. */
  lsl: number | null;
  usl: number | null;
}

export interface DimContribution {
  id: number;
  name: string;
  /** Signed thermal shift this dimension adds to the gap from 20 °C → T, mm. */
  shift: number;
  /** Share of the total |shift| (%). */
  shiftPct: number;
  /** Share of the RSS variance (%). */
  varPct: number;
}

export interface Capability {
  cpk: number;
  yield: number;
  ppm: number;
}

export interface ThermalStackResult {
  gap20: number;
  gapT: number;
  /** gapT − gap20 (signed). */
  shift: number;
  /** dB/dT slope of the gap, mm/K. */
  slopePerK: number;
  wcMin: number;
  wcMax: number;
  wcHalf: number;
  sdRss: number;
  rss: Capability;
  contributions: DimContribution[];
  /** Temperatures where the nominal gap enters/leaves spec, °C (null = unbounded). */
  tempWindowLow: number | null;
  tempWindowHigh: number | null;
  /** Is the operating temperature T itself inside the nominal-gap window? */
  inWindowAtT: boolean;
  hasSpec: boolean;
}

/** Mean (centre) of a dimension at 20 °C, including any asymmetric tolerance. */
function meanBase(d: ThermalDim): number {
  return d.nominal + (d.upper + d.lower) / 2;
}

/** Nominal gap (sum of signed, thermally-expanded means) at temperature T. */
export function gapAtTemp(dims: ThermalDim[], tempC: number): number {
  return dims.reduce((s, d) => s + d.dir * expandLimit(meanBase(d), d.alphaPerK, tempC), 0);
}

function capability(gap: number, sd: number, lsl: number | null, usl: number | null): Capability {
  if (sd <= 0) {
    const inSpec = (usl === null || gap <= usl) && (lsl === null || gap >= lsl);
    return { cpk: Infinity, yield: inSpec ? 1 : 0, ppm: inSpec ? 0 : 1e6 };
  }
  const yld =
    (usl !== null ? normalCdf(usl, gap, sd) : 1) - (lsl !== null ? normalCdf(lsl, gap, sd) : 0);
  const cpu = usl !== null ? (usl - gap) / (3 * sd) : Infinity;
  const cpl = lsl !== null ? (gap - lsl) / (3 * sd) : Infinity;
  return { cpk: Math.min(cpu, cpl), yield: yld, ppm: (1 - yld) * 1e6 };
}

export function analyzeThermalStack(input: ThermalStackInput): ThermalStackResult {
  const { dims, tempC } = input;
  const k = Math.max(1e-4, input.k);
  const dT = tempC - REFERENCE_TEMP_C;

  const gap20 = gapAtTemp(dims, REFERENCE_TEMP_C);
  const gapT = gapAtTemp(dims, tempC);
  const shift = gapT - gap20;
  // gap(T) = gap20 + B·(T−20); B is the per-kelvin slope.
  const slopePerK = dims.reduce((s, d) => s + d.dir * meanBase(d) * d.alphaPerK, 0);

  // Tolerances held at their 20 °C values.
  const halves = dims.map((d) => Math.abs(d.upper - d.lower) / 2);
  const wcHalf = halves.reduce((s, h) => s + h, 0);
  const variances = halves.map((h) => (h / k) ** 2);
  const varTot = variances.reduce((s, v) => s + v, 0);
  const sdRss = Math.sqrt(varTot);

  const rss = capability(gapT, sdRss, input.lsl, input.usl);

  const contributions: DimContribution[] = dims.map((d, i) => ({
    id: d.id,
    name: d.name,
    shift: d.dir * meanBase(d) * d.alphaPerK * dT,
    shiftPct: 0,
    varPct: varTot > 0 ? (variances[i] / varTot) * 100 : 0,
  }));
  const shiftAbs = contributions.reduce((s, c) => s + Math.abs(c.shift), 0);
  contributions.forEach((c) => {
    c.shiftPct = shiftAbs > 0 ? (Math.abs(c.shift) / shiftAbs) * 100 : 0;
  });
  contributions.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));

  // Operating-temperature window where the nominal gap stays within spec.
  const window = temperatureWindow(gap20, slopePerK, input.lsl, input.usl);
  const inWindowAtT =
    (input.usl === null || gapT <= input.usl) && (input.lsl === null || gapT >= input.lsl);

  return {
    gap20, gapT, shift, slopePerK,
    wcMin: gapT - wcHalf, wcMax: gapT + wcHalf, wcHalf,
    sdRss, rss, contributions,
    tempWindowLow: window.low, tempWindowHigh: window.high,
    inWindowAtT,
    hasSpec: input.lsl !== null || input.usl !== null,
  };
}

/**
 * Temperatures at which the nominal gap = gap20 + slope·(T−20) stays within
 * [lsl, usl]. Returns the inclusive [low, high] window; null bounds mean
 * unbounded on that side (no spec limit, or a flat gap that is in spec).
 */
export function temperatureWindow(
  gap20: number,
  slopePerK: number,
  lsl: number | null,
  usl: number | null,
): { low: number | null; high: number | null } {
  if (Math.abs(slopePerK) < 1e-12) {
    // Gap independent of temperature.
    const ok = (usl === null || gap20 <= usl) && (lsl === null || gap20 >= lsl);
    return ok ? { low: null, high: null } : { low: NaN, high: NaN };
  }
  const tempAt = (target: number) => REFERENCE_TEMP_C + (target - gap20) / slopePerK;
  // Each spec limit maps to a temperature; rising vs falling gap decides which bounds low/high.
  const tLsl = lsl !== null ? tempAt(lsl) : null;
  const tUsl = usl !== null ? tempAt(usl) : null;
  let low: number | null;
  let high: number | null;
  if (slopePerK > 0) {
    // gap rises with T: LSL sets the low bound, USL the high bound.
    low = tLsl;
    high = tUsl;
  } else {
    // gap falls with T: USL sets the low bound, LSL the high bound.
    low = tUsl;
    high = tLsl;
  }
  return { low, high };
}
