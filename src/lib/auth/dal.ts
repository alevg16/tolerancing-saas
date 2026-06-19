import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization } from "@/lib/types";

/**
 * Data Access Layer — the single place that resolves "who is this request".
 * `cache()` memoizes per render pass so repeated calls don't re-hit the auth
 * server. Authorization is still enforced at the database via RLS.
 */

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export interface CurrentOrg {
  organization: Organization;
  membership: Membership;
}

/**
 * The active organization for the signed-in user. For now a user is an org of
 * one; if they belong to several, the earliest membership wins (org switching
 * is a later feature).
 */
export const getCurrentOrg = cache(async (): Promise<CurrentOrg> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.organization) {
    // The signup trigger provisions this; if it's missing the account is
    // half-created. Send them back through auth rather than crashing.
    redirect("/login");
  }

  const { organization, ...membership } = data as Membership & {
    organization: Organization;
  };
  return { organization, membership };
});
