import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { MODULES, type ModuleDef } from "@/lib/modules";
import type { ModuleType } from "@/lib/types";

type Tier = "free" | "pro";

/**
 * Effective module tiers = code defaults overlaid with the `module_tiers`
 * overrides set in the admin table. If the table hasn't been migrated yet the
 * read fails softly and the static defaults stand, so the app never breaks.
 */
export const getTierOverrides = cache(async (): Promise<Record<string, Tier>> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("module_tiers").select("module_type, tier");
    if (error) return {};
    const map: Record<string, Tier> = {};
    for (const row of (data ?? []) as { module_type: string; tier: Tier }[]) {
      map[row.module_type] = row.tier;
    }
    return map;
  } catch {
    return {};
  }
});

export const getModulesWithTiers = cache(async (): Promise<ModuleDef[]> => {
  const overrides = await getTierOverrides();
  return MODULES.map((m) => (overrides[m.type] ? { ...m, tier: overrides[m.type] } : m));
});

export async function getEffectiveModuleBySlug(slug: string): Promise<ModuleDef | undefined> {
  return (await getModulesWithTiers()).find((m) => m.slug === slug);
}

export async function getEffectiveModuleByType(type: ModuleType): Promise<ModuleDef | undefined> {
  return (await getModulesWithTiers()).find((m) => m.type === type);
}
