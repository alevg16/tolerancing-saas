/**
 * Press-/shrink-fit analysis for thick-wall cylinders (Lamé equations).
 *
 * Pure and UI-free so it can be unit-tested and reused. An inner member
 * (shaft, bore d_i; d_i = 0 ⇒ solid) is assembled into an outer member
 * (hub, OD d_o); they meet at the interface diameter d_f with a diametral
 * interference δ. The interference is taken up elastically, producing a
 * uniform contact pressure p at the interface.
 *
 * These are exact linear-elastic results (plane stress, open-ended cylinders),
 * not estimates — so the numbers can be presented as authoritative. They assume
 * homogeneous isotropic materials, both at the same temperature, stresses below
 * yield (elastic), and a long fit (no end effects).
 *
 * UNITS — SI-mm throughout: lengths in mm, moduli/stresses/pressure in MPa
 * (N/mm²), forces in N, torque in N·mm. The UI converts E from GPa and
 * interference from µm before calling in.
 */

/** Mean coefficient of linear expansion: µm/m·K → 1/K. */
export function cteToAlphaPerK(cteUmPerMK: number): number {
  return cteUmPerMK * 1e-6;
}

/** von Mises equivalent stress from three principal stresses. */
export function vonMises(s1: number, s2: number, s3 = 0): number {
  return Math.sqrt(
    0.5 * ((s1 - s2) ** 2 + (s2 - s3) ** 2 + (s3 - s1) ** 2),
  );
}

export interface FitGeometry {
  /** Interface (nominal) diameter d_f, mm. */
  interfaceDia: number;
  /** Shaft bore d_i, mm (0 = solid shaft). */
  shaftBore: number;
  /** Hub outer diameter d_o, mm. */
  hubOuterDia: number;
}

export interface MaterialPair {
  /** Shaft Young's modulus, MPa. */
  shaftE: number;
  shaftNu: number;
  /** Hub Young's modulus, MPa. */
  hubE: number;
  hubNu: number;
}

/**
 * Lamé contact pressure (MPa) for a diametral interference `interferenceDia`
 * (mm). Each member contributes its own elastic radial compliance, so shaft and
 * hub may be different materials. Returns 0 for non-positive interference
 * (a clearance/loose state — no contact) and NaN for invalid geometry.
 */
export function contactPressure(
  geo: FitGeometry,
  mat: MaterialPair,
  interferenceDia: number,
): number {
  const df = geo.interfaceDia;
  const di = geo.shaftBore;
  const dO = geo.hubOuterDia;
  if (!(df > 0) || !(dO > df) || di < 0 || di >= df) return NaN;
  if (interferenceDia <= 0) return 0;

  const df2 = df * df;
  const di2 = di * di;
  const dO2 = dO * dO;

  // Radial compliance of each member at the interface (per unit pressure).
  const hub = (df / mat.hubE) * ((dO2 + df2) / (dO2 - df2) + mat.hubNu);
  const shaft = (df / mat.shaftE) * ((df2 + di2) / (df2 - di2) - mat.shaftNu);
  const denom = hub + shaft;
  if (!(denom > 0)) return NaN;

  return interferenceDia / denom;
}

export interface FitStresses {
  pressure: number;
  /** Hoop (tangential) stress at the hub bore — the peak tensile stress, MPa. */
  hubHoopInner: number;
  /** Hoop stress at the hub OD, MPa. */
  hubHoopOuter: number;
  /** von Mises at the hub bore (the usual governing point), MPa. */
  hubVonMises: number;
  /** Hoop stress at the shaft bore (compressive), MPa. */
  shaftHoopInner: number;
  /** von Mises at the shaft critical point, MPa. */
  shaftVonMises: number;
}

/**
 * Lamé stresses at the critical points for a given contact pressure.
 * Hub = thick cylinder under internal pressure p; shaft = under external p.
 */
