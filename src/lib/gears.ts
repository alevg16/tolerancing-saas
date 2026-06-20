/**
 * Gear engine — geometry (authoritative) plus an engineering-estimate strength
 * rating (Lewis bending + Hertzian contact). Covers all common types from one
 * involute core, in three families:
 *   cylindrical — spur, helical, herringbone, internal, rack & pinion
 *   bevel       — straight bevel, spiral bevel, miter
 *   worm        — worm + worm wheel
 *
 * Geometry follows ISO 21771 / DIN 867 conventions and is exact. The rating is
 * a transparent first-pass estimate (Lewis form factor, Hertz contact with the
 * ISO zone/elastic factors, a Barth dynamic factor and a user application
 * factor) — NOT a full ISO 6336 / AGMA 2001 analysis. Always flagged as such.
 *
 * UNITS: module & lengths in mm, angles in degrees at the API edge (radians
 * internally), torque in N·m, force in N, stress & modulus in MPa, speed in rpm,
 * velocity in m/s.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export type GearType =
  | "spur" | "helical" | "herringbone" | "internal" | "rack"
  | "straight_bevel" | "spiral_bevel" | "miter"
  | "worm";

export type GearFamily = "cylindrical" | "bevel" | "worm";

export interface GearTypeDef {
  id: GearType;
  label: string;
  family: GearFamily;
  blurb: string;
}

export const GEAR_TYPES: GearTypeDef[] = [
  { id: "spur", label: "Spur", family: "cylindrical", blurb: "Straight teeth, parallel shafts — the baseline." },
  { id: "helical", label: "Helical", family: "cylindrical", blurb: "Angled teeth — smoother, quieter, axial thrust." },
  { id: "herringbone", label: "Double Helical (Herringbone)", family: "cylindrical", blurb: "Two opposed helices — cancels axial thrust." },
  { id: "internal", label: "Internal (Ring)", family: "cylindrical", blurb: "Pinion inside a ring — compact, same rotation sense." },
  { id: "rack", label: "Rack & Pinion", family: "cylindrical", blurb: "Pinion on a rack — rotary to linear." },
  { id: "straight_bevel", label: "Straight Bevel", family: "bevel", blurb: "Intersecting shafts, straight teeth on a cone." },
  { id: "spiral_bevel", label: "Spiral Bevel", family: "bevel", blurb: "Curved teeth — smoother, higher capacity bevel." },
  { id: "miter", label: "Miter", family: "bevel", blurb: "1:1 bevel pair on 90° shafts." },
  { id: "worm", label: "Worm & Wheel", family: "worm", blurb: "High ratio, right-angle, can self-lock." },
];

export function gearTypeDef(id: GearType): GearTypeDef {
  return GEAR_TYPES.find((g) => g.id === id) ?? GEAR_TYPES[0];
}

export function familyOf(id: GearType): GearFamily {
  return gearTypeDef(id).family;
}

/** Involute function inv(α) = tan α − α, α in radians. */
export function involute(alphaRad: number): number {
  return Math.tan(alphaRad) - alphaRad;
}

/** Lewis form factor Y (20° full-depth), interpolated on tooth count. */
const LEWIS_TABLE: ReadonlyArray<readonly [number, number]> = [
  [12, 0.245], [14, 0.277], [16, 0.296], [18, 0.309], [20, 0.322], [22, 0.331],
  [25, 0.340], [28, 0.352], [30, 0.358], [34, 0.371], [40, 0.389], [50, 0.408],
  [60, 0.421], [80, 0.435], [100, 0.446], [150, 0.460], [300, 0.472], [1000, 0.484],
];
export function lewisFormFactor(z: number): number {
  const t = LEWIS_TABLE;
  if (z <= t[0][0]) return t[0][1];
  if (z >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 0; i < t.length - 1; i++) {
    if (z >= t[i][0] && z <= t[i + 1][0]) {
      const [z0, y0] = t[i];
      const [z1, y1] = t[i + 1];
      return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
    }
  }
  return 0.484;
}

