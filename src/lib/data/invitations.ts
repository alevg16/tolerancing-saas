import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface Invitation {
  id: string;
  email: string | null;
  role: Role;
  token: string;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
}

/** Pending (not-yet-accepted) invites for an org. */
export async function listInvitations(
  organizationId: string,
): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, token, accepted_at, created_at, expires_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export async function createInvitation(input: {
  organizationId: string;
  invitedBy: string;
  role: Role;
  email?: string | null;
}): Promise<Invitation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: input.organizationId,
      invited_by: input.invitedBy,
      role: input.role,
      email: input.email ?? null,
    })
    .select("id, email, role, token, accepted_at, created_at, expires_at")
    .single();
  if (error) throw error;
  return data as Invitation;
}

export async function revokeInvitation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}

export interface InvitationPreview {
  organization_name: string;
  role: Role;
  valid: boolean;
}

export async function previewInvitation(
  token: string,
): Promise<InvitationPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invitation_preview", {
    invite_token: token,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | InvitationPreview
    | undefined;
  return row ?? null;
}

/** Redeem a token; returns the organization_id joined. Throws if invalid. */
export async function acceptInvitation(token: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    invite_token: token,
  });
  if (error) throw error;
  return data as string;
}
