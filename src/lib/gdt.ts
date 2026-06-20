/**
 * 2D GD&T feature analyzer (ASME Y14.5 / ISO 1101). A uniform "callout"
 * model that covers the geometric-tolerance families — location (position),
 * profile, orientation, form and runout — plus a located-feature pattern for
 * the 2D map. Reuses the verified true-position math for the bonus / virtual
 * condition pieces.
 *
 * Pure and UI-free. All lengths in one consistent unit (mm in the UI).
 *
 * Each callout reduces to the same check: the feature's measured deviation
 * (in the characteristic's natural metric) must fit inside the tolerance zone,
 * which is the stated tolerance plus any material-condition BONUS:
 *
 *     total allowable = stated tolerance + bonus,   bonus = |actual − MMC|
 *
 * Bonus only applies to a feature of size under an Ⓜ/Ⓛ modifier, and only for
 * the controls where that is legal (position and orientation of an axis).
 */

import {
  type FeatureType,
  type MaterialCondition,
  bonusTolerance,
  mmcSize,
  virtualCondition,
  analyzeTruePosition,
} from "./truePosition";

export type { FeatureType, MaterialCondition } from "./truePosition";
export { analyzeTruePosition, positionDeviation } from "./truePosition";

export type CharFamily = "location" | "profile" | "orientation" | "form" | "runout";
export type ZoneShape =
  | "cylinder" | "parallel_planes" | "concentric_circles"
  | "coaxial_cylinders" | "profile_band" | "fim";

export interface CharacteristicDef {
  id: string;
  label: string;
  /** GD&T symbol (decorative; the label carries the meaning). */
  symbol: string;
  family: CharFamily;
  zone: ZoneShape;
  /** Whether an Ⓜ/Ⓛ modifier (and therefore bonus) is legal. */
  allowsModifier: boolean;
  datum: "required" | "optional" | "none";
  /** Label for the measured value the user enters. */
  metric: string;
  /** True when the zone is a cylinder and the deviation is diametral. */
  diametral: boolean;
}

export const CHARACTERISTICS: CharacteristicDef[] = [
  { id: "position", label: "Position", symbol: "⌖", family: "location", zone: "cylinder", allowsModifier: true, datum: "required", metric: "Ø deviation", diametral: true },
  { id: "profile_surface", label: "Profile of a surface", symbol: "⌓", family: "profile", zone: "profile_band", allowsModifier: false, datum: "optional", metric: "total deviation", diametral: false },
  { id: "profile_line", label: "Profile of a line", symbol: "⌒", family: "profile", zone: "profile_band", allowsModifier: false, datum: "optional", metric: "total deviation", diametral: false },
  { id: "perpendicularity", label: "Perpendicularity", symbol: "⊥", family: "orientation", zone: "parallel_planes", allowsModifier: true, datum: "required", metric: "deviation", diametral: false },
  { id: "angularity", label: "Angularity", symbol: "∠", family: "orientation", zone: "parallel_planes", allowsModifier: true, datum: "required", metric: "deviation", diametral: false },
  { id: "parallelism", label: "Parallelism", symbol: "∥", family: "orientation", zone: "parallel_planes", allowsModifier: true, datum: "required", metric: "deviation", diametral: false },
  { id: "flatness", label: "Flatness", symbol: "⏥", family: "form", zone: "parallel_planes", allowsModifier: false, datum: "none", metric: "P–V error", diametral: false },
  { id: "straightness", label: "Straightness", symbol: "—", family: "form", zone: "parallel_planes", allowsModifier: false, datum: "none", metric: "P–V error", diametral: false },
  { id: "circularity", label: "Circularity", symbol: "○", family: "form", zone: "concentric_circles", allowsModifier: false, datum: "none", metric: "radial P–V", diametral: false },
  { id: "cylindricity", label: "Cylindricity", symbol: "⌭", family: "form", zone: "coaxial_cylinders", allowsModifier: false, datum: "none", metric: "radial P–V", diametral: false },
  { id: "circular_runout", label: "Circular runout", symbol: "↗", family: "runout", zone: "fim", allowsModifier: false, datum: "required", metric: "FIM", diametral: false },
  { id: "total_runout", label: "Total runout", symbol: "⌰", family: "runout", zone: "fim", allowsModifier: false, datum: "required", metric: "FIM", diametral: false },
];

