"use client";

import { CALCULATORS } from "@/components/calculators";
import { useHydrated } from "@/lib/use-hydrated";
import type { ModuleType } from "@/lib/types";

/**
 * Renders a calculator in stateless "scratch" mode (no persistence).
 * Client-only: some modules (e.g. the Monte-Carlo stack-up) are
 * non-deterministic at render, so we avoid SSR/hydration mismatch here.
 */
export default function CalculatorMount({ type }: { type: ModuleType }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div style={{ minHeight: "60vh" }} />;

  const Calc = CALCULATORS[type];
  return <Calc />;
}
