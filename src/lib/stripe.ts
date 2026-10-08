import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return undefined;
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}