export function fitStresses(geo: FitGeometry, pressure: number): FitStresses {
  const df = geo.interfaceDia;
  const di = geo.shaftBore;
  const dO = geo.hubOuterDia;
  const df2 = df * df;
  const di2 = di * di;
  const dO2 = dO * dO;
  const p = pressure;

  // Hub (outer member), internal pressure p, free OD.
  const hubHoopInner = (p * (dO2 + df2)) / (dO2 - df2); // tensile, peak
  const hubHoopOuter = (2 * p * df2) / (dO2 - df2);
  const hubVonMises = vonMises(hubHoopInner, -p, 0); // σθ, σr=−p, σz≈0

  // Shaft (inner member), external pressure p.
  let shaftHoopInner: number;
  let shaftVonMises: number;
  if (di === 0) {
    // Solid: uniform biaxial compression −p (σz ≈ 0).
    shaftHoopInner = -p;
    shaftVonMises = p;
  } else {
    // Hollow: peak compressive hoop at the bore (σr = σz = 0 there).
    shaftHoopInner = (-2 * p * df2) / (df2 - di2);
    shaftVonMises = Math.abs(shaftHoopInner);
  }

  return {
    pressure: p,
    hubHoopInner,
    hubHoopOuter,
    hubVonMises,
    shaftHoopInner,
    shaftVonMises,
  };
}

/** Axial slip force (N) and transmissible torque (N·mm) at contact pressure p. */
export function holdingCapacity(
  interfaceDia: number,
  length: number,
  mu: number,
  pressure: number,
): { axialForce: number; torque: number } {
  const area = Math.PI * interfaceDia * length; // mm²
  const axialForce = mu * pressure * area; // N
  const torque = (axialForce * interfaceDia) / 2; // N·mm
  return { axialForce, torque };
}

/**
 * Temperature change (K) that grows a diameter `df` by `(deltaDia + clearance)`
 * through expansion α — i.e. how much to heat the hub (or, negated, cool the
 * shaft) so the interference plus a slip clearance opens up for assembly.
 */
export function assemblyDeltaT(
  deltaDia: number,
  clearance: number,
  alphaPerK: number,
  df: number,
): number {
  if (alphaPerK === 0 || df === 0) return Infinity;
  return (deltaDia + clearance) / (alphaPerK * df);
}

export interface PressFitInput extends FitGeometry, MaterialPair {
  /** Minimum diametral interference (from the fit tolerance), mm. */
  interferenceMinDia: number;
  /** Maximum diametral interference, mm. */
  interferenceMaxDia: number;
  shaftSy: number;
  hubSy: number;
  /** Mean CTE of each member, 1/K. */
  shaftAlphaPerK: number;
  hubAlphaPerK: number;
  /** Engagement (contact) length, mm. */
  length: number;
  /** Coefficient of friction at the interface. */
  mu: number;
  /** Slip clearance wanted for thermal assembly, mm. */
  assemblyClearance: number;
}

export interface PressFitResult {
  valid: boolean;
  reason: string | null;
  /** Contact-pressure range over the interference tolerance, MPa. */
  pMin: number;
  pMax: number;
  /** Stresses at maximum interference (worst case for yield). */
  stress: FitStresses;
  hubSF: number;
  shaftSF: number;
  governingSF: number;
  /** Holding capacity at minimum interference (worst case for grip). */
  holdAxialForce: number; // N
  holdTorque: number; // N·mm
  /** Push-in force at maximum interference (worst case for assembly), N. */
  pressInForce: number;
  /** Heat the hub by this / cool the shaft by this to assemble (K). */
  dThubHeat: number;
  dTshaftCool: number;
}

/**
 * Full press-fit analysis over an interference range: pressure at both
 * extremes, peak stresses and yield safety factors at maximum interference,
 * grip at minimum interference, and the assembly force / shrink temperatures.
 */
