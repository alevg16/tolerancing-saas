import { describe, it, expect } from "vitest";
import {
  contactPressure,
  fitStresses,
  holdingCapacity,
  assemblyDeltaT,
  analyzePressFit,
  vonMises,
  cteToAlphaPerK,
  type FitGeometry,
  type MaterialPair,
  type PressFitInput,
} from "./pressFit";

// Ø50 solid steel shaft in a Ø100 steel hub, 0.05 mm diametral interference.
const GEO: FitGeometry = { interfaceDia: 50, shaftBore: 0, hubOuterDia: 100 };
const STEEL: MaterialPair = { shaftE: 207000, shaftNu: 0.292, hubE: 207000, hubNu: 0.292 };
const DELTA = 0.05;

describe("vonMises", () => {
  it("is zero under hydrostatic stress", () => {
    expect(vonMises(50, 50, 50)).toBeCloseTo(0, 9);
  });
  it("equals the stress in uniaxial tension", () => {
    expect(vonMises(120, 0, 0)).toBeCloseTo(120, 9);
  });
});

describe("contactPressure", () => {
  it("matches the hand calc for a solid same-material fit (~77.6 MPa)", () => {
    expect(contactPressure(GEO, STEEL, DELTA)).toBeCloseTo(77.62, 1);
  });

  it("is independent of Poisson's ratio for a solid, same-material fit", () => {
    // ν cancels in the same-material/solid closed form p = δ·E·(do²−df²)/(2·df·do²).
    const a = contactPressure(GEO, { ...STEEL, shaftNu: 0.0, hubNu: 0.0 }, DELTA);
    const b = contactPressure(GEO, { ...STEEL, shaftNu: 0.45, hubNu: 0.45 }, DELTA);
    const closed = (DELTA * 207000 * (100 ** 2 - 50 ** 2)) / (2 * 50 * 100 ** 2);
    expect(a).toBeCloseTo(closed, 6);
    expect(b).toBeCloseTo(closed, 6);
  });

  it("scales linearly with interference", () => {
    const p1 = contactPressure(GEO, STEEL, DELTA);
    const p2 = contactPressure(GEO, STEEL, 2 * DELTA);
    expect(p2).toBeCloseTo(2 * p1, 6);
  });

  it("gives a softer (lower) pressure with a compliant aluminium hub", () => {
    const steelHub = contactPressure(GEO, STEEL, DELTA);
    const alHub = contactPressure(GEO, { ...STEEL, hubE: 69000, hubNu: 0.33 }, DELTA);
    expect(alHub).toBeLessThan(steelHub);
  });

  it("returns 0 for non-positive interference (clearance) and NaN for bad geometry", () => {
    expect(contactPressure(GEO, STEEL, 0)).toBe(0);
    expect(contactPressure(GEO, STEEL, -0.01)).toBe(0);
    expect(Number.isNaN(contactPressure({ ...GEO, hubOuterDia: 40 }, STEEL, DELTA))).toBe(true);
    expect(Number.isNaN(contactPressure({ ...GEO, shaftBore: 60 }, STEEL, DELTA))).toBe(true);
  });
});

describe("fitStresses", () => {
  const p = contactPressure(GEO, STEEL, DELTA);
  const s = fitStresses(GEO, p);

  it("puts the peak tensile hoop stress at the hub bore", () => {
    expect(s.hubHoopInner).toBeCloseTo((p * (100 ** 2 + 50 ** 2)) / (100 ** 2 - 50 ** 2), 6);
    expect(s.hubHoopInner).toBeCloseTo(129.4, 0);
    expect(s.hubHoopInner).toBeGreaterThan(s.hubHoopOuter); // peak is at the bore
  });

  it("gives von Mises ≈ 181 MPa at the hub bore", () => {
    expect(s.hubVonMises).toBeCloseTo(181.1, 0);
  });

  it("puts a solid shaft in uniform compression (σθ = −p, von Mises = p)", () => {
    expect(s.shaftHoopInner).toBeCloseTo(-p, 6);
    expect(s.shaftVonMises).toBeCloseTo(p, 6);
  });

  it("doubles the shaft bore hoop stress in the thin-wall hollow limit", () => {
    // Hollow shaft, bore → interface: σθ → −2p·df²/(df²−di²); for di→df this blows up,
    // for a moderate bore it is well above the solid case.
    const hollow = fitStresses({ ...GEO, shaftBore: 30 }, p);
    expect(Math.abs(hollow.shaftHoopInner)).toBeGreaterThan(p);
  });
});

describe("holdingCapacity", () => {
  it("follows F = µ·p·π·d·L and T = F·d/2", () => {
    const p = 77.62;
    const { axialForce, torque } = holdingCapacity(50, 40, 0.12, p);
    expect(axialForce).toBeCloseTo(0.12 * p * Math.PI * 50 * 40, 6);
    expect(torque).toBeCloseTo((axialForce * 50) / 2, 6);
    expect(axialForce).toBeCloseTo(58520, -2); // ~58.5 kN
  });
});

describe("assemblyDeltaT", () => {
  it("heats by ΔT = (δ + clearance)/(α·d)", () => {
    const dT = assemblyDeltaT(0.05, 0.02, cteToAlphaPerK(11.7), 50);
    expect(dT).toBeCloseTo(0.07 / (11.7e-6 * 50), 6);
    expect(dT).toBeCloseTo(119.7, 0);
  });
});

describe("analyzePressFit", () => {
  const base: PressFitInput = {
    interfaceDia: 50, shaftBore: 0, hubOuterDia: 100,
    interferenceMinDia: 0.03, interferenceMaxDia: 0.05,
    shaftE: 207000, shaftNu: 0.292, hubE: 207000, hubNu: 0.292,
    shaftSy: 250, hubSy: 250,
    shaftAlphaPerK: cteToAlphaPerK(11.7), hubAlphaPerK: cteToAlphaPerK(11.7),
    length: 40, mu: 0.12, assemblyClearance: 0.02,
  };

  it("brackets the pressure across the interference range and grips at the minimum", () => {
    const r = analyzePressFit(base);
    expect(r.valid).toBe(true);
    expect(r.pMax).toBeCloseTo(77.62, 1);
    expect(r.pMin).toBeLessThan(r.pMax);
    // holding torque is evaluated at the *minimum* interference (worst grip)
    const expected = holdingCapacity(50, 40, 0.12, r.pMin).torque;
    expect(r.holdTorque).toBeCloseTo(expected, 3);
  });

  it("computes the governing safety factor at maximum interference", () => {
    const r = analyzePressFit(base);
    expect(r.hubSF).toBeCloseTo(250 / r.stress.hubVonMises, 6);
    expect(r.governingSF).toBeCloseTo(Math.min(r.hubSF, r.shaftSF), 9);
    expect(r.governingSF).toBeCloseTo(1.38, 1); // hub governs (~250/181)
  });

  it("flags invalid geometry with a reason", () => {
    const r = analyzePressFit({ ...base, hubOuterDia: 45 });
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/Hub OD/);
  });

  it("reports zero grip when the minimum interference is a clearance", () => {
    const r = analyzePressFit({ ...base, interferenceMinDia: -0.01 });
    expect(r.pMin).toBe(0);
    expect(r.holdTorque).toBe(0);
  });
});
