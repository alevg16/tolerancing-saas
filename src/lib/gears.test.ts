import { describe, it, expect } from "vitest";
import {
  involute,
  lewisFormFactor,
  elasticCoefficient,
  pitchLineVelocity,
  dynamicFactor,
  torqueFromPower,
  analyzeGear,
  gearMaterialById,
  type GearInput,
  type GearType,
} from "./gears";

const steel = gearMaterialById("steel-through-300")!;
const bronze = gearMaterialById("bronze-cusn12")!;

function makeInput(p: Partial<GearInput> & { type: GearType }): GearInput {
  return {
    type: p.type, module: 2, z1: 20, z2: 40, pressureAngle: 20, helixAngle: 0,
    faceWidth: 20, profileShift1: 0, profileShift2: 0, shaftAngle: 90, diameterFactor: 10, mu: 0,
    power: 5, speed: 1000, torque: 0, useTorque: false, KA: 1.25, mat1: steel, mat2: steel, ...p,
  };
}

describe("primitive factors", () => {
  it("involute(20°) ≈ 0.014904", () => {
    expect(involute(20 * Math.PI / 180)).toBeCloseTo(0.014904, 6);
  });
  it("Lewis form factor: table, clamps and interpolation", () => {
    expect(lewisFormFactor(20)).toBeCloseTo(0.322, 6);
    expect(lewisFormFactor(8)).toBeCloseTo(0.245, 6); // clamp low
    expect(lewisFormFactor(5000)).toBeCloseTo(0.484, 6); // clamp high
    expect(lewisFormFactor(35)).toBeCloseTo(0.374, 3); // between 34 and 40
  });
  it("elastic coefficient for steel/steel ≈ 189.8 √MPa", () => {
    expect(elasticCoefficient(206000, 0.3, 206000, 0.3)).toBeCloseTo(189.8, 0);
  });
  it("pitch-line velocity and Barth dynamic factor", () => {
    expect(pitchLineVelocity(40, 1000)).toBeCloseTo(2.0944, 3);
    expect(dynamicFactor(2.0944)).toBeCloseTo(1.3434, 3);
  });
  it("torque from power", () => {
    expect(torqueFromPower(5, 1000)).toBeCloseTo(47.75, 2);
  });
});

describe("spur geometry (Ø2 m, 20/40 z, 20°)", () => {
  const r = analyzeGear(makeInput({ type: "spur" }));
  it("pitch / base / tip / root diameters", () => {
    expect(r.d1).toBeCloseTo(40, 6);
    expect(r.d2).toBeCloseTo(80, 6);
    expect(r.db1).toBeCloseTo(37.588, 2);
    expect(r.da1).toBeCloseTo(44, 6);
    expect(r.df1).toBeCloseTo(35, 6);
  });
  it("center distance, ratio, working pressure angle (no shift)", () => {
    expect(r.centerDistance).toBeCloseTo(60, 6);
    expect(r.ratio).toBeCloseTo(2, 6);
    expect(r.workingPressureAngle).toBeCloseTo(20, 4);
    expect(r.workingCenterDistance).toBeCloseTo(60, 4);
  });
  it("transverse contact ratio ≈ 1.64 and no undercut at 20 teeth", () => {
    expect(r.contactRatio).toBeCloseTo(1.64, 1);
    expect(r.overlapRatio).toBe(0);
    expect(r.undercut).toBe(false);
    expect(r.minTeethNoUndercut).toBe(18); // ceil(17.1)
  });
});

describe("profile shift opens the center distance", () => {
  it("positive shift raises the working pressure angle and center distance", () => {
    const r = analyzeGear(makeInput({ type: "spur", profileShift1: 0.5, profileShift2: 0.5 }));
    expect(r.workingPressureAngle).toBeGreaterThan(20);
    expect(r.workingCenterDistance).toBeGreaterThan(r.centerDistance);
  });
});

describe("helical adds overlap", () => {
  const r = analyzeGear(makeInput({ type: "helical", helixAngle: 15 }));
  it("transverse pressure angle > normal and overlap ratio > 0", () => {
    expect(r.transversePressureAngle).toBeCloseTo(20.65, 1);
    expect(r.d1).toBeCloseTo(2 / Math.cos(15 * Math.PI / 180) * 20, 3); // mt·z1
    expect(r.overlapRatio).toBeCloseTo(20 * Math.sin(15 * Math.PI / 180) / (Math.PI * 2), 3);
    expect(r.totalContactRatio).toBeGreaterThan(r.contactRatio);
  });
});

