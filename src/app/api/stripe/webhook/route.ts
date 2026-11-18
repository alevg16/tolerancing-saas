import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/types";

// Stripe needs the raw request body to verify the signature.
export const dynamic = "force-dynamic";

function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}

/**
 * Map a Stripe price id to our plan tier. Only Pro is sold today (monthly +
 * yearly); Team/Business ids are read from env when they exist so adding them
 * later needs no code change. Unknown paid prices fall back to "pro".
 */
function planForPrice(priceId: string | undefined): Plan {
  if (!priceId) return "pro";
  const ids = (names: (string | undefined)[]) =>
    names.filter((v): v is string => !!v);
  const team = ids([process.env.STRIPE_PRICE_TEAM, process.env.STRIPE_PRICE_TEAM_YEARLY]);
  const business = ids([process.env.STRIPE_PRICE_BUSINESS, process.env.STRIPE_PRICE_BUSINESS_YEARLY]);
  if (team.includes(priceId)) return "team";
  if (business.includes(priceId)) return "business";
  return "pro";
}

// current_period_end lives on the subscription (older API) or its items (newer).
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const ts = top ?? item?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function firstItem(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  return {
    priceId: item?.price?.id,
    seats: typeof item?.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
  };
}

type Admin = ReturnType<typeof createAdminClient>;

/** Apply a subscription's state to the org's row, keyed by org id when the
 *  subscription carries it (set at checkout) and by customer id otherwise. */
async function syncSubscription(admin: Admin, stripe: Stripe, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const orgId = sub.metadata?.organization_id;
  const status = mapStatus(sub.status);
  const { priceId, seats } = firstItem(sub);

  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan: status === "canceled" ? ("free" as Plan) : planForPrice(priceId),
    status,
    seats,
    current_period_end: periodEndISO(sub),
  };

  const query = admin.from("subscriptions").update(patch);
  // Prefer the org id (reliable even before checkout.session.completed lands);
  // fall back to the customer id for events that predate our metadata.
  const { error } = orgId
    ? await query.eq("organization_id", orgId)
    : await query.eq("stripe_customer_id", customerId);
  if (error) throw error;
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

  // Idempotency: record the event id first. A duplicate (23505) means we've
  // already processed this delivery — ack and stop.
  const { error: ledgerError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (ledgerError) {
    if (ledgerError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Ledger unavailable: fall through and process anyway (handlers set
    // absolute state, so a reprocess converges rather than corrupts).
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id ?? session.metadata?.organization_id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        // Pull the full subscription so we sync plan/seats/period from one place.
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          // Ensure the org id is present for syncSubscription's keying.
          if (orgId && !sub.metadata?.organization_id) {
            sub.metadata = { ...sub.metadata, organization_id: orgId };
          }
          await syncSubscription(admin, stripe, sub);
        } else if (orgId) {
          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer?.id;
          await admin
            .from("subscriptions")
            .update({ stripe_customer_id: customerId ?? null, plan: "pro", status: "active" })
            .eq("organization_id", orgId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(admin, stripe, event.data.object as Stripe.Subscription);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Roll back the ledger entry so Stripe's retry can reprocess this event.
    await admin.from("stripe_events").delete().eq("id", event.id);
    const msg = err instanceof Error ? err.message : "sync failed";
    return new NextResponse(`Webhook handler error: ${msg}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