/** Elastic coefficient ZE (√MPa) from each material's E (MPa) and ν. */
export function elasticCoefficient(E1: number, nu1: number, E2: number, nu2: number): number {
  return Math.sqrt(1 / (Math.PI * ((1 - nu1 * nu1) / E1 + (1 - nu2 * nu2) / E2)));
}

/** Pitch-line velocity (m/s) from pitch diameter (mm) and speed (rpm). */
export function pitchLineVelocity(dMm: number, rpm: number): number {
  return (Math.PI * dMm * rpm) / 60000;
}

/** Barth dynamic factor for milled/hobbed gears (estimate). v in m/s. */
export function dynamicFactor(v: number): number {
  return (6.1 + Math.max(0, v)) / 6.1;
}

export type GearMounting = "open" | "commercial" | "precision" | "extra_precision";

/** AGMA 2001 dynamic factor Kv from accuracy grade Qv (5–11) and velocity (m/s). */
export function agmaDynamicFactor(Qv: number, v: number): number {
  const qv = Math.min(11, Math.max(5, Qv));
  const B = 0.25 * Math.pow(12 - qv, 2 / 3);
  const A = 50 + 56 * (1 - B);
  return Math.pow((A + Math.sqrt(200 * Math.max(0, v))) / A, B);
}

/** AGMA 2001 load-distribution factor KHβ = 1 + Cpf + Cma (b, d in mm). */
export function faceLoadFactor(b: number, d: number, mounting: GearMounting): number {
  const F = Math.max(1e-3, b), D = Math.max(1e-3, d);
  let Cpf = F <= 25 ? F / (10 * D) - 0.025 : F / (10 * D) - 0.0375 + 0.000492 * F;
  if (Cpf < 0) Cpf = 0;
  const cma: Record<GearMounting, [number, number, number]> = {
    open: [0.247, 0.657e-3, -1.186e-7],
    commercial: [0.127, 0.622e-3, -1.69e-7],
    precision: [0.0675, 0.504e-3, -1.44e-7],
    extra_precision: [0.0036, 0.402e-3, -1.27e-7],
  };
  const [a, bb, cc] = cma[mounting] ?? cma.commercial;
  const Cma = a + bb * F + cc * F * F;
  return 1 + Cpf + Cma;
}

/** Transverse load factor KHα ≈ KFα, estimated from accuracy grade (indicative). */
export function transverseFactor(Qv: number): number {
  const qv = Math.min(11, Math.max(5, Qv));
  return Math.min(1.4, Math.max(1, 1 + (11 - qv) * 0.05));
}

/** Contact life factor ZNT (estimate): 1.0 at ≥1e9 cycles, rising for shorter life. */
export function contactLifeFactor(cycles: number): number {
  const N = Math.max(1e3, cycles);
  return N >= 1e9 ? 1.0 : Math.min(1.6, Math.pow(1e9 / N, 0.057));
}

/** Bending life factor YNT (estimate): 1.0 at ≥3e6 cycles, rising for shorter life. */
export function bendingLifeFactor(cycles: number): number {
  const N = Math.max(1e3, cycles);
  return N >= 3e6 ? 1.0 : Math.min(2.5, Math.pow(3e6 / N, 0.12));
}

/** Torque (N·m) on a shaft from power (kW) and speed (rpm). */
export function torqueFromPower(powerKw: number, rpm: number): number {
  if (rpm === 0) return 0;
  return (9550 * powerKw) / rpm;
}

export interface GearMaterial {
  id: string;
  name: string;
  kind: string;
  hardness: string;
  /** Allowable contact stress σ_Hlim, MPa (indicative — verify). */
  sHlim: number;
  /** Allowable bending stress σ_Flim, MPa (indicative — verify). */
  sFlim: number;
  /** Young's modulus, GPa. */
  E: number;
  nu: number;
  source: string;
}

