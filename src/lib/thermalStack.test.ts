import { describe, it, expect } from "vitest";
import {
  gapAtTemp,
  analyzeThermalStack,
  temperatureWindow,
  normalCdf,
  cteToAlphaPerK,
  type ThermalDim,
} from "./thermalStack";

const AL = cteToAlphaPerK(23.4);
const STEEL = cteToAlphaPerK(11.7);

// Aluminium 40 mm adds, steel 40 mm subtracts → gap 0 at 20 °C, opens as Al grows faster.
const DIMS: ThermalDim[] = [
  { id: 1, name: "Al spacer", nominal: 40, upper: 0.1, lower: -0.1, dir: 1, alphaPerK: AL },
  { id: 2, name: "Steel shaft", nominal: 40, upper: 0.05, lower: -0.05, dir: -1, alphaPerK: STEEL },
];

describe("normalCdf", () => {
  it("is 0.5 at the mean and ~0.8413 at +1σ", () => {
    expect(normalCdf(5, 5, 2)).toBeCloseTo(0.5, 6);
    expect(normalCdf(7, 5, 2)).toBeCloseTo(0.8413, 3);
  });
});

describe("gapAtTemp", () => {
  it("is the signed nominal sum at 20 °C", () => {
    expect(gapAtTemp(DIMS, 20)).toBeCloseTo(0, 9);
  });
  it("opens by the differential expansion at 120 °C", () => {
    // 40·(1+23.4e-6·100) − 40·(1+11.7e-6·100) = 40·11.7e-6·100 = 0.0468
    expect(gapAtTemp(DIMS, 120)).toBeCloseTo(0.0468, 6);
  });
});

describe("analyzeThermalStack", () => {
  const r = analyzeThermalStack({ dims: DIMS, tempC: 120, k: 3, lsl: -0.05, usl: 0.05 });

  it("reports the gap shift and per-kelvin slope", () => {
    expect(r.gap20).toBeCloseTo(0, 9);
    expect(r.gapT).toBeCloseTo(0.0468, 6);
    expect(r.shift).toBeCloseTo(0.0468, 6);
    expect(r.slopePerK).toBeCloseTo(40 * 11.7e-6, 9); // 4.68e-4 mm/K
  });

  it("keeps tolerances at 20 °C for the worst-case and RSS spread", () => {
    expect(r.wcHalf).toBeCloseTo(0.15, 9); // 0.10 + 0.05
    expect(r.wcMin).toBeCloseTo(0.0468 - 0.15, 6);
    expect(r.wcMax).toBeCloseTo(0.0468 + 0.15, 6);
    expect(r.sdRss).toBeCloseTo(Math.hypot(0.1 / 3, 0.05 / 3), 9);
  });

  it("attributes the shift mostly to the aluminium part", () => {
    expect(r.contributions[0].id).toBe(1); // Al dominates
    expect(r.contributions[0].shift).toBeCloseTo(0.0936, 6);
    expect(r.contributions[0].shiftPct).toBeCloseTo((0.0936 / 0.1404) * 100, 3); // ~66.7%
    expect(r.contributions[0].varPct).toBeCloseTo(80, 6); // 0.1²σ vs 0.05²σ
  });

  it("finds the operating-temperature window and places T inside it", () => {
    // gap rises with T: low at LSL, high at USL.
    expect(r.tempWindowLow).toBeCloseTo(20 + (-0.05) / (40 * 11.7e-6), 2); // ≈ −86.8 °C
    expect(r.tempWindowHigh).toBeCloseTo(20 + 0.05 / (40 * 11.7e-6), 2); // ≈ 126.8 °C
    expect(r.inWindowAtT).toBe(true); // gapT 0.0468 ≤ 0.05
  });

  it("computes capability against the spec window", () => {
    expect(r.hasSpec).toBe(true);
    expect(r.rss.yield).toBeGreaterThan(0);
    expect(r.rss.yield).toBeLessThanOrEqual(1);
    expect(r.rss.cpk).toBeCloseTo(Math.min((0.05 - r.gapT) / (3 * r.sdRss), (r.gapT + 0.05) / (3 * r.sdRss)), 6);
  });
});

describe("same-material stack is temperature-independent", () => {
  const same: ThermalDim[] = [
    { id: 1, name: "A", nominal: 40, upper: 0.1, lower: -0.1, dir: 1, alphaPerK: STEEL },
    { id: 2, name: "B", nominal: 40, upper: 0.05, lower: -0.05, dir: -1, alphaPerK: STEEL },
  ];
  it("does not shift the gap with temperature", () => {
    const r = analyzeThermalStack({ dims: same, tempC: 200, k: 3, lsl: -0.2, usl: 0.2 });
    expect(r.slopePerK).toBeCloseTo(0, 12);
    expect(r.shift).toBeCloseTo(0, 9);
  });
});

describe("temperatureWindow", () => {
  it("maps spec limits to temperatures for a rising gap", () => {
    const w = temperatureWindow(0, 4.68e-4, -0.05, 0.05);
    expect(w.low).toBeCloseTo(20 - 0.05 / 4.68e-4, 2);
    expect(w.high).toBeCloseTo(20 + 0.05 / 4.68e-4, 2);
  });
  it("swaps the bounds for a falling gap", () => {
    const w = temperatureWindow(0, -4.68e-4, -0.05, 0.05);
    expect(w.low).toBeCloseTo(20 - 0.05 / 4.68e-4, 2); // USL sets the low bound
    expect(w.high).toBeCloseTo(20 + 0.05 / 4.68e-4, 2);
  });
  it("is unbounded when the gap is flat and in spec", () => {
    const w = temperatureWindow(0, 0, -0.1, 0.1);
    expect(w.low).toBeNull();
    expect(w.high).toBeNull();
  });
});
