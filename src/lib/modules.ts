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
  tier: "free" | "pro";
  saveable: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    slug: "linear-stack",
    type: "linear_stack",
    label: "Linear Stack-Up",
    standard: "Worst-case · RSS · Monte Carlo",
    blurb:
      "Stack dimensions into a gap or clearance, predict yield (Cpk / PPM) and see which dimension drives the variation.",
    tier: "pro",
    saveable: true,
  },
  {
    slug: "hole-shaft-fit",
    type: "hole_shaft_fit",
    label: "Hole / Shaft Fit",
    standard: "ISO 286",
    blurb:
      "Named fits or custom letter/grade. Clearance, transition and interference with tolerance-zone and cross-section diagrams.",
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
    tier: "pro",
    saveable: false,
  },
  {
    slug: "bolt-torque",
    type: "bolt_torque",
    label: "Bolt Torque",
    standard: "VDI 2230",
    blurb:
      "Tightening torque from target preload, friction breakdown, preload-vs-proof check and thread-engagement guidance.",
    tier: "pro",
    saveable: false,
  },
];

export function getModuleBySlug(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModuleByType(type: ModuleType): ModuleDef | undefined {
  return MODULES.find((m) => m.type === type);
}
