"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR and the first client render, true thereafter —
 * without a setState-in-effect. Use to defer rendering of components that are
 * non-deterministic at render time (e.g. the Monte-Carlo stack-up).
 */
export function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
