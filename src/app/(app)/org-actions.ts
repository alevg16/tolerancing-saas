"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/data/invitations";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Switch the active workspace (for users in more than one org). */
export async function switchOrgAction(formData: FormData) {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  if (!orgId) return;

  // Only switch to orgs the user actually belongs to.
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) return;

  (await cookies()).set("active_org", orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Accept an invite token, join the org, and switch to it. */
export async function acceptInviteAction(formData: FormData) {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  if (!token) return;

  const orgId = await acceptInvitation(token); // throws if invalid/expired/used

  (await cookies()).set("active_org", orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
