import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendOrderReceipt } from "@/lib/mail";
import { applyCheckoutSession } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const result = applyCheckoutSession(event.data.object);
    if (result === "mismatch") {
      return NextResponse.json({ error: "Payment does not match the order." }, { status: 400 });
    }
    if (result === "paid") {
      const orderId = Number(event.data.object.metadata?.orderId);
      if (Number.isInteger(orderId)) {
        await sendOrderReceipt(orderId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
