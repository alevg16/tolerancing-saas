/**
 * Company standards library — the kinds of reusable standard an organization
 * can curate (stored as `library_items` rows: type = kind, name, data JSONB).
 * Config-driven so the form and list render generically and new kinds are a
 * one-entry change. No server-only imports: shared by the server page and the
 * client manager.
 */

export type StandardKind = "material" | "fit_preset" | "process_capability" | "tolerance_default";

export interface FieldDef {
  key: string;
  label: string;
  type?: "number" | "text";
  unit?: string;
  placeholder?: string;
}

export interface StandardExample {
  name: string;
  data: Record<string, string>;
}

export interface KindDef {
  kind: StandardKind;
  label: string;
  singular: string;
  blurb: string;
  fields: FieldDef[];
  summary: (data: Record<string, string>) => string;
  examples: StandardExample[];
}

export const STANDARD_KINDS: KindDef[] = [
  {
    kind: "material",
    label: "Materials",
    singular: "material",
    blurb: "Your house materials with the properties the calculators use.",
    fields: [
      { key: "cte", label: "CTE", unit: "µm/m·K" },
      { key: "E", label: "E", unit: "GPa" },
      { key: "nu", label: "ν" },
      { key: "sHlim", label: "σ_Hlim", unit: "MPa" },
      { key: "sFlim", label: "σ_Flim", unit: "MPa" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    summary: (d) => [d.cte && `CTE ${d.cte}`, d.E && `E ${d.E} GPa`, d.nu && `ν ${d.nu}`].filter(Boolean).join(" · ") || "—",
    examples: [
      { name: "Steel 42CrMo4 (Q&T)", data: { cte: "12.3", E: "206", nu: "0.30", sHlim: "800", sFlim: "350", notes: "general shafts" } },
      { name: "Aluminium 6082-T6", data: { cte: "23.4", E: "69", nu: "0.33", sHlim: "—", sFlim: "—", notes: "housings" } },
      { name: "Stainless 316L", data: { cte: "16.0", E: "193", nu: "0.30", sHlim: "—", sFlim: "—", notes: "wet / hygienic" } },
    ],
  },
  {
    kind: "fit_preset",
    label: "Fits",
    singular: "fit preset",
    blurb: "Named ISO fits your team standardises on, so nobody re-derives them.",
    fields: [
      { key: "code", label: "Fit code", type: "text", placeholder: "H7/k6" },
      { key: "category", label: "Category", type: "text", placeholder: "transition" },
      { key: "appliesTo", label: "Applies to", type: "text", placeholder: "bearing seats" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    summary: (d) => [d.code, d.category].filter(Boolean).join(" · ") || "—",
    examples: [
      { name: "Bearing inner seat", data: { code: "H7/k6", category: "transition", appliesTo: "rolling-bearing shaft seats", notes: "house standard" } },
      { name: "Slip-fit dowel", data: { code: "H7/g6", category: "clearance", appliesTo: "locating dowels", notes: "" } },
      { name: "Press-fit bushing", data: { code: "H7/p6", category: "interference", appliesTo: "bushings", notes: "verify push force" } },
    ],
  },
  {
    kind: "process_capability",
    label: "Process capability",
    singular: "capability",
    blurb: "Cpk / spread assumptions per process, for stack-up yield predictions.",
    fields: [
      { key: "process", label: "Process", type: "text", placeholder: "CNC milling" },
      { key: "cpk", label: "Cpk" },
      { key: "sigma", label: "σ", unit: "mm" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    summary: (d) => [d.process, d.cpk && `Cpk ${d.cpk}`].filter(Boolean).join(" · ") || "—",
    examples: [
      { name: "CNC milling (in-house)", data: { process: "3-axis mill", cpk: "1.33", sigma: "0.01", notes: "tight tolerances" } },
      { name: "Turning", data: { process: "CNC lathe", cpk: "1.67", sigma: "0.006", notes: "" } },
      { name: "Sheet / laser", data: { process: "laser cut", cpk: "1.0", sigma: "0.05", notes: "loose" } },
    ],
  },
  {
    kind: "tolerance_default",
    label: "Tolerance defaults",
    singular: "default",
    blurb: "Default ± tolerances applied when a drawing doesn't call one out.",
    fields: [
      { key: "plus", label: "+ tol", unit: "mm" },
      { key: "minus", label: "− tol", unit: "mm" },
      { key: "appliesTo", label: "Applies to", type: "text", placeholder: "linear ≤ 100 mm" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    summary: (d) => [d.plus !== undefined && `+${d.plus}`, d.minus !== undefined && `${d.minus}`].filter(Boolean).join(" / ") || "—",
    examples: [
      { name: "Linear ≤ 100 mm", data: { plus: "0.10", minus: "-0.10", appliesTo: "untoleranced linear ≤ 100", notes: "ISO 2768-m" } },
      { name: "Linear 100–400 mm", data: { plus: "0.15", minus: "-0.15", appliesTo: "untoleranced linear 100–400", notes: "ISO 2768-m" } },
    ],
  },
];

export function kindDef(kind: string): KindDef | undefined {
  return STANDARD_KINDS.find((k) => k.kind === kind);
}
