import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw request body to verify the signature.
export const dynamic = "force-dynamic";

function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}

// current_period_end lives on the subscription (older API) or its items (newer).
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const ts = top ?? item?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return new NextResponse("Missing webhook signature", { status: 400 });
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    return new NextResponse(`Webhook error: ${msg}`, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId =
          session.client_reference_id ?? session.metadata?.organization_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (orgId && customerId) {
          const sub = subId ? await stripe.subscriptions.retrieve(subId) : null;
          await admin
            .from("subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subId ?? null,
              plan: "pro",
              status: sub ? mapStatus(sub.status) : "active",
              current_period_end: sub ? periodEndISO(sub) : null,
            })
            .eq("organization_id", orgId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const status = mapStatus(sub.status);
        await admin
          .from("subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            plan: status === "canceled" ? "free" : "pro",
            status,
            current_period_end: periodEndISO(sub),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sync failed";
    return new NextResponse(`Webhook handler error: ${msg}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
