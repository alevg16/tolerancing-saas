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

export async function changeRoleAction(formData: FormData) {
  const user = await requireUser();
  const { organization } = await getCurrentOrg();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!userId || !ROLES.includes(role)) return;
  if (userId === user.id) return; // don't let someone change their own role

  const supabase = await createClient();
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
  const safeRole: Role = ROLES.includes(role) ? role : "member";

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