/** Representative ISO 6336-5 (≈ grade MQ) allowables — indicative & editable. */
export const GEAR_MATERIALS: GearMaterial[] = [
  { id: "steel-through-300", name: "Through-hardened steel ~300 HB", kind: "through-hardened", hardness: "300 HB", sHlim: 740, sFlim: 315, E: 206, nu: 0.30, source: "ISO 6336-5 MQ, indicative" },
  { id: "steel-through-350", name: "Through-hardened alloy ~350 HB", kind: "through-hardened", hardness: "350 HB", sHlim: 800, sFlim: 350, E: 206, nu: 0.30, source: "ISO 6336-5 MQ, indicative" },
  { id: "steel-case-60", name: "Case-hardened steel 58–62 HRC", kind: "case-hardened", hardness: "60 HRC", sHlim: 1500, sFlim: 430, E: 206, nu: 0.30, source: "ISO 6336-5 MQ, indicative" },
  { id: "steel-nitrided", name: "Nitrided steel ~600 HV", kind: "nitrided", hardness: "600 HV", sHlim: 1250, sFlim: 420, E: 206, nu: 0.30, source: "ISO 6336-5 MQ, indicative" },
  { id: "steel-induction", name: "Induction-hardened ~52 HRC", kind: "surface-hardened", hardness: "52 HRC", sHlim: 1150, sFlim: 340, E: 206, nu: 0.30, source: "ISO 6336-5 MQ, indicative" },
  { id: "cast-iron-nodular", name: "Nodular cast iron", kind: "cast iron", hardness: "~250 HB", sHlim: 490, sFlim: 225, E: 175, nu: 0.275, source: "ISO 6336-5, indicative" },
  { id: "cast-iron-grey", name: "Grey cast iron (brittle)", kind: "cast iron", hardness: "~200 HB", sHlim: 340, sFlim: 90, E: 110, nu: 0.26, source: "indicative; brittle" },
  { id: "bronze-cusn12", name: "Phosphor bronze (worm wheel)", kind: "bronze", hardness: "~90 HB", sHlim: 265, sFlim: 100, E: 95, nu: 0.34, source: "worm wheel; verify vs ISO TR 14521" },
  { id: "polymer-pom", name: "Acetal POM", kind: "polymer", hardness: "—", sHlim: 75, sFlim: 45, E: 3, nu: 0.39, source: "indicative; dry, RT" },
  { id: "polymer-pa66", name: "Polyamide PA66", kind: "polymer", hardness: "—", sHlim: 60, sFlim: 35, E: 3, nu: 0.40, source: "indicative; dry, RT" },
];

export function gearMaterialById(id: string): GearMaterial | undefined {
  return GEAR_MATERIALS.find((m) => m.id === id);
}

export interface GearInput {
  type: GearType;
  /** Normal module mn (cylindrical), outer transverse module (bevel), or axial module mx (worm), mm. */
  module: number;
  /** Pinion teeth, or worm starts. */
  z1: number;
  /** Gear/wheel teeth (ring count for internal; ignored for rack). */
  z2: number;
  /** Normal pressure angle, deg. */
  pressureAngle: number;
  /** Helix angle (helical/herringbone) or mean spiral angle (spiral bevel), deg. */
  helixAngle: number;
  /** Face width b, mm. */
  faceWidth: number;
  profileShift1: number;
  profileShift2: number;
  /** Shaft angle for bevel, deg (usually 90). */
  shaftAngle: number;
  /** Worm diameter factor q (d1 = q·mx). */
  diameterFactor: number;
  /** Worm friction coefficient (sliding). */
  mu: number;
  // Load
  power: number; // kW
  speed: number; // rpm of member 1
  torque: number; // N·m on member 1
  useTorque: boolean;
  KA: number; // application/service factor
  /** Transmission accuracy grade Qv (AGMA, 5–11; higher = more accurate). */
  qualityGrade: number;
  /** Mounting / mesh-alignment class for the face-load factor. */
  mounting: GearMounting;
  /** Required life in load cycles (for the life factors). */
  lifeCycles: number;
  // Materials
  mat1: GearMaterial;
  mat2: GearMaterial;
}

export interface RatingFactors {
  KA: number;
  Kv: number;
  KHbeta: number;
  KHalpha: number;
  Zbeta: number;
  Zeps: number;
  Yeps: number;
  Ybeta: number;
  ZNT: number;
  YNT: number;
}

