import { describe, it, expect } from "vitest";
import {
  CHARACTERISTICS,
  characteristicById,
  analyzeCallout,
  analyzePattern,
  type CalloutInput,
  type PatternFeature,
} from "./gdt";

function callout(p: Partial<CalloutInput> & { characteristic: string }): CalloutInput {
  return {
    characteristic: p.characteristic, tol: 0.2, modifier: "MMC",
    hasSizeFeature: true, featureType: "internal", sizeMin: 10.0, sizeMax: 10.2, actualSize: 10.1,
    measured: 0.25, ...p,
  };
}

describe("characteristic metadata", () => {
  it("covers all five families", () => {
    const fams = new Set(CHARACTERISTICS.map((c) => c.family));
    expect(fams).toEqual(new Set(["location", "profile", "orientation", "form", "runout"]));
  });
  it("allows a modifier only for location and orientation", () => {
    expect(characteristicById("position")!.allowsModifier).toBe(true);
    expect(characteristicById("perpendicularity")!.allowsModifier).toBe(true);
    expect(characteristicById("flatness")!.allowsModifier).toBe(false);
    expect(characteristicById("circular_runout")!.allowsModifier).toBe(false);
    expect(characteristicById("profile_surface")!.allowsModifier).toBe(false);
  });
  it("marks form as datum-free and runout as datum-required", () => {
    expect(characteristicById("flatness")!.datum).toBe("none");
    expect(characteristicById("total_runout")!.datum).toBe("required");
    expect(characteristicById("position")!.diametral).toBe(true);
  });
});

describe("analyzeCallout — bonus where legal", () => {
  it("position at Ⓜ earns bonus and reports virtual condition", () => {
    const r = analyzeCallout(callout({ characteristic: "position", tol: 0.2, measured: 0.25 }));
    expect(r.bonus).toBeCloseTo(0.1, 9); // 10.1 − 10.0
    expect(r.totalTol).toBeCloseTo(0.3, 9);
    expect(r.pass).toBe(true);
    expect(r.margin).toBeCloseTo(0.05, 9);
    expect(r.virtualCondition).toBeCloseTo(9.8, 9); // MMC − tol
  });

  it("perpendicularity of an axis at Ⓜ also earns bonus", () => {
    const r = analyzeCallout(callout({ characteristic: "perpendicularity", tol: 0.05, measured: 0.1 }));
    expect(r.bonusApplied).toBe(true);
    expect(r.bonus).toBeCloseTo(0.1, 9);
    expect(r.totalTol).toBeCloseTo(0.15, 9);
    expect(r.pass).toBe(true);
  });
});

describe("analyzeCallout — no bonus for surface controls", () => {
  it("flatness ignores a modifier (no bonus, RFS in effect)", () => {
    const r = analyzeCallout(callout({ characteristic: "flatness", tol: 0.05, modifier: "MMC", measured: 0.04 }));
    expect(r.bonusApplied).toBe(false);
    expect(r.bonus).toBe(0);
    expect(r.totalTol).toBeCloseTo(0.05, 9);
    expect(r.pass).toBe(true);
    expect(r.virtualCondition).toBeNull();
  });

  it("runout fails when FIM exceeds the tolerance", () => {
    const r = analyzeCallout(callout({ characteristic: "circular_runout", tol: 0.1, measured: 0.12, hasSizeFeature: false }));
    expect(r.bonus).toBe(0);
    expect(r.pass).toBe(false);
    expect(r.margin).toBeCloseTo(-0.02, 9);
  });
});

describe("analyzeCallout — size gate", () => {
  it("fails when the feature is out of size limits", () => {
    const r = analyzeCallout(callout({ characteristic: "position", actualSize: 10.5, measured: 0.1 }));
    expect(r.sizeInSpec).toBe(false);
    expect(r.pass).toBe(false);
  });
});

describe("analyzePattern (2D bolt pattern)", () => {
  const feats: PatternFeature[] = [
    { id: 1, name: "H1", trueX: 0, trueY: 0, measDx: 0.06, measDy: 0.08, positionTol: 0.25, modifier: "MMC", featureType: "internal", sizeMin: 10, sizeMax: 10.2, actualSize: 10.1 },
    { id: 2, name: "H2", trueX: 40, trueY: 0, measDx: 0.2, measDy: 0.2, positionTol: 0.25, modifier: "MMC", featureType: "internal", sizeMin: 10, sizeMax: 10.2, actualSize: 10.0 },
  ];
  it("analyzes each feature and counts passes, flagging the worst", () => {
    const r = analyzePattern(feats);
    expect(r.total).toBe(2);
    expect(r.features[0].deviation).toBeCloseTo(0.2, 9); // 2·√(0.06²+0.08²)
    expect(r.features[0].totalTol).toBeCloseTo(0.35, 9); // 0.25 + 0.1 bonus
    expect(r.features[0].pass).toBe(true);
    // H2: deviation 2·√(0.2²+0.2²)=0.566, no bonus (size at MMC) → tol 0.25 → fail
    expect(r.features[1].deviation).toBeCloseTo(2 * Math.hypot(0.2, 0.2), 6);
    expect(r.features[1].pass).toBe(false);
    expect(r.passCount).toBe(1);
    expect(r.worstId).toBe(2);
  });
});
