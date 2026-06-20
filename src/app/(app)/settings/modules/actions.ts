"use server";

import { revalidatePath } from "next/cache";
import { isAppAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModuleByType } from "@/lib/modules";
import type { ModuleType } from "@/lib/types";

/**
 * Set a module's tier (free/pro). App-owner only — re-checked here because a
 * Server Action is a public endpoint. Writes via the service role (the
 * `module_tiers` table has no client write policy).
 */
export async function setModuleTier(moduleType: ModuleType, tier: "free" | "pro") {
  if (!(await isAppAdmin())) throw new Error("Not authorized");
  if (!getModuleByType(moduleType)) throw new Error("Unknown module");
  if (tier !== "free" && tier !== "pro") throw new Error("Invalid tier");

  const admin = createAdminClient();
  const { error } = await admin
    .from("module_tiers")
    .upsert({ module_type: moduleType, tier, updated_at: new Date().toISOString() }, { onConflict: "module_type" });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/modules");
  revalidatePath("/tools");
  revalidatePath("/dashboard");
}
