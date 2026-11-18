import type { ModuleType } from "@/lib/types";

/**
 * Registry of calculator modules. Pure data (server-safe) — the slug→component
 * mapping lives in the client renderer (src/components/calculators).
 *
 * `saveable` marks modules wired to persist as projects. The data layer is
 * generic JSONB, so flipping the others on is a small, localized change.
 */
export interface ModuleDef {
  slug: string;
  type: ModuleType;
  label: string;
  standard: string;
  blurb: string;
  /** One-line decision cue — "reach for this when…" — to help pick the right tool fast. */
  useWhen: string;
  /** Grouping key, see CATEGORIES below. */
  category: CategoryKey;
  /** lucide-react icon name (mapped to a component in the tool cards). */
  icon: string;
  tier: "free" | "pro";
  saveable: boolean;
}

export type CategoryKey = "fits" | "stacks" | "gdt" | "gears";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  blurb: string;
}

/** Ordered categories for the tools browser. */
export const CATEGORIES: CategoryDef[] = [
  { key: "fits", label: "Fits & joints", blurb: "Two mating parts — clearance, interference, threads and bolted joints." },
  { key: "stacks", label: "Stack-ups & tolerance budgets", blurb: "Add up dimensional variation across an assembly and predict yield." },
  { key: "gdt", label: "GD&T", blurb: "Geometric callouts — position, profile, runout — against a datum frame." },
  { key: "gears", label: "Gears", blurb: "Gear geometry and load capacity." },
];

export const MODULES: ModuleDef[] = [
  {
    slug: "hole-shaft-fit",
    type: "hole_shaft_fit",
    label: "Hole / Shaft Fit",
    standard: "ISO 286",
    blurb:
      "Named fits or custom letter/grade. Clearance, transition and interference with tolerance-zone and cross-section diagrams.",
    useWhen: "You're picking a bearing seat, dowel or bushing fit and need the clearance or interference.",
    category: "fits",
    icon: "CircleDot",
    tier: "free",
    saveable: false,
  },
  {
    slug: "thread-fit",
    type: "thread_fit",
    label: "Thread Fit",
    standard: "ISO 965",
    blurb:
      "Metric thread tolerance classes for bolt and nut, pitch-diameter clearance and tolerance zones.",
    useWhen: "You need the tolerance class and pitch-diameter clearance for a metric thread.",
    category: "fits",
    icon: "Spline",
    tier: "free",
    saveable: false,
  },
  {
    slug: "bolt-torque",
    type: "bolt_torque",
    label: "Bolt Torque",
    standard: "VDI 2230",
    blurb:
      "Tightening torque from target preload, friction breakdown, preload-vs-proof check and thread-engagement guidance.",
    useWhen: "You're setting a tightening torque from a target preload and checking it against proof load.",
    category: "fits",
    icon: "Wrench",
    tier: "free",
    saveable: false,
  },
  {
    slug: "press-fit",
    type: "press_fit",
    label: "Press / Shrink Fit",
    standard: "Lamé thick-wall",
    blurb:
      "Interference fit by the Lamé equations: contact pressure and hub/shaft stress over the interference range, yield safety factor, grip force/torque and shrink-fit assembly temperatures.",
    useWhen: "You're sizing an interference fit — contact pressure, stress, grip and assembly temperature.",
    category: "fits",
    icon: "Combine",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "linear-stack",
    type: "linear_stack",
    label: "Linear Stack-Up",
    standard: "Worst-case · RSS · Monte Carlo",
    blurb:
      "Stack dimensions into a gap or clearance, predict yield (Cpk / PPM) and see which dimension drives the variation.",
    useWhen: "You're adding up dimensions into a gap and want worst-case / RSS / Monte-Carlo yield.",
    category: "stacks",
    icon: "Ruler",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "tolerance-allocation",
    type: "tolerance_allocation",
    label: "Tolerance Allocation",
    standard: "Budget · worst-case / RSS",
    blurb:
      "The inverse of a stack: given a target fit and yield, budget the tightest tolerance each dimension actually needs — weighted by how hard it is to hold.",
    useWhen: "You know the target fit and need to budget each part's tolerance backwards.",
    category: "stacks",
    icon: "SlidersHorizontal",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "thermal-stack",
    type: "thermal_stack",
    label: "Thermal Stack-Up",
    standard: "Differential expansion",
    blurb:
      "A linear stack where each dimension is on its own material, so the gap drifts with temperature. Gap at temperature, worst-case/RSS yield, the temperature window that stays in spec, and which part's expansion drives the drift.",
    useWhen: "Your gap drifts with temperature because parts are on different materials.",
    category: "stacks",
    icon: "Thermometer",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "gdt-stack",
    type: "gdt_stack",
    label: "GD&T-aware Stack-Up",
    standard: "± + geometric → WC / RSS",
    blurb:
      "A stack-up that mixes plain ± dimensions with geometric callouts — position, profile, orientation, form, runout. Each converts to its equivalent ± so GD&T and dimensional tolerances compete on the same footing.",
    useWhen: "Your stack mixes plain ± dimensions with geometric (position / profile / runout) callouts.",
    category: "stacks",
    icon: "Layers",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "gdt-analyzer",
    type: "gdt",
    label: "2D GD&T Analyzer",
    standard: "GD&T · ASME Y14.5",
    blurb:
      "Check a whole feature pattern and any geometric callout — position, profile, orientation, form, runout — with MMC/LMC bonus, virtual condition and a 2D datum-frame map of the tolerance zones.",
    useWhen: "You're checking a feature pattern against GD&T callouts with MMC / LMC bonus.",
    category: "gdt",
    icon: "Crosshair",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "true-position",
    type: "true_position",
    label: "True Position",
    standard: "GD&T · ASME Y14.5",
    blurb:
      "Verify a feature against its position tolerance with MMC/LMC bonus, plot the zone and the measured point, and size the tolerance from a pin-in-hole (floating/fixed fastener) fit.",
    useWhen: "You're verifying one feature's position tolerance, or sizing it from a fastener fit.",
    category: "gdt",
    icon: "Target",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "gear",
    type: "gear",
    label: "Gear Calculator",
    standard: "ISO 21771 · Lewis / Hertz",
    blurb:
      "All common gear types in one tool — spur, helical, herringbone, internal, rack, bevel (straight/spiral/miter) and worm. Exact geometry plus a material/hardness-driven bending & contact strength estimate.",
    useWhen: "You need gear geometry plus a bending & contact strength estimate.",
    category: "gears",
    icon: "Settings",
    tier: "pro",
    saveable: true,
  },
];

export function getModuleBySlug(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModuleByType(type: ModuleType): ModuleDef | undefined {
  return MODULES.find((m) => m.type === type);
}