export interface GearResult {
  valid: boolean;
  reason: string | null;
  family: GearFamily;
  ratio: number;
  // pitch / tip / root / base diameters (mm)
  d1: number; d2: number;
  da1: number; da2: number;
  df1: number; df2: number;
  db1: number; db2: number;
  centerDistance: number;
  workingCenterDistance: number;
  transversePressureAngle: number;
  workingPressureAngle: number;
  // ratios
  contactRatio: number;
  overlapRatio: number;
  totalContactRatio: number;
  minTeethNoUndercut: number;
  undercut: boolean;
  axialPitch: number;
  rackTravelPerRev: number;
  // bevel
  coneAngle1: number; coneAngle2: number;
  outerConeDistance: number; meanModule: number;
  virtualTeeth1: number; virtualTeeth2: number;
  // worm
  leadAngle: number; slidingVelocity: number; efficiency: number; selfLocking: boolean;
  outputTorque: number;
  // loads + rating
  torque1: number; Ft: number; pitchVelocity: number; Kv: number;
  factors: RatingFactors;
  sigmaF: number; sigmaFAllow: number; SF_bending: number;
  sigmaH: number; sigmaHAllow: number; SF_contact: number;
  notes: string[];
}

const UNIT_FACTORS: RatingFactors = { KA: 1, Kv: 1, KHbeta: 1, KHalpha: 1, Zbeta: 1, Zeps: 1, Yeps: 1, Ybeta: 1, ZNT: 1, YNT: 1 };

function blankResult(family: GearFamily): GearResult {
  return {
    valid: true, reason: null, family, ratio: 0,
    d1: 0, d2: 0, da1: 0, da2: 0, df1: 0, df2: 0, db1: 0, db2: 0,
    centerDistance: 0, workingCenterDistance: 0, transversePressureAngle: 0, workingPressureAngle: 0,
    contactRatio: 0, overlapRatio: 0, totalContactRatio: 0, minTeethNoUndercut: 0, undercut: false,
    axialPitch: 0, rackTravelPerRev: 0,
    coneAngle1: 0, coneAngle2: 0, outerConeDistance: 0, meanModule: 0, virtualTeeth1: 0, virtualTeeth2: 0,
    leadAngle: 0, slidingVelocity: 0, efficiency: 0, selfLocking: false, outputTorque: 0,
    torque1: 0, Ft: 0, pitchVelocity: 0, Kv: 1, factors: { ...UNIT_FACTORS },
    sigmaF: 0, sigmaFAllow: 0, SF_bending: Infinity, sigmaH: 0, sigmaHAllow: 0, SF_contact: Infinity,
    notes: [],
  };
}

function inputTorque(input: GearInput): number {
  return input.useTorque ? input.torque : torqueFromPower(input.power, input.speed);
}

/**
 * Bending + contact rating shared by cylindrical and (virtual) bevel meshes,
 * following the ISO 6336 / AGMA 2001 structure with the supplied factor set:
 *   σF = (Ft·K / (b·m·Y))·Yε·Yβ ;  σFP = σ_Flim·YNT
 *   σH = ZE·ZH·Zε·Zβ·√(Ft·K/(b·d)·(u±1)/u) ;  σHP = σ_Hlim·ZNT
 * with K = KA·Kv·KHβ·KHα. Still an engineering estimate (no ZL/Zv/ZR/ZW/YX…).
 */
function rateMesh(args: {
  Ft: number; faceWidth: number; module: number; d1: number;
  zForLewis: number; ratioU: number; internal: boolean;
  alphaT: number; alphaTw: number; betaB: number;
  factors: RatingFactors; mat1: GearMaterial; mat2: GearMaterial;
}) {
  const { Ft, faceWidth: b, module: m, d1, zForLewis, ratioU, internal, factors: f } = args;
  const K = f.KA * f.Kv * f.KHbeta * f.KHalpha;
  const Y = lewisFormFactor(Math.max(5, zForLewis));
  const sigmaF = ((Ft * K) / Math.max(1e-6, b * m * Y)) * f.Yeps * f.Ybeta;
  const sigmaFAllow = Math.min(args.mat1.sFlim, args.mat2.sFlim) * f.YNT;

  const ZE = elasticCoefficient(args.mat1.E * 1000, args.mat1.nu, args.mat2.E * 1000, args.mat2.nu);
  const ZH = Math.sqrt(
    (2 * Math.cos(args.betaB) * Math.cos(args.alphaTw)) /
      (Math.cos(args.alphaT) ** 2 * Math.sin(args.alphaTw)),
  );
  const u = Math.max(1e-6, ratioU);
  const sign = internal ? -1 : 1;
  const sigmaH =
    ZE * ZH * f.Zeps * f.Zbeta * Math.sqrt(((Ft * K) / (Math.max(1e-6, d1) * b)) * ((u + sign) / u));
  const sigmaHAllow = Math.min(args.mat1.sHlim, args.mat2.sHlim) * f.ZNT;

  return {
    sigmaF, sigmaFAllow, SF_bending: sigmaF > 0 ? sigmaFAllow / sigmaF : Infinity,
    sigmaH, sigmaHAllow, SF_contact: sigmaH > 0 ? sigmaHAllow / sigmaH : Infinity,
  };
}

