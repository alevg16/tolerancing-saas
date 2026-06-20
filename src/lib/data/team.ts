import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface TeamMember {
  membership_id: string;
  role: Role;
  joined_at: string;
  user: { id: string; name: string | null; email: string | null };
}

type RawUser = { id: string; name: string | null; email: string | null };
type RawMembership = {
  id: string;
  role: Role;
  created_at: string;
  user: RawUser | RawUser[] | null;
};

/** All members of an org, with their profile + role. RLS scopes this to orgs
 *  the caller belongs to. */
export async function getMembers(
  organizationId: string,
): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, role, created_at, user:users(id, name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawMembership[];
  return rows.map((m) => {
    const user = Array.isArray(m.user) ? m.user[0] : m.user;
    return {
      membership_id: m.id,
      role: m.role,
      joined_at: m.created_at,
      user: user ?? { id: "", name: null, email: null },
    };
  });
}
