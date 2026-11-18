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
 * How long a `past_due` subscription keeps Pro access past the end of its paid
 * period before the gate closes. Stripe retries dunning over ~2–3 weeks; this
 * covers that window without granting indefinite free access on a dead card.
 */
const PAST_DUE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

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
    .select("plan, status, current_period_end")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const plan = (data?.plan ?? "free") as Plan;
  const status = (data?.status ?? "active") as SubscriptionStatus;

  // Keep access through a bounded past_due grace period; lose it when canceled,
  // or once a past_due subscription has been overdue beyond the grace window.
  let isPro = plan !== "free" && status !== "canceled";
  if (isPro && status === "past_due" && data?.current_period_end) {
    const graceEnds = new Date(data.current_period_end).getTime() + PAST_DUE_GRACE_MS;
    if (Number.isFinite(graceEnds) && Date.now() > graceEnds) isPro = false;
  }
  return { plan, status, isPro };
});
