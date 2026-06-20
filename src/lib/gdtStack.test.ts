import { describe, it, expect } from "vitest";
import {
  contributorHalf,
  contributorMean,
  analyzeGdtStack,
  CONTRIB_TYPES,
  type StackContributor,
} from "./gdtStack";

function c(p: Partial<StackContributor> & { id: number; type: StackContributor["type"] }): StackContributor {
  return { id: p.id, name: p.name ?? "c", type: p.type, dir: 1, nominal: 0, upper: 0.1, lower: -0.1, geoTol: 0.2, bonus: 0, ...p };
}

describe("contributorHalf — GD&T → equivalent ±", () => {
  it("± size is half the band", () => {
    expect(contributorHalf(c({ id: 1, type: "size", upper: 0.1, lower: -0.1 }))).toBeCloseTo(0.1, 9);
    expect(contributorHalf(c({ id: 1, type: "size", upper: 0.05, lower: -0.15 }))).toBeCloseTo(0.1, 9);
  });
  it("position Ø zone projects to ±T/2, plus creditable bonus", () => {
    expect(contributorHalf(c({ id: 1, type: "position", geoTol: 0.2, bonus: 0 }))).toBeCloseTo(0.1, 9);
    expect(contributorHalf(c({ id: 1, type: "position", geoTol: 0.2, bonus: 0.1 }))).toBeCloseTo(0.15, 9);
  });
  it("profile / form / runout are ±T/2 with no bonus, even if a bonus is set", () => {
    expect(contributorHalf(c({ id: 1, type: "profile", geoTol: 0.1, bonus: 0.5 }))).toBeCloseTo(0.05, 9);
    expect(contributorHalf(c({ id: 1, type: "flatness", geoTol: 0.06, bonus: 0.5 }))).toBeCloseTo(0.03, 9);
    expect(contributorHalf(c({ id: 1, type: "runout", geoTol: 0.08, bonus: 0.5 }))).toBeCloseTo(0.04, 9);
  });
  it("orientation credits bonus like position", () => {
    expect(contributorHalf(c({ id: 1, type: "orientation", geoTol: 0.05, bonus: 0.05 }))).toBeCloseTo(0.05, 9);
  });
});

describe("contributorMean", () => {
  it("size uses nominal plus tolerance asymmetry; geometric uses the basic", () => {
    expect(contributorMean(c({ id: 1, type: "size", nominal: 20, upper: 0.1, lower: -0.05 }))).toBeCloseTo(20.025, 9);
    expect(contributorMean(c({ id: 1, type: "position", nominal: 30, geoTol: 0.2 }))).toBeCloseTo(30, 9);
  });
});

describe("CONTRIB_TYPES", () => {
  it("only position and orientation credit bonus", () => {
    const bonusers = CONTRIB_TYPES.filter((t) => t.allowsBonus).map((t) => t.id).sort();
    expect(bonusers).toEqual(["orientation", "position"]);
  });
});

describe("analyzeGdtStack — mixed ± and GD&T", () => {
  const input = {
    contributors: [
      c({ id: 1, name: "Bore depth", type: "size", dir: 1, nominal: 40, upper: 0.1, lower: -0.1 }),     // half 0.10
      c({ id: 2, name: "Hole position", type: "position", dir: -1, nominal: 20, geoTol: 0.2, bonus: 0 }), // half 0.10
      c({ id: 3, name: "Face profile", type: "profile", dir: -1, nominal: 19.5, geoTol: 0.1 }),            // half 0.05
    ],
    k: 3, lsl: 0.1, usl: 0.9,
  };
  const r = analyzeGdtStack(input);

  it("sums signed means for the gap nominal", () => {
    expect(r.gapNominal).toBeCloseTo(40 - 20 - 19.5, 9); // 0.5
  });
  it("worst case adds all equivalent half-tolerances", () => {
    expect(r.wcHalf).toBeCloseTo(0.1 + 0.1 + 0.05, 9); // 0.25
    expect(r.wcMin).toBeCloseTo(0.25, 9);
    expect(r.wcMax).toBeCloseTo(0.75, 9);
  });
  it("RSS combines them in quadrature and reports capability", () => {
    expect(r.sdRss).toBeCloseTo(Math.hypot(0.1 / 3, 0.1 / 3, 0.05 / 3), 9);
    expect(r.hasSpec).toBe(true);
    expect(r.rss.yield).toBeGreaterThan(0.99);
  });
  it("ranks variance contributors (the two ±0.10 lead the ±0.05)", () => {
    expect(r.contributions[0].varPct).toBeCloseTo(r.contributions[1].varPct, 6);
    expect(r.contributions[2].name).toBe("Face profile");
    expect(r.contributions[2].varPct).toBeLessThan(r.contributions[0].varPct);
  });
});
