import { getDb } from "@/lib/db";
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
  orderId?: number;
  totalCents?: number;
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

  const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  db.exec("BEGIN");
  try {
    const created = db
      .prepare(
        "INSERT INTO orders (user_id, total_cents, created_at) VALUES (?, ?, ?)",
      )
      .run(user.id, totalCents, new Date().toISOString());
    const orderId = Number(created.lastInsertRowid);
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
    return { orderId, totalCents };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