describe("internal gear", () => {
  const r = analyzeGear(makeInput({ type: "internal", z1: 20, z2: 80 }));
  it("ring tip points inward; center distance from the difference", () => {
    expect(r.centerDistance).toBeCloseTo(60, 6); // (160−40)/2
    expect(r.ratio).toBeCloseTo(4, 6);
    expect(r.da2).toBeLessThan(r.d2); // tip inside pitch
  });
});

describe("rack & pinion", () => {
  const r = analyzeGear(makeInput({ type: "rack" }));
  it("linear travel per pinion revolution = π·d1", () => {
    expect(r.rackTravelPerRev).toBeCloseTo(Math.PI * 40, 4);
    expect(r.d1).toBeCloseTo(40, 6);
  });
});

describe("bevel gears", () => {
  it("straight bevel cone angles for 20/40 at Σ=90°", () => {
    const r = analyzeGear(makeInput({ type: "straight_bevel", z1: 20, z2: 40, faceWidth: 12 }));
    expect(r.coneAngle1).toBeCloseTo(26.565, 2);
    expect(r.coneAngle2).toBeCloseTo(63.435, 2);
    expect(r.outerConeDistance).toBeCloseTo(40 / (2 * Math.sin(26.565 * Math.PI / 180)), 1);
    expect(r.virtualTeeth1).toBeCloseTo(20 / Math.cos(26.565 * Math.PI / 180), 1);
    expect(r.meanModule).toBeLessThan(2); // shrinks toward the apex
  });
  it("miter is a 1:1 pair at 45° cones", () => {
    const r = analyzeGear(makeInput({ type: "miter", z1: 20, faceWidth: 12 }));
    expect(r.ratio).toBeCloseTo(1, 6);
    expect(r.coneAngle1).toBeCloseTo(45, 4);
  });
});

describe("worm drive", () => {
  it("high ratio, lead angle, efficiency and not self-locking with a fast lead", () => {
    const r = analyzeGear(makeInput({ type: "worm", z1: 2, z2: 40, diameterFactor: 10, module: 2, mat2: bronze }));
    expect(r.ratio).toBeCloseTo(20, 6);
    expect(r.centerDistance).toBeCloseTo(50, 6); // (20+80)/2
    expect(r.leadAngle).toBeCloseTo(Math.atan(2 / 10) * 180 / Math.PI, 2); // ≈ 11.31°
    expect(r.efficiency).toBeGreaterThan(0);
    expect(r.efficiency).toBeLessThan(1);
    expect(r.selfLocking).toBe(false);
    expect(r.outputTorque).toBeGreaterThan(0);
  });
  it("self-locks with a single start and high friction", () => {
    const r = analyzeGear(makeInput({ type: "worm", z1: 1, z2: 40, diameterFactor: 10, module: 2, mu: 0.12, mat2: bronze }));
    expect(r.selfLocking).toBe(true); // γ≈5.7° ≤ φ≈6.8°
  });
});

describe("rating relationships", () => {
  const r = analyzeGear(makeInput({ type: "spur", power: 5, speed: 1000, useTorque: false }));
  it("tangential force from torque, and SF = allowable / stress", () => {
    expect(r.torque1).toBeCloseTo(47.75, 1);
    expect(r.Ft).toBeCloseTo((2 * r.torque1 * 1000) / r.d1, 3);
    expect(r.SF_bending).toBeCloseTo(r.sigmaFAllow / r.sigmaF, 6);
    expect(r.SF_contact).toBeCloseTo(r.sigmaHAllow / r.sigmaH, 6);
    expect(r.sigmaF).toBeGreaterThan(0);
    expect(r.sigmaH).toBeGreaterThan(0);
  });
  it("accepts torque input directly", () => {
    const rt = analyzeGear(makeInput({ type: "spur", useTorque: true, torque: 100 }));
    expect(rt.torque1).toBe(100);
    expect(rt.Ft).toBeCloseTo((2 * 100 * 1000) / rt.d1, 3);
  });
});

describe("guards", () => {
  it("rejects a zero module", () => {
    expect(analyzeGear(makeInput({ type: "spur", module: 0 })).valid).toBe(false);
  });
});
