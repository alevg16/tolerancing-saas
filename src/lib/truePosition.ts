/**
 * True-position (GD&T) analysis with material-condition bonus tolerance.
 *
 * Pure and UI-free so it can be unit-tested and reused. Conventions follow
 * ASME Y14.5 / ISO 1101: a position tolerance zone is a CYLINDER, so the
 * position deviation reported against it is DIAMETRAL — twice the radial
 * distance of the feature axis from true (basic) position.
 *
 *     deviation = 2 · √(Δx² + Δy²)
 *
 * Material condition:
 *   MMC (Maximum Material Condition) — most material: largest pin / smallest hole.
 *   LMC (Least Material Condition)   — least material: smallest pin / largest hole.
 *   RFS (Regardless of Feature Size) — no bonus; the stated tolerance is fixed.
 *
 * With an MMC (or LMC) modifier the feature earns BONUS tolerance as it departs
 * from that condition:  bonus = |actual − reference size|, and the total
 * allowable position tolerance = stated + bonus.
 *
 * All lengths in one consistent unit (mm in the UI).
 */

export type FeatureType = "internal" | "external"; // hole / slot vs pin / shaft
export type MaterialCondition = "RFS" | "MMC" | "LMC";

/** Diametral position deviation from the X/Y offsets of the axis from true position. */
export function positionDeviation(dx: number, dy: number): number {
  return 2 * Math.hypot(dx, dy);
}

/** MMC size: largest for an external feature, smallest for an internal one. */
export function mmcSize(type: FeatureType, sizeMin: number, sizeMax: number): number {
  return type === "external" ? sizeMax : sizeMin;
}

/** LMC size: smallest for an external feature, largest for an internal one. */
export function lmcSize(type: FeatureType, sizeMin: number, sizeMax: number): number {
  return type === "external" ? sizeMin : sizeMax;
}

/**
 * Bonus tolerance: the feature's departure from the modifier's reference size,
 * toward the other size extreme. RFS earns none. The actual size is clamped to
 * the size limits, since a feature outside them is a size reject (handled
 * separately) rather than a source of extra bonus.
 */
export function bonusTolerance(
  type: FeatureType,
  modifier: MaterialCondition,
  actualSize: number,
  sizeMin: number,
  sizeMax: number,
): number {
  if (modifier === "RFS") return 0;
  const a = Math.min(sizeMax, Math.max(sizeMin, actualSize));
  const ref = modifier === "MMC" ? mmcSize(type, sizeMin, sizeMax) : lmcSize(type, sizeMin, sizeMax);
  return Math.abs(a - ref);
}

/**
 * Virtual condition — the constant worst-case mating boundary under an MMC
 * modifier (the basis of functional gauging and fastener formulas):
 *   internal: VC = MMC − tol   (smallest hole, fully off-position → largest pin that always fits)
 *   external: VC = MMC + tol   (largest pin, fully off-position → smallest hole it always fits)
 * Only constant for the MMC modifier.
 */
export function virtualCondition(
  type: FeatureType,
  mmc: number,
  positionTol: number,
): number {
  return type === "internal" ? mmc - positionTol : mmc + positionTol;
}

export interface TruePositionInput {
  /** Axis offset from true position, measured minus basic. */
  dx: number;
  dy: number;
  /** Stated position tolerance (the value in the feature control frame), diametral. */
  positionTol: number;
  type: FeatureType;
  modifier: MaterialCondition;
  sizeMin: number;
  sizeMax: number;
  actualSize: number;
}

export interface TruePositionResult {
  deviation: number;
  mmc: number;
  lmc: number;
  bonus: number;
  totalTol: number;
  pass: boolean;
  /** totalTol − deviation (positive = within tolerance). */
  margin: number;
  /** deviation / totalTol. */
  utilization: number;
  sizeInSpec: boolean;
  virtualCondition: number;
  vcDefined: boolean;
}

export function analyzeTruePosition(input: TruePositionInput): TruePositionResult {
  const deviation = positionDeviation(input.dx, input.dy);
  const mmc = mmcSize(input.type, input.sizeMin, input.sizeMax);
  const lmc = lmcSize(input.type, input.sizeMin, input.sizeMax);
  const sizeInSpec =
    input.actualSize >= input.sizeMin - 1e-9 && input.actualSize <= input.sizeMax + 1e-9;
  const bonus = bonusTolerance(input.type, input.modifier, input.actualSize, input.sizeMin, input.sizeMax);
  const totalTol = input.positionTol + bonus;
  const pass = sizeInSpec && deviation <= totalTol + 1e-9;
  const margin = totalTol - deviation;
  const utilization = totalTol > 0 ? deviation / totalTol : Infinity;
  const vcDefined = input.modifier === "MMC";
  return {
    deviation, mmc, lmc, bonus, totalTol, pass, margin, utilization,
    sizeInSpec,
    virtualCondition: virtualCondition(input.type, mmc, input.positionTol),
    vcDefined,
  };
}

/**
 * Equivalent diametral position tolerance for a ± coordinate tolerance — the
 * round zone that just reaches the worst (corner) point of the ± box:
 *   Ø = 2 · √(tx² + ty²)
 * Switching the ±box to that cylinder keeps the per-axis limit but adds the
 * corners — about 57 % more zone area for an equal ± on both axes.
 */
export function coordToPositionTol(tx: number, ty: number): number {
  return 2 * Math.hypot(tx, ty);
}

/** Area gain of a circumscribing round zone over the ± square (π/2 − 1 ≈ 0.571 for tx=ty). */
export function roundVsSquareGain(tx: number, ty: number): number {
  const square = 2 * tx * (2 * ty);
  const circle = Math.PI * (tx * tx + ty * ty);
  return square > 0 ? circle / square - 1 : 0;
}

/**
 * Pin-in-hole assembly. Position tolerance available to each part from the
 * clearance between the smallest hole (hole MMC) and the largest fastener
 * (fastener MMC):
 *   floating fastener (clearance holes both parts):  T = H_mmc − F_mmc  (each)
 *   fixed fastener (one part threaded / pinned):      T = (H_mmc − F_mmc)/2 (each)
 */
export function floatingFastenerTol(holeMMC: number, fastenerMMC: number): number {
  return holeMMC - fastenerMMC;
}
export function fixedFastenerTol(holeMMC: number, fastenerMMC: number): number {
  return (holeMMC - fastenerMMC) / 2;
}
