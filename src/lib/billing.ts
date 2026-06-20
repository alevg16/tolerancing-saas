import "server-only";

import { getStripe } from "@/lib/stripe";

export interface PriceInfo {
  interval: "month" | "year";
  amount: number; // major units, e.g. 29
  currency: string; // e.g. "CHF"
}

async function loadPrice(id: string | undefined): Promise<PriceInfo | null> {
  if (!id) return null;
  try {
    const price = await getStripe().prices.retrieve(id);
    const interval = price.recurring?.interval === "year" ? "year" : "month";
    return {
      interval,
      amount: (price.unit_amount ?? 0) / 100,
      currency: (price.currency ?? "chf").toUpperCase(),
    };
  } catch {
    return null;
  }
}

/** Live monthly + annual Pro prices from Stripe (so the UI never drifts from
 *  what's actually charged). Returns nulls when Stripe/prices aren't configured. */
export async function getProPrices(): Promise<{
  month: PriceInfo | null;
  year: PriceInfo | null;
}> {
  if (!process.env.STRIPE_SECRET_KEY) return { month: null, year: null };
  const [month, year] = await Promise.all([
    loadPrice(process.env.STRIPE_PRICE_ID),
    loadPrice(process.env.STRIPE_PRICE_ID_YEARLY),
  ]);
  return { month, year };
}
