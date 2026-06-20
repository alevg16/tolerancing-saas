/**
 * GD&T-aware tolerance stack-up. A 1-D stack whose contributors can be plain ±
 * dimensions OR geometric callouts (position, profile, orientation, form,
 * runout). Each geometric callout is converted to its equivalent ± half-
 * tolerance so it can be summed with ordinary dimensions — the bridge between
 * the GD&T analyzer and a stack.
 *
 * Conversion (ASME Y14.5 zones projected onto the stack direction):
 *   ± size                 half = |upper − lower| / 2
 *   position (Ø zone)      half = (T + bonus) / 2     ← diametral zone, radius
 *   profile (total width)  half = T / 2
 *   orientation            half = (T + bonus) / 2
 *   form (flatness…)       half = T / 2
 *   runout (FIM)           half = T / 2
 *
 * Bonus (departure from MMC) is creditable only on position & orientation of a
 * feature of size. For a worst-case stack the conservative choice is bonus = 0
 * (the virtual-condition boundary); credit bonus only to model an as-measured
 * size. Pure and UI-free for unit testing. Lengths in mm.
 */

import { normalCdf } from "./thermalStack";
export { normalCdf } from "./thermalStack";

export type ContribType = "size" | "position" | "profile" | "orientation" | "flatness" | "runout";

export interface ContribTypeDef {
  id: ContribType;
  label: string;
  symbol: string;
  geometric: boolean;
  allowsBonus: boolean;
  note: string;
}

export const CONTRIB_TYPES: ContribTypeDef[] = [
  { id: "size", label: "± Size", symbol: "±", geometric: false, allowsBonus: false, note: "plain dimensional tolerance" },
  { id: "position", label: "Position", symbol: "⌖", geometric: true, allowsBonus: true, note: "Ø zone → ±T/2; Ⓜ bonus creditable" },
  { id: "profile", label: "Profile", symbol: "⌓", geometric: true, allowsBonus: false, note: "total-wide zone → ±T/2" },
  { id: "orientation", label: "Orientation", symbol: "⊥", geometric: true, allowsBonus: true, note: "zone → ±T/2; Ⓜ bonus creditable" },
  { id: "flatness", label: "Form", symbol: "⏥", geometric: true, allowsBonus: false, note: "form zone → ±T/2" },
  { id: "runout", label: "Runout", symbol: "↗", geometric: true, allowsBonus: false, note: "FIM → ±T/2" },
];

export function contribTypeDef(id: ContribType): ContribTypeDef {
  return CONTRIB_TYPES.find((t) => t.id === id) ?? CONTRIB_TYPES[0];
}

export interface StackContributor {
  id: number;
  name: string;
  type: ContribType;
  /** +1 adds to the gap, −1 subtracts. */
  dir: number;
  /** Size inputs (used when type === "size"). */
  nominal: number;
  upper: number;
  lower: number;
  /** Geometric inputs (used for geometric types). */
  geoTol: number;
  bonus: number;
}

/** Equivalent ± half-tolerance of a contributor. */
export function contributorHalf(c: StackContributor): number {
  if (c.type === "size") return Math.abs(c.upper - c.lower) / 2;
  const def = contribTypeDef(c.type);
  const bonus = def.allowsBonus ? Math.max(0, c.bonus) : 0;
  return (Math.max(0, c.geoTol) + bonus) / 2;
}

/** Mean (centre) contribution of a contributor to the gap nominal. */
export function contributorMean(c: StackContributor): number {
  return c.type === "size" ? c.nominal + (c.upper + c.lower) / 2 : c.nominal;
}

export interface StackContribResult {
  id: number;
  name: string;
  type: ContribType;
  half: number;
  varPct: number;
}

export interface Capability {
  cpk: number;
  yield: number;
  ppm: number;
}

export interface GdtStackResult {
  gapNominal: number;
  wcMin: number;
  wcMax: number;
  wcHalf: number;
  sdRss: number;
  rss: Capability;
  contributions: StackContribResult[];
  hasSpec: boolean;
}

export interface GdtStackInput {
  contributors: StackContributor[];
  /** Tolerance corresponds to ± k·σ (usually 3). */
  k: number;
  lsl: number | null;
  usl: number | null;
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

export function analyzeGdtStack(input: GdtStackInput): GdtStackResult {
  const k = Math.max(1e-4, input.k);
  const halves = input.contributors.map(contributorHalf);
  const gapNominal = input.contributors.reduce((s, c) => s + c.dir * contributorMean(c), 0);
  const wcHalf = halves.reduce((s, h) => s + h, 0);
  const variances = halves.map((h) => (h / k) ** 2);
  const varTot = variances.reduce((s, v) => s + v, 0);
  const sdRss = Math.sqrt(varTot);
  const rss = capability(gapNominal, sdRss, input.lsl, input.usl);
  const contributions: StackContribResult[] = input.contributors.map((c, i) => ({
    id: c.id, name: c.name, type: c.type, half: halves[i],
    varPct: varTot > 0 ? (variances[i] / varTot) * 100 : 0,
  }));
  contributions.sort((a, b) => b.varPct - a.varPct);
  return {
    gapNominal,
    wcMin: gapNominal - wcHalf, wcMax: gapNominal + wcHalf, wcHalf,
    sdRss, rss, contributions,
    hasSpec: input.lsl !== null || input.usl !== null,
  };
}
