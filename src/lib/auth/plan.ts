import "server-only";

import { cache } from "react";
import { getCurrentOrg } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Plan, SubscriptionStatus } from "@/lib/types";

export interface OrgPlan {
  plan: Plan;
  status: SubscriptionStatus;
  isPro: boolean;
}

/**
 * The current org's billing plan, read from the synced `subscriptions` row.
 * `isPro` is the single gate the app checks — features are unlocked server-side
 * from this, never from the client.
 */
export const getCurrentPlan = cache(async (): Promise<OrgPlan> => {
  const { organization } = await getCurrentOrg();
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const plan = (data?.plan ?? "free") as Plan;
  const status = (data?.status ?? "active") as SubscriptionStatus;
  // Keep access through a past_due grace period; lose it only when canceled.
  const isPro = plan !== "free" && status !== "canceled";
  return { plan, status, isPro };
});