/** Assemble the ISO 6336-style factor set for a mesh at pitch diameter `d`. */
function ratingFactors(input: GearInput, d: number, velocity: number, contactRatio: number, overlapRatio: number, betaRad: number, helical: boolean): RatingFactors {
  const ea = Math.max(1.0, contactRatio);
  return {
    KA: input.KA,
    Kv: agmaDynamicFactor(input.qualityGrade, velocity),
    KHbeta: faceLoadFactor(input.faceWidth, d, input.mounting),
    KHalpha: transverseFactor(input.qualityGrade),
    Zbeta: Math.sqrt(Math.max(0.1, Math.cos(betaRad))),
    Zeps: helical ? Math.sqrt(1 / ea) : Math.sqrt((4 - ea) / 3),
    Yeps: 0.25 + 0.75 / ea,
    Ybeta: Math.max(0.75, 1 - (Math.min(1, overlapRatio) * Math.min(30, Math.abs(betaRad) * R2D)) / 120),
    ZNT: contactLifeFactor(input.lifeCycles),
    YNT: bendingLifeFactor(input.lifeCycles),
  };
}

function analyzeCylindrical(input: GearInput): GearResult {
  const r = blankResult("cylindrical");
  const notes: string[] = [];
  const mn = input.module;
  const z1 = Math.round(input.z1);
  const isRack = input.type === "rack";
  const isInternal = input.type === "internal";
  const z2 = isRack ? Infinity : Math.round(input.z2);
  const beta = input.helixAngle * D2R;
  const alphaN = input.pressureAngle * D2R;
  const x1 = input.profileShift1;
  const x2 = input.profileShift2;

  if (!(mn > 0) || !(z1 >= 3)) {
    return { ...r, valid: false, reason: "Module must be > 0 and pinion teeth ≥ 3." };
  }

  const alphaT = Math.atan(Math.tan(alphaN) / Math.cos(beta));
  const mt = mn / Math.cos(beta);
  const d1 = mt * z1;
  const d2 = isRack ? Infinity : mt * Math.abs(z2);
  const db1 = d1 * Math.cos(alphaT);
  const db2 = isRack ? Infinity : d2 * Math.cos(alphaT);
  const ha1 = mn * (1 + x1);
  const ha2 = mn * (1 + x2);
  const hf1 = mn * (1.25 - x1);
  const hf2 = mn * (1.25 - x2);

  const da1 = d1 + 2 * ha1;
  const df1 = d1 - 2 * hf1;
  let da2: number, df2: number, centerDistance: number, workingCenter: number, alphaTw: number;

  if (isRack) {
    da2 = Infinity; df2 = Infinity;
    centerDistance = Infinity; workingCenter = Infinity; alphaTw = alphaT;
  } else if (isInternal) {
    // Ring gear: addendum points inward.
    da2 = d2 - 2 * ha2;
    df2 = d2 + 2 * hf2;
    centerDistance = (d2 - d1) / 2;
    // Working pressure angle from profile-shift sum (internal: x2 − x1, z2 − z1).
    const invAtw = involute(alphaT) + (2 * (x2 - x1) * Math.tan(alphaN)) / (z2 - z1);
    alphaTw = solveInvolute(invAtw, alphaT);
    workingCenter = (centerDistance * Math.cos(alphaT)) / Math.cos(alphaTw);
  } else {
    da2 = d2 + 2 * ha2;
    df2 = d2 - 2 * hf2;
    centerDistance = (d1 + d2) / 2;
    const invAtw = involute(alphaT) + (2 * (x1 + x2) * Math.tan(alphaN)) / (z1 + z2);
    alphaTw = solveInvolute(invAtw, alphaT);
    workingCenter = (centerDistance * Math.cos(alphaT)) / Math.cos(alphaTw);
  }

  // Contact ratio
  const ra1 = da1 / 2, rb1 = db1 / 2;
  const pbt = Math.PI * mt * Math.cos(alphaT); // transverse base pitch
  let contactRatio: number;
  if (isRack) {
    const ga = Math.sqrt(Math.max(0, ra1 * ra1 - rb1 * rb1)) - rb1 * Math.tan(alphaT) + mn / Math.sin(alphaT);
    contactRatio = ga / pbt;
    notes.push("Rack contact ratio is approximate.");
  } else if (isInternal) {
    const ra2 = da2 / 2, rb2 = db2 / 2;
    const ga = Math.sqrt(Math.max(0, ra1 * ra1 - rb1 * rb1)) - Math.sqrt(Math.max(0, ra2 * ra2 - rb2 * rb2)) + workingCenter * Math.sin(alphaTw);
    contactRatio = ga / pbt;
  } else {
    const ra2 = da2 / 2, rb2 = db2 / 2;
    const ga = Math.sqrt(Math.max(0, ra1 * ra1 - rb1 * rb1)) + Math.sqrt(Math.max(0, ra2 * ra2 - rb2 * rb2)) - workingCenter * Math.sin(alphaTw);
    contactRatio = ga / pbt;
  }
  const overlapRatio = beta !== 0 ? (input.faceWidth * Math.sin(beta)) / (Math.PI * mn) : 0;

  // Undercut threshold (virtual spur in transverse plane)
  const minTeeth = (2 * (1 - x1)) / (Math.sin(alphaT) ** 2);
  const undercut = z1 < minTeeth - 0.3;
  if (undercut) notes.push(`Pinion may undercut below ~${Math.ceil(minTeeth)} teeth; add profile shift.`);
  if (input.type === "herringbone") notes.push("Herringbone: opposed helices cancel net axial thrust.");

  // Loads & rating
  const T1 = inputTorque(input);
  const Ft = (2 * T1 * 1000) / d1; // N
  const v = pitchLineVelocity(d1, input.speed);
  const betaB = Math.atan(Math.tan(beta) * Math.cos(alphaT));
  const zv1 = z1 / Math.cos(beta) ** 3; // virtual teeth for Lewis
  const ratioU = isRack ? 1e9 : Math.abs(z2) / z1;
  const factors = ratingFactors(input, d1, v, contactRatio, overlapRatio, beta, beta !== 0);
  const rate = rateMesh({
    Ft, faceWidth: input.faceWidth, module: mn, d1, zForLewis: zv1, ratioU, internal: isInternal,
    alphaT, alphaTw, betaB, factors, mat1: input.mat1, mat2: input.mat2,
  });

  return {
    ...r,
    ratio: isRack ? 0 : Math.abs(z2) / z1,
    d1, d2, da1, da2, df1, df2, db1, db2,
    centerDistance, workingCenterDistance: workingCenter,
    transversePressureAngle: alphaT * R2D, workingPressureAngle: alphaTw * R2D,
    contactRatio, overlapRatio, totalContactRatio: contactRatio + overlapRatio,
    minTeethNoUndercut: Math.ceil(minTeeth), undercut,
    axialPitch: beta !== 0 ? (Math.PI * mn) / Math.sin(beta) : 0,
    rackTravelPerRev: isRack ? Math.PI * d1 : 0,
    torque1: T1, Ft, pitchVelocity: v, Kv: factors.Kv, factors,
    ...rate,
    notes,
  };
}