export function characteristicById(id: string): CharacteristicDef | undefined {
  return CHARACTERISTICS.find((c) => c.id === id);
}

export interface CalloutInput {
  characteristic: string;
  /** Stated tolerance from the feature control frame. */
  tol: number;
  modifier: MaterialCondition;
  /** Whether the toleranced feature is a feature of size (enables bonus). */
  hasSizeFeature: boolean;
  featureType: FeatureType;
  sizeMin: number;
  sizeMax: number;
  actualSize: number;
  /** Measured deviation in the characteristic's natural metric. */
  measured: number;
}

export interface CalloutResult {
  bonus: number;
  totalTol: number;
  deviation: number;
  pass: boolean;
  margin: number;
  utilization: number;
  virtualCondition: number | null;
  sizeInSpec: boolean;
  zone: ZoneShape;
  allowsModifier: boolean;
  bonusApplied: boolean;
}

/**
 * Analyze one GD&T callout: apply any legal material-condition bonus, then test
 * the measured deviation against the (expanded) tolerance zone.
 */
export function analyzeCallout(input: CalloutInput): CalloutResult {
  const def = characteristicById(input.characteristic);
  const allows = def?.allowsModifier ?? false;
  const bonusApplied = allows && input.hasSizeFeature && input.modifier !== "RFS";
  const bonus = bonusApplied
    ? bonusTolerance(input.featureType, input.modifier, input.actualSize, input.sizeMin, input.sizeMax)
    : 0;
  const totalTol = input.tol + bonus;
  const sizeInSpec =
    !input.hasSizeFeature ||
    (input.actualSize >= input.sizeMin - 1e-9 && input.actualSize <= input.sizeMax + 1e-9);
  const deviation = input.measured;
  const pass = sizeInSpec && deviation <= totalTol + 1e-9;
  const margin = totalTol - deviation;
  const utilization = totalTol > 0 ? deviation / totalTol : Infinity;
  const vcDefined = bonusApplied && input.modifier === "MMC";
  return {
    bonus, totalTol, deviation, pass, margin, utilization,
    virtualCondition: vcDefined
      ? virtualCondition(input.featureType, mmcSize(input.featureType, input.sizeMin, input.sizeMax), input.tol)
      : null,
    sizeInSpec, zone: def?.zone ?? "parallel_planes", allowsModifier: allows, bonusApplied,
  };
}

export interface PatternFeature {
  id: number;
  name: string;
  /** True (basic) position from the datum origin. */
  trueX: number;
  trueY: number;
  /** Measured axis offset (measured − true). */
  measDx: number;
  measDy: number;
  positionTol: number;
  modifier: MaterialCondition;
  featureType: FeatureType;
  sizeMin: number;
  sizeMax: number;
  actualSize: number;
}

export interface PatternFeatureResult {
  id: number;
  name: string;
  trueX: number;
  trueY: number;
  measDx: number;
  measDy: number;
  deviation: number;
  bonus: number;
  totalTol: number;
  pass: boolean;
  margin: number;
}

export interface PatternResult {
  features: PatternFeatureResult[];
  passCount: number;
  total: number;
  worstId: number | null;
}

/** Analyze a located-feature pattern (position with bonus) for the 2D map. */
export function analyzePattern(features: PatternFeature[]): PatternResult {
  const out: PatternFeatureResult[] = features.map((f) => {
    const tp = analyzeTruePosition({
      dx: f.measDx, dy: f.measDy, positionTol: f.positionTol,
      type: f.featureType, modifier: f.modifier,
      sizeMin: f.sizeMin, sizeMax: f.sizeMax, actualSize: f.actualSize,
    });
    return {
      id: f.id, name: f.name, trueX: f.trueX, trueY: f.trueY, measDx: f.measDx, measDy: f.measDy,
      deviation: tp.deviation, bonus: tp.bonus, totalTol: tp.totalTol, pass: tp.pass, margin: tp.margin,
    };
  });
  const passCount = out.filter((f) => f.pass).length;
  let worstId: number | null = null;
  let worstUtil = -Infinity;
  out.forEach((f) => {
    const util = f.totalTol > 0 ? f.deviation / f.totalTol : Infinity;
    if (util > worstUtil) { worstUtil = util; worstId = f.id; }
  });
  return { features: out, passCount, total: out.length, worstId };
}
