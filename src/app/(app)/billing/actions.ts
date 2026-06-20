"use server";

import { redirect } from "next/navigation";
import { requireUser, getCurrentOrg } from "@/lib/auth/dal";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Start a Stripe Checkout for the Pro plan and redirect to it. */
export async function startCheckoutAction(formData?: FormData) {
  const user = await requireUser();
  const { organization, membership } = await getCurrentOrg();
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/billing");
  }

  const interval = String(formData?.get("interval") ?? "month");
  const priceId =
    interval === "year"
      ? process.env.STRIPE_PRICE_ID_YEARLY || process.env.STRIPE_PRICE_ID
      : process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set");

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: organization.id,
    customer: sub?.stripe_customer_id || undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email ?? undefined,
    success_url: `${SITE}/billing?upgraded=1`,
    cancel_url: `${SITE}/billing`,
    allow_promotion_codes: true,
    metadata: { organization_id: organization.id },
    subscription_data: { metadata: { organization_id: organization.id } },
  });

  if (!session.url) throw new Error("Could not start checkout");
  redirect(session.url);
}

/** Open the Stripe Customer Portal to manage/cancel the subscription. */
export async function openPortalAction() {
  await requireUser();
  const { organization } = await getCurrentOrg();

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) redirect("/billing");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${SITE}/billing`,
  });
  redirect(session.url);
}