function analyzeBevel(input: GearInput): GearResult {
  const r = blankResult("bevel");
  const notes: string[] = [];
  const m = input.module;
  const z1 = Math.round(input.z1);
  const z2 = input.type === "miter" ? z1 : Math.round(input.z2);
  const sigma = (input.type === "miter" ? 90 : input.shaftAngle) * D2R;
  const alphaN = input.pressureAngle * D2R;
  if (!(m > 0) || !(z1 >= 3) || !(z2 >= 3)) {
    return { ...r, valid: false, reason: "Module must be > 0 and both teeth counts ≥ 3." };
  }

  const d1 = m * z1, d2 = m * z2;
  const delta1 = Math.atan2(Math.sin(sigma), z2 / z1 + Math.cos(sigma));
  const delta2 = sigma - delta1;
  const ReExact = d1 / (2 * Math.sin(delta1));
  const meanModule = m * (1 - (0.5 * input.faceWidth) / ReExact);
  const dm1 = d1 - input.faceWidth * Math.sin(delta1); // mean pitch diameter
  const zv1 = z1 / Math.cos(delta1); // Tredgold virtual teeth
  const zv2 = z2 / Math.cos(delta2);

  const ha = m; // bevel addendum (approx, straight bevel)
  const da1 = d1 + 2 * ha * Math.cos(delta1);
  const da2 = d2 + 2 * ha * Math.cos(delta2);

  if (input.type === "spiral_bevel") notes.push("Spiral bevel rated as an equivalent helical virtual gear.");
  if (input.type === "miter") notes.push("Miter: 1:1 bevel pair on 90° shafts.");
  notes.push("Bevel rating uses the Tredgold virtual (equivalent) cylindrical gear at the mean cone.");

  const T1 = inputTorque(input);
  const Ft = (2 * T1 * 1000) / dm1; // at mean diameter
  const v = pitchLineVelocity(dm1, input.speed);
  const betaSpiral = input.type === "spiral_bevel" ? input.helixAngle * D2R : 0;
  const alphaT = Math.atan(Math.tan(alphaN) / Math.cos(betaSpiral));
  const betaB = Math.atan(Math.tan(betaSpiral) * Math.cos(alphaT));
  const contactRatio = 1.4; // representative for bevel; flagged
  notes.push("Bevel contact ratio shown as a nominal estimate.");
  const factors = ratingFactors(input, dm1, v, contactRatio, 0, betaSpiral, betaSpiral !== 0);
  const rate = rateMesh({
    Ft, faceWidth: input.faceWidth, module: meanModule, d1: dm1, zForLewis: zv1, ratioU: z2 / z1, internal: false,
    alphaT, alphaTw: alphaT, betaB, factors, mat1: input.mat1, mat2: input.mat2,
  });

  return {
    ...r,
    ratio: z2 / z1,
    d1, d2, da1, da2, df1: 0, df2: 0, db1: 0, db2: 0,
    centerDistance: 0, workingCenterDistance: 0,
    transversePressureAngle: alphaT * R2D, workingPressureAngle: alphaT * R2D,
    contactRatio, overlapRatio: 0, totalContactRatio: contactRatio,
    minTeethNoUndercut: 0, undercut: false, axialPitch: 0, rackTravelPerRev: 0,
    coneAngle1: delta1 * R2D, coneAngle2: delta2 * R2D, outerConeDistance: ReExact, meanModule,
    virtualTeeth1: zv1, virtualTeeth2: zv2,
    torque1: T1, Ft, pitchVelocity: v, Kv: factors.Kv, factors,
    ...rate,
    notes,
  };
}

