import { headers } from "next/headers";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/users";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  unit: string;
  available: boolean;
};

export type OrderState = {
  error?: string;
  checkoutUrl?: string;
};

export type StoredOrder = {
  id: number;
  totalCents: number;
  status: "unpaid" | "paid";
  createdAt: string;
};

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  unit: string;
  available: number;
};

export function listProducts(): CatalogProduct[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, description, price_cents, unit, available
       FROM products
       ORDER BY position`,
    )
    .all() as ProductRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    unit: row.unit,
    available: row.available === 1,
  }));
}

export async function placeOrder(formData: FormData): Promise<OrderState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Log in before submitting an order." };
  }

  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const prices = formData.getAll("priceCents").map(String);
  if (
    productIds.length === 0 ||
    productIds.length !== quantities.length ||
    productIds.length !== prices.length
  ) {
    return { error: "The cart could not be read. Refresh and try again." };
  }
  if (new Set(productIds).size !== productIds.length) {
    return { error: "The cart has a duplicate product." };
  }

  const db = getDb();
  const lines: Array<{
    productId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    lineCents: number;
  }> = [];

  for (let index = 0; index < productIds.length; index += 1) {
    const productId = productIds[index];
    const quantity = Number(quantities[index]);
    const priceCents = Number(prices[index]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { error: "Each item needs a quantity from 1 to 99." };
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return { error: "A price in this order is not valid." };
    }

    const product = db
      .prepare(
        "SELECT id, name, price_cents, unit, available FROM products WHERE id = ?",
      )
      .get(productId) as ProductRow | undefined;
    if (!product) {
      return { error: "A product in this order is not in the database." };
    }
    if (product.price_cents !== priceCents) {
      return {
        error: `The price for ${product.name} does not match the database. Review the cart and submit again.`,
      };
    }
    if (product.available !== 1) {
      return { error: `${product.name} is not available to order.` };
    }

    lines.push({
      productId,
      name: product.name,
      unitPriceCents: product.price_cents,
      quantity,
      lineCents: product.price_cents * quantity,
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: "Card payments are not configured yet." };
  }

  const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  db.exec("BEGIN");
  let orderId = 0;
  try {
    const created = db
      .prepare(
        "INSERT INTO orders (user_id, total_cents, status, created_at) VALUES (?, ?, 'unpaid', ?)",
      )
      .run(user.id, totalCents, new Date().toISOString());
    orderId = Number(created.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO order_items
         (order_id, product_id, name, unit_price_cents, quantity, line_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const line of lines) {
      insertItem.run(
        orderId,
        line.productId,
        line.name,
        line.unitPriceCents,
        line.quantity,
        line.lineCents,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const origin = await appOrigin();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "usd",
          unit_amount: line.unitPriceCents,
          product_data: { name: line.name },
        },
      })),
      metadata: { orderId: String(orderId) },
      success_url: `${origin}/orders/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    db.prepare("UPDATE orders SET stripe_session_id = ? WHERE id = ?").run(session.id, orderId);
    return { checkoutUrl: session.url };
  } catch (error) {
    db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
    console.error(error);
    return { error: "Payment could not be started. Nothing was charged." };
  }
}

export function applyCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" || session.amount_total === null) {
    return "unpaid" as const;
  }
  const orderId = Number(session.metadata?.orderId);
  if (!Number.isInteger(orderId)) {
    return "mismatch" as const;
  }
  return markOrderPaid(orderId, session.id, session.amount_total);
}

export async function recordPaidCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return "unconfigured" as const;
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return applyCheckoutSession(session);
}

export function markOrderPaid(orderId: number, sessionId: string, amountTotal: number) {
  const db = getDb();
  const order = db
    .prepare("SELECT id, total_cents, status, stripe_session_id FROM orders WHERE id = ?")
    .get(orderId) as
    | { id: number; total_cents: number; status: string; stripe_session_id: string | null }
    | undefined;
  if (!order) {
    return "missing" as const;
  }
  if (order.stripe_session_id && order.stripe_session_id !== sessionId) {
    return "mismatch" as const;
  }
  if (order.total_cents !== amountTotal) {
    return "mismatch" as const;
  }
  if (order.status === "paid") {
    return "paid" as const;
  }
  db.prepare(
    "UPDATE orders SET status = 'paid', stripe_session_id = ? WHERE id = ? AND status = 'unpaid'",
  ).run(sessionId, orderId);
  return "paid" as const;
}

export async function getOwnOrder(orderId: number): Promise<StoredOrder | undefined> {
  const user = await getCurrentUser();
  if (!user) {
    return undefined;
  }
  const row = getDb()
    .prepare(
      "SELECT id, total_cents, status, created_at FROM orders WHERE id = ? AND user_id = ?",
    )
    .get(orderId, user.id) as
    | { id: number; total_cents: number; status: string; created_at: string }
    | undefined;
  if (!row || (row.status !== "paid" && row.status !== "unpaid")) {
    return undefined;
  }
  return {
    id: row.id,
    totalCents: row.total_cents,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function appOrigin() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
