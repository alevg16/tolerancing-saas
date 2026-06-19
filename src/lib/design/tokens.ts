/**
 * Shared design tokens — the same restrained palette the calculators use, so
 * the SaaS shell and the tools feel like one product.
 */
export const C = {
  ink: "#16181B",
  sub: "#5C6066",
  faint: "#8A8F96",
  line: "#E4E5E1",
  paper: "#F2F3F1",
  panel: "#FFFFFF",
  accent: "#0E5A6B",
  accentBg: "#E5EEF2",
  ok: "#1F7A4D",
  okBg: "#E8F2EC",
  warn: "#B5862B",
  warnBg: "#F7F1E2",
  fail: "#B23A48",
  failBg: "#F7E9EB",
} as const;

export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
export const SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
