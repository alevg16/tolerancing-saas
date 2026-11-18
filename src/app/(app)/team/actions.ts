"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getCurrentOrg } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan } from "@/lib/auth/plan";
import { createInvitation, revokeInvitation } from "@/lib/data/invitations";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["owner", "admin", "member"];

/**
 * Workspace + roster management. RLS enforces that only owners/admins can
 * mutate the org and memberships; these actions add the app-level guards
 * (e.g. you can't lock yourself out by demoting/removing yourself).
 */

export async function renameWorkspaceAction(formData: FormData) {
  await requireUser();
  const { organization } = await getCurrentOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", organization.id);
  if (error) throw error;

  revalidatePath("/team");
  revalidatePath("/", "layout"); // refresh the workspace name in the nav
}

/** True if the org would be left with no owners after demoting/removing userId. */
async function wouldStrandOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { data: owners } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "owner");
  const ids = (owners ?? []).map((o) => o.user_id);
  return ids.length <= 1 && ids.includes(userId);
}

export async function changeRoleAction(formData: FormData) {
  const user = await requireUser();
  const { organization, membership } = await getCurrentOrg();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!userId || !ROLES.includes(role)) return;
  if (userId === user.id) return; // don't let someone change their own role
  // Only an owner may grant ownership (DB trigger also enforces this).
  if (role === "owner" && membership.role !== "owner") return;

  const supabase = await createClient();
  // Don't demote the last owner and strand the organization.
  if (role !== "owner" && (await wouldStrandOrg(supabase, organization.id, userId))) return;

  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("organization_id", organization.id)
    .eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/team");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  const { organization } = await getCurrentOrg();
  const userId = String(formData.get("userId") ?? "");

  if (!userId || userId === user.id) return; // can't remove yourself here

  const supabase = await createClient();
  // Don't remove the last owner and strand the organization.
  if (await wouldStrandOrg(supabase, organization.id, userId)) return;

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("organization_id", organization.id)
    .eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/team");
}

export async function createInviteAction(formData: FormData) {
  const user = await requireUser();
  const { organization, membership } = await getCurrentOrg();
  if (membership.role !== "owner" && membership.role !== "admin") return;

  // Inviting teammates is a Pro feature.
  const { isPro } = await getCurrentPlan();
  if (!isPro) return;

  const role = String(formData.get("role") ?? "member") as Role;
  const email = String(formData.get("email") ?? "").trim() || null;
  let safeRole: Role = ROLES.includes(role) ? role : "member";
  // Only an owner may invite another owner (DB policy also enforces this).
  if (safeRole === "owner" && membership.role !== "owner") safeRole = "admin";

  await createInvitation({
    organizationId: organization.id,
    invitedBy: user.id,
    role: safeRole,
    email,
  });
  revalidatePath("/team");
}

export async function revokeInviteAction(formData: FormData) {
  await requireUser();
  const { membership } = await getCurrentOrg();
  if (membership.role !== "owner" && membership.role !== "admin") return;

  const id = String(formData.get("inviteId") ?? "");
  if (!id) return;
  await revokeInvitation(id);
  revalidatePath("/team");
}
