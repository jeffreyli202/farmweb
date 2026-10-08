import { farm } from "@/data/farm";
import { getDb } from "@/lib/db";
import { formatPrice } from "@/lib/money";

export type ReceiptResult = "sent" | "already" | "unconfigured" | "failed" | "skipped";

type PaidOrder = {
  id: number;
  total_cents: number;
  status: string;
  receipt_sent_at: string | null;
  email: string;
};

export async function sendOrderReceipt(orderId: number): Promise<ReceiptResult> {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT orders.id, orders.total_cents, orders.status, orders.receipt_sent_at, users.email
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.id = ?`,
    )
    .get(orderId) as PaidOrder | undefined;
  if (!order || order.status !== "paid") {
    return "skipped";
  }
  if (order.receipt_sent_at) {
    return "already";
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set, so the receipt email was not sent.");
    return "unconfigured";
  }

  const claimed = db
    .prepare(
      "UPDATE orders SET receipt_sent_at = ? WHERE id = ? AND receipt_sent_at IS NULL",
    )
    .run(new Date().toISOString(), orderId);
  if (claimed.changes !== 1) {
    return "already";
  }

  const items = db
    .prepare(
      "SELECT name, quantity, line_cents FROM order_items WHERE order_id = ? ORDER BY id",
    )
    .all(orderId) as Array<{ name: string; quantity: number; line_cents: number }>;
  const itemLines = items
    .map((item) => `${item.name} × ${item.quantity} — ${formatPrice(item.line_cents)}`)
    .join("\n");
  const text = [
    `Thank you for your order from ${farm.name}.`,
    "",
    `Order ${order.id}`,
    itemLines,
    "",
    `Total ${formatPrice(order.total_cents)}`,
    "This payment is confirmed.",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ORDER_FROM_EMAIL ?? `${farm.name} <onboarding@resend.dev>`,
        to: [order.email],
        subject: `Thank you for your ${farm.name} order`,
        text,
      }),
    });
    if (!response.ok) {
      console.error(await response.text());
      db.prepare("UPDATE orders SET receipt_sent_at = NULL WHERE id = ?").run(orderId);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error(error);
    db.prepare("UPDATE orders SET receipt_sent_at = NULL WHERE id = ?").run(orderId);
    return "failed";
  }
}