export function analyzePressFit(input: PressFitInput): PressFitResult {
  const geo: FitGeometry = {
    interfaceDia: input.interfaceDia,
    shaftBore: input.shaftBore,
    hubOuterDia: input.hubOuterDia,
  };
  const mat: MaterialPair = {
    shaftE: input.shaftE,
    shaftNu: input.shaftNu,
    hubE: input.hubE,
    hubNu: input.hubNu,
  };

  const probe = contactPressure(geo, mat, Math.max(1e-9, input.interferenceMaxDia));
  if (Number.isNaN(probe)) {
    const reason =
      input.hubOuterDia <= input.interfaceDia
        ? "Hub OD must be larger than the interface diameter."
        : input.shaftBore >= input.interfaceDia
          ? "Shaft bore must be smaller than the interface diameter."
          : "Check the geometry — diameters must be positive and ordered.";
    return {
      valid: false, reason,
      pMin: 0, pMax: 0,
      stress: fitStresses(geo, 0),
      hubSF: Infinity, shaftSF: Infinity, governingSF: Infinity,
      holdAxialForce: 0, holdTorque: 0, pressInForce: 0,
      dThubHeat: 0, dTshaftCool: 0,
    };
  }

  const pMin = Math.max(0, contactPressure(geo, mat, input.interferenceMinDia));
  const pMax = Math.max(0, contactPressure(geo, mat, input.interferenceMaxDia));

  const stress = fitStresses(geo, pMax);
  const hubSF = stress.hubVonMises > 0 ? input.hubSy / stress.hubVonMises : Infinity;
  const shaftSF = stress.shaftVonMises > 0 ? input.shaftSy / stress.shaftVonMises : Infinity;
  const governingSF = Math.min(hubSF, shaftSF);

  const hold = holdingCapacity(input.interfaceDia, input.length, input.mu, pMin);
  const press = holdingCapacity(input.interfaceDia, input.length, input.mu, pMax);

  const opening = input.interferenceMaxDia + input.assemblyClearance;
  const dThubHeat = assemblyDeltaT(opening, 0, input.hubAlphaPerK, input.interfaceDia);
  const dTshaftCool = assemblyDeltaT(opening, 0, input.shaftAlphaPerK, input.interfaceDia);

  return {
    valid: true, reason: null,
    pMin, pMax, stress,
    hubSF, shaftSF, governingSF,
    holdAxialForce: hold.axialForce, holdTorque: hold.torque,
    pressInForce: press.axialForce,
    dThubHeat, dTshaftCool,
  };
}

export interface PressFitMaterial {
  id: string;
  name: string;
  /** Young's modulus, GPa (UI unit; ×1000 → MPa internally). */
  E: number;
  nu: number;
  /** Yield / 0.2 % proof strength, MPa. Indicative & overridable — verify. */
  Sy: number;
  /** Mean CTE 20–100 °C, µm/m·K. */
  cteUmPerMK: number;
  source: string;
  /** Brittle (e.g. cast iron): Sy is nominal — use a brittle-material criterion. */
  brittle?: boolean;
}

/**
 * Seed materials — indicative properties, overridable in the UI; the `source`
 * is shown so values are never presented as authoritative. Yield strengths in
 * particular depend heavily on temper/heat-treat — verify for your stock.
 */
export const PRESS_FIT_MATERIALS: PressFitMaterial[] = [
  { id: "steel-structural", name: "Carbon steel (structural)", E: 207, nu: 0.30, Sy: 250, cteUmPerMK: 11.7, source: "ASM" },
  { id: "steel-4140", name: "Alloy steel 4140 (Q&T)", E: 205, nu: 0.29, Sy: 655, cteUmPerMK: 12.3, source: "ASM; temper-dependent" },
  { id: "ss-304", name: "Stainless 304 (1.4301)", E: 193, nu: 0.30, Sy: 215, cteUmPerMK: 17.3, source: "ASM" },
  { id: "ss-316", name: "Stainless 316 (1.4401)", E: 193, nu: 0.30, Sy: 205, cteUmPerMK: 16.0, source: "ASM" },
  { id: "cast-iron-grey", name: "Grey cast iron (brittle)", E: 100, nu: 0.26, Sy: 150, cteUmPerMK: 11.0, source: "brittle — verify vs UTS", brittle: true },
  { id: "al-6061-t6", name: "Aluminium 6061-T6", E: 69, nu: 0.33, Sy: 276, cteUmPerMK: 23.6, source: "ASM" },
  { id: "al-7075-t6", name: "Aluminium 7075-T6", E: 71.7, nu: 0.33, Sy: 503, cteUmPerMK: 23.4, source: "ASM" },
  { id: "ti-6al-4v", name: "Ti-6Al-4V (Gr5)", E: 114, nu: 0.34, Sy: 880, cteUmPerMK: 8.6, source: "ASM" },
  { id: "brass-cuzn", name: "Brass (CuZn)", E: 100, nu: 0.34, Sy: 200, cteUmPerMK: 20.5, source: "ASM; temper-dependent" },
  { id: "bronze", name: "Bronze (Cu-Sn)", E: 110, nu: 0.34, Sy: 150, cteUmPerMK: 18.0, source: "ASM; alloy-dependent" },
  { id: "copper-c101", name: "Copper OFHC (C101)", E: 117, nu: 0.34, Sy: 70, cteUmPerMK: 16.6, source: "ASM; annealed" },
];

export function pressFitMaterialById(id: string): PressFitMaterial | undefined {
  return PRESS_FIT_MATERIALS.find((m) => m.id === id);
}
