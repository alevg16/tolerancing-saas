import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization, Role } from "@/lib/types";

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
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as (Membership & { organization: Organization })[];
  if (rows.length === 0) {
    // The signup trigger provisions this; if it's missing the account is
    // half-created. Send them back through auth rather than crashing.
    redirect("/login");
  }

  // Honour the active-workspace cookie; otherwise the earliest membership.
  const activeId = (await cookies()).get("active_org")?.value;
  const chosen = rows.find((r) => r.organization_id === activeId) ?? rows[0];

  const { organization, ...membership } = chosen;
  return { organization, membership };
});

export interface OrgSummary {
  id: string;
  name: string;
  role: Role;
}

/** Every org the signed-in user belongs to — for the workspace switcher. */
export const getMyOrgs = cache(async (): Promise<OrgSummary[]> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  type Row = {
    role: Role;
    organization:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const o = Array.isArray(r.organization) ? r.organization[0] : r.organization;
      return { id: o?.id ?? "", name: o?.name ?? "Workspace", role: r.role };
    })
    .filter((o) => o.id);
});
