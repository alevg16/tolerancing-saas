import "server-only";

import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily construct the Stripe client so a missing key never breaks the build. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
