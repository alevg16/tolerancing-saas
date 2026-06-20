import { describe, it, expect } from "vitest";
import {
  expandLimit,
  fitAtTemperature,
  cteToAlphaPerK,
  REFERENCE_TEMP_C,
} from "./thermalFit";

// ISO 286 limits at 20 °C, in mm.
const HG = { holeMin20: 25.0, holeMax20: 25.021, shaftMin20: 24.98, shaftMax20: 24.993 }; // Ø25 H7/g6
const HP = { holeMin20: 25.0, holeMax20: 25.021, shaftMin20: 25.021, shaftMax20: 25.034 }; // Ø25 H7/p6

const A_STEEL = cteToAlphaPerK(11.7); // carbon steel
const A_AL = cteToAlphaPerK(23.4); // Aluminium 6082-T6

describe("expandLimit", () => {
  it("is the identity at the reference temperature", () => {
    expect(expandLimit(25, A_AL, REFERENCE_TEMP_C)).toBe(25);
  });
  it("follows L20 * (1 + alpha*(T-20))", () => {
    expect(expandLimit(25, A_AL, 120)).toBeCloseTo(25 * (1 + 23.4e-6 * 100), 9);
  });
});

describe("fitAtTemperature", () => {
  // Case 1 — regression: T_h = T_s = 20 reproduces the current 20 °C output.
  it("reproduces the 20 °C clearance at 20/20", () => {
    const f = fitAtTemperature({ ...HG, alphaHolePerK: A_STEEL, alphaShaftPerK: A_AL, holeTempC: 20, shaftTempC: 20 });
    expect(f.clearanceMinUm).toBeCloseTo(7, 6); // EI - es = 0 - (-7)
    expect(f.clearanceMaxUm).toBeCloseTo(41, 6); // ES - ei = 21 - (-20)
    expect(f.category).toBe("clearance");
  });

  // Case 2 — Ø25 H7/g6, steel hole + aluminium shaft, 150 °C.
  it("closes a clearance fit toward interference (steel hole, Al shaft, 150 °C)", () => {
    const c20 = fitAtTemperature({ ...HG, alphaHolePerK: A_STEEL, alphaShaftPerK: A_AL, holeTempC: 20, shaftTempC: 20 });
    const f = fitAtTemperature({ ...HG, alphaHolePerK: A_STEEL, alphaShaftPerK: A_AL, holeTempC: 150, shaftTempC: 150 });

    // clearance closes by ~36–38 µm
    expect(c20.clearanceMinUm - f.clearanceMinUm).toBeGreaterThan(36);
    expect(c20.clearanceMinUm - f.clearanceMinUm).toBeLessThan(39);
    // minimum clearance goes to roughly −31 µm (interference of that magnitude)
    expect(f.clearanceMinUm).toBeCloseTo(-31, 0);
    // category changes; lands in transition (max clearance still just positive, ~+3 µm)
    expect(f.category).not.toBe(c20.category);
    expect(f.category).toBe("transition");
  });

  // Case 3 — same material both parts: category unchanged; clearance scales by (1+alpha*ΔT).
  it("keeps the category and scales clearance for one material", () => {
    const c20 = fitAtTemperature({ ...HG, alphaHolePerK: A_STEEL, alphaShaftPerK: A_STEEL, holeTempC: 20, shaftTempC: 20 });
    const f = fitAtTemperature({ ...HG, alphaHolePerK: A_STEEL, alphaShaftPerK: A_STEEL, holeTempC: 150, shaftTempC: 150 });
    const factor = 1 + 11.7e-6 * 130;
    expect(f.category).toBe(c20.category);
    expect(f.clearanceMinUm).toBeCloseTo(c20.clearanceMinUm * factor, 3);
    expect(f.clearanceMaxUm).toBeCloseTo(c20.clearanceMaxUm * factor, 3);
  });

  // Case 4 — H7/p6 interference, shaft cooled (shrink-fit): interference reduces toward clearance.
  it("reduces interference when the shaft is cooled", () => {
    const c20 = fitAtTemperature({ ...HP, alphaHolePerK: A_STEEL, alphaShaftPerK: A_STEEL, holeTempC: 20, shaftTempC: 20 });
    expect(c20.category).toBe("interference");

    const cooled = fitAtTemperature({ ...HP, alphaHolePerK: A_STEEL, alphaShaftPerK: A_STEEL, holeTempC: 20, shaftTempC: -40 });
    expect(cooled.clearanceMinUm).toBeGreaterThan(c20.clearanceMinUm);
    expect(cooled.clearanceMaxUm).toBeGreaterThan(c20.clearanceMaxUm);
    expect(Math.abs(cooled.clearanceMinUm)).toBeLessThan(Math.abs(c20.clearanceMinUm));
  });
});
