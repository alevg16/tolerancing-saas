import { describe, it, expect } from "vitest";
import {
  positionDeviation,
  mmcSize,
  lmcSize,
  bonusTolerance,
  virtualCondition,
  analyzeTruePosition,
  coordToPositionTol,
  roundVsSquareGain,
  floatingFastenerTol,
  fixedFastenerTol,
  type TruePositionInput,
} from "./truePosition";

describe("positionDeviation", () => {
  it("is diametral: 2·√(Δx²+Δy²)", () => {
    expect(positionDeviation(0.1, 0)).toBeCloseTo(0.2, 9);
    expect(positionDeviation(0.03, 0.04)).toBeCloseTo(0.1, 9); // 2·0.05
  });
});

describe("material condition sizes", () => {
  it("MMC is the largest pin and the smallest hole", () => {
    expect(mmcSize("external", 9.8, 10.0)).toBe(10.0);
    expect(mmcSize("internal", 10.0, 10.2)).toBe(10.0);
  });
  it("LMC is the smallest pin and the largest hole", () => {
    expect(lmcSize("external", 9.8, 10.0)).toBe(9.8);
    expect(lmcSize("internal", 10.0, 10.2)).toBe(10.2);
  });
});

describe("bonusTolerance", () => {
  it("is zero at MMC and grows as the feature departs toward LMC", () => {
    // hole 10.0/10.2, MMC modifier
    expect(bonusTolerance("internal", "MMC", 10.0, 10.0, 10.2)).toBeCloseTo(0, 9);
    expect(bonusTolerance("internal", "MMC", 10.1, 10.0, 10.2)).toBeCloseTo(0.1, 9);
    expect(bonusTolerance("internal", "MMC", 10.2, 10.0, 10.2)).toBeCloseTo(0.2, 9);
  });
  it("works for an external feature at MMC", () => {
    // pin 9.8/10.0, MMC = 10.0
    expect(bonusTolerance("external", "MMC", 10.0, 9.8, 10.0)).toBeCloseTo(0, 9);
    expect(bonusTolerance("external", "MMC", 9.9, 9.8, 10.0)).toBeCloseTo(0.1, 9);
  });
  it("is zero for RFS regardless of size", () => {
    expect(bonusTolerance("internal", "RFS", 10.2, 10.0, 10.2)).toBe(0);
  });
  it("clamps an out-of-limit size (a size reject earns no extra bonus)", () => {
    expect(bonusTolerance("internal", "MMC", 10.5, 10.0, 10.2)).toBeCloseTo(0.2, 9);
  });
  it("LMC modifier earns bonus departing from LMC", () => {
    expect(bonusTolerance("internal", "LMC", 10.2, 10.0, 10.2)).toBeCloseTo(0, 9);
    expect(bonusTolerance("internal", "LMC", 10.1, 10.0, 10.2)).toBeCloseTo(0.1, 9);
  });
});

describe("virtualCondition", () => {
  it("internal: MMC − tol", () => {
    expect(virtualCondition("internal", 10.0, 0.25)).toBeCloseTo(9.75, 9);
  });
  it("external: MMC + tol", () => {
    expect(virtualCondition("external", 10.0, 0.25)).toBeCloseTo(10.25, 9);
  });
});

describe("analyzeTruePosition", () => {
  const base: TruePositionInput = {
    dx: 0.06, dy: 0.08, // radial 0.10 → deviation 0.20
    positionTol: 0.25, type: "internal", modifier: "MMC",
    sizeMin: 10.0, sizeMax: 10.2, actualSize: 10.1,
  };

  it("adds MMC bonus to the stated tolerance and passes with margin", () => {
    const r = analyzeTruePosition(base);
    expect(r.deviation).toBeCloseTo(0.20, 9);
    expect(r.bonus).toBeCloseTo(0.10, 9);
    expect(r.totalTol).toBeCloseTo(0.35, 9);
    expect(r.pass).toBe(true);
    expect(r.margin).toBeCloseTo(0.15, 9);
    expect(r.utilization).toBeCloseTo(0.2 / 0.35, 9);
    expect(r.virtualCondition).toBeCloseTo(9.75, 9);
    expect(r.vcDefined).toBe(true);
  });

  it("would FAIL the same feature under RFS (no bonus)", () => {
    const r = analyzeTruePosition({ ...base, modifier: "RFS", positionTol: 0.15 });
    expect(r.bonus).toBe(0);
    expect(r.totalTol).toBeCloseTo(0.15, 9);
    expect(r.deviation).toBeGreaterThan(r.totalTol);
    expect(r.pass).toBe(false);
  });

  it("fails on size even if position is fine", () => {
    const r = analyzeTruePosition({ ...base, actualSize: 10.5 });
    expect(r.sizeInSpec).toBe(false);
    expect(r.pass).toBe(false);
  });
});

describe("coordinate ↔ position", () => {
  it("converts a ± box to its circumscribing round zone", () => {
    expect(coordToPositionTol(0.1, 0.1)).toBeCloseTo(2 * Math.hypot(0.1, 0.1), 9); // ≈ 0.283
  });
  it("a round zone gives ~57% more area than the equal ± square", () => {
    expect(roundVsSquareGain(0.1, 0.1)).toBeCloseTo(Math.PI / 2 - 1, 9); // 0.5708
  });
});

describe("pin-in-hole fastener tolerances", () => {
  it("floating fastener: T = H_mmc − F_mmc per part", () => {
    expect(floatingFastenerTol(10.5, 10.0)).toBeCloseTo(0.5, 9);
  });
  it("fixed fastener: half the clearance per part", () => {
    expect(fixedFastenerTol(10.5, 10.0)).toBeCloseTo(0.25, 9);
  });
});
