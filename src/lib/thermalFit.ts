/**
 * Thermal fit-at-temperature math for ISO 286 hole/shaft fits.
 *
 * Pure and UI-free so it can be unit-tested and reused (e.g. by the stack-up
 * module later). Reference temperature is 20 °C (ISO 1). A dimension specified
 * at 20 °C becomes, at temperature T:
 *
 *     L(T) = L20 * (1 + alpha * (T - 20))
 *
 * where `alpha` is the mean coefficient of linear thermal expansion over
 * 20 → T, in 1/K. UI inputs CTE in µm/m·K; convert with `cteToAlphaPerK`.
 *
 * The linear mean-CTE model is for moderate temperatures only. Cryogenic
 * ranges need integrated thermal-contraction data — guard at the UI.
 */

export const REFERENCE_TEMP_C = 20;

/** Hard cutoff: below this the linear mean-CTE model must not be used. */
export const CRYO_LIMIT_C = -50;
/** Soft-warn band: outside this, mean-CTE linearity is only approximate. */
export const SOFT_MIN_C = -50;
export const SOFT_MAX_C = 300;

export type FitCategory = "clearance" | "transition" | "interference";

export interface Material {
  id: string;
  name: string;
  /** Nominal mean CTE 20–100 °C in µm/m·K. Indicative & overridable — verify. */
  cteUmPerMK: number;
  source: string;
}

export interface FitAtTemperatureInput {
  /** ISO 286 limits at 20 °C, in mm. */
  holeMin20: number;
  holeMax20: number;
  shaftMin20: number;
  shaftMax20: number;
  /** Mean CTE of each part, in 1/K (use cteToAlphaPerK on a µm/m·K value). */
  alphaHolePerK: number;
  alphaShaftPerK: number;
  /** Each part's own temperature in °C (equal for uniform temperature). */
  holeTempC: number;
  shaftTempC: number;
}

export interface FitAtTemperature {
  clearanceMinUm: number;
  clearanceMaxUm: number;
  category: FitCategory;
}

/** µm/m·K → 1/K. */
export function cteToAlphaPerK(cteUmPerMK: number): number {
  return cteUmPerMK * 1e-6;
}

/** A length specified at 20 °C, evaluated at temperature T (same unit as L20). */
export function expandLimit(L20: number, alphaPerK: number, T: number): number {
  return L20 * (1 + alphaPerK * (T - REFERENCE_TEMP_C));
}

export function categorize(
  clearanceMinUm: number,
  clearanceMaxUm: number,
): FitCategory {
  if (clearanceMinUm >= 0) return "clearance";
  if (clearanceMaxUm <= 0) return "interference";
  return "transition";
}

/**
 * Clearance (hole − shaft) at temperature, in µm, with each part on its own
 * material CTE and temperature. Negative clearance is interference.
 */
export function fitAtTemperature(
  input: FitAtTemperatureInput,
): FitAtTemperature {
  const holeMinT = expandLimit(input.holeMin20, input.alphaHolePerK, input.holeTempC);
  const holeMaxT = expandLimit(input.holeMax20, input.alphaHolePerK, input.holeTempC);
  const shaftMinT = expandLimit(input.shaftMin20, input.alphaShaftPerK, input.shaftTempC);
  const shaftMaxT = expandLimit(input.shaftMax20, input.alphaShaftPerK, input.shaftTempC);

  const clearanceMaxUm = (holeMaxT - shaftMinT) * 1000;
  const clearanceMinUm = (holeMinT - shaftMaxT) * 1000;

  return {
    clearanceMinUm,
    clearanceMaxUm,
    category: categorize(clearanceMinUm, clearanceMaxUm),
  };
}

/**
 * Seed materials — nominal mean CTE 20–100 °C in µm/m·K. Indicative only and
 * overridable in the UI; the `source` is shown so values are never presented
 * as authoritative.
 */
export const MATERIALS: Material[] = [
  { id: "al-6082-t6", name: "Aluminium 6082-T6", cteUmPerMK: 23.4, source: "EN 485 / ASM" },
  { id: "al-6061-t6", name: "Aluminium 6061-T6", cteUmPerMK: 23.6, source: "ASM" },
  { id: "al-5083", name: "Aluminium 5083", cteUmPerMK: 24.2, source: "ASM" },
  { id: "al-2024-t3", name: "Aluminium 2024-T3", cteUmPerMK: 23.2, source: "ASM" },
  { id: "ss-304", name: "Stainless 304 (1.4301)", cteUmPerMK: 17.3, source: "austenitic ~16–17.5; ASM" },
  { id: "ss-316", name: "Stainless 316 (1.4401)", cteUmPerMK: 16.0, source: "ASM" },
  { id: "steel-mild", name: "Carbon steel (mild)", cteUmPerMK: 11.7, source: "ASM" },
  { id: "steel-4140", name: "Alloy steel 4140", cteUmPerMK: 12.3, source: "ASM" },
  { id: "ti-6al-4v", name: "Ti-6Al-4V (Gr5)", cteUmPerMK: 8.6, source: "ASM" },
  { id: "cu-c101", name: "Copper OFHC (C101)", cteUmPerMK: 16.6, source: "ASM" },
  { id: "brass-cuzn", name: "Brass (CuZn)", cteUmPerMK: 20.5, source: "ASM" },
  { id: "invar-feni36", name: "Invar (FeNi36)", cteUmPerMK: 1.2, source: "supplier; verify" },
];

export function materialById(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id);
}