function analyzeWorm(input: GearInput): GearResult {
  const r = blankResult("worm");
  const notes: string[] = [];
  const mx = input.module; // axial module
  const z1 = Math.max(1, Math.round(input.z1)); // starts
  const z2 = Math.round(input.z2); // wheel teeth
  const q = input.diameterFactor;
  const alphaN = input.pressureAngle * D2R;
  if (!(mx > 0) || !(z2 >= 5) || !(q > 0)) {
    return { ...r, valid: false, reason: "Need module > 0, wheel teeth ≥ 5 and diameter factor q > 0." };
  }

  const d1 = q * mx; // worm pitch diameter
  const d2 = mx * z2; // wheel pitch diameter
  const a = (d1 + d2) / 2;
  const ratio = z2 / z1;
  const gamma = Math.atan(z1 / q); // lead angle
  const v1 = pitchLineVelocity(d1, input.speed);
  const vs = Math.cos(gamma) > 1e-6 ? v1 / Math.cos(gamma) : v1; // sliding velocity
  // Speed-dependent friction estimate (decreasing with sliding speed).
  const muIn = input.mu > 0 ? input.mu : Math.max(0.02, 0.026 + 0.18 / (1 + 8 * vs));
  const phi = Math.atan(muIn);
  const efficiency = Math.tan(gamma) / Math.tan(gamma + phi); // driving: worm → wheel
  const selfLocking = gamma <= phi;
  if (selfLocking) notes.push("Self-locking (lead angle ≤ friction angle): wheel cannot back-drive the worm.");
  notes.push("Worm rating is wear/thermal-limited; this contact estimate is indicative — verify vs ISO TR 14521 / AGMA 6034.");

  const T1 = inputTorque(input);
  const outputTorque = T1 * ratio * efficiency;
  const Ft2 = (2 * outputTorque * 1000) / d2; // wheel tangential force
  const b = input.faceWidth;
  const KHbeta = faceLoadFactor(b, d2, input.mounting);
  const ZNT = contactLifeFactor(input.lifeCycles), YNT = bendingLifeFactor(input.lifeCycles);
  const K = input.KA * KHbeta;
  const factors: RatingFactors = { ...UNIT_FACTORS, KA: input.KA, KHbeta, ZNT, YNT };
  // Indicative wheel contact stress (Hertz, bronze wheel governs).
  const ZE = elasticCoefficient(input.mat1.E * 1000, input.mat1.nu, input.mat2.E * 1000, input.mat2.nu);
  const sigmaH = ZE * Math.sqrt((Ft2 * K) / (Math.max(1e-6, d2 * b) * Math.cos(alphaN)));
  const sigmaHAllow = input.mat2.sHlim * ZNT; // wheel (bronze) allowable
  // Indicative wheel bending (Lewis on wheel teeth).
  const Y = lewisFormFactor(z2);
  const sigmaF = (Ft2 * K) / Math.max(1e-6, b * mx * Y);
  const sigmaFAllow = input.mat2.sFlim * YNT;

  return {
    ...r,
    ratio,
    d1, d2, da1: d1 + 2 * mx, da2: d2 + 2 * mx, df1: d1 - 2.4 * mx, df2: d2 - 2.4 * mx, db1: 0, db2: 0,
    centerDistance: a, workingCenterDistance: a,
    transversePressureAngle: input.pressureAngle, workingPressureAngle: input.pressureAngle,
    contactRatio: 0, overlapRatio: 0, totalContactRatio: 0, minTeethNoUndercut: 0, undercut: false,
    axialPitch: Math.PI * mx, rackTravelPerRev: 0,
    leadAngle: gamma * R2D, slidingVelocity: vs, efficiency, selfLocking, outputTorque,
    torque1: T1, Ft: Ft2, pitchVelocity: v1, Kv: 1, factors,
    sigmaF, sigmaFAllow, SF_bending: sigmaF > 0 ? sigmaFAllow / sigmaF : Infinity,
    sigmaH, sigmaHAllow, SF_contact: sigmaH > 0 ? sigmaHAllow / sigmaH : Infinity,
    notes,
  };
}

/** Newton solve of inv(α) = target for α (radians), seeded near `guess`. */
function solveInvolute(target: number, guess: number): number {
  let a = Math.max(0.05, guess);
  for (let i = 0; i < 60; i++) {
    const f = involute(a) - target;
    const df = Math.tan(a) ** 2; // d/da (tan a − a) = sec²a − 1 = tan²a
    if (Math.abs(df) < 1e-12) break;
    const step = f / df;
    a -= step;
    if (a < 0.01) a = 0.01;
    if (a > 1.5) a = 1.5;
    if (Math.abs(step) < 1e-13) break;
  }
  return a;
}

export function analyzeGear(input: GearInput): GearResult {
  const fam = familyOf(input.type);
  if (fam === "bevel") return analyzeBevel(input);
  if (fam === "worm") return analyzeWorm(input);
  return analyzeCylindrical(input);
}
