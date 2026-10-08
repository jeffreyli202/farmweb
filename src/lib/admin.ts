import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { CatalogProduct } from "@/lib/orders";
import { listProducts } from "@/lib/orders";
import { getCurrentUser } from "@/lib/users";
import type { CurrentUser } from "@/lib/auth-types";

export type AdminFormState = {
  error?: string;
};

export type AdminOrderItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineCents: number;
};

export type AdminOrder = {
  id: number;
  email: string;
  totalCents: number;
  status: string;
  createdAt: string;
  items: AdminOrderItem[];
};

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export async function requireAdmin(): Promise<CurrentUser | undefined> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return undefined;
  }
  return user;
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const orders = await dbAll<{
    id: number;
    total_cents: number;
    status: string;
    created_at: string;
    email: string;
  }>(
    `SELECT orders.id, orders.total_cents, orders.status, orders.created_at, users.email
     FROM orders
     JOIN users ON users.id = orders.user_id
     ORDER BY orders.id DESC`,
  );
  const items = await dbAll<{
    order_id: number;
    name: string;
    quantity: number;
    unit_price_cents: number;
    line_cents: number;
  }>(
    `SELECT order_id, name, quantity, unit_price_cents, line_cents
     FROM order_items
     ORDER BY id`,
  );

  return orders.map((order) => ({
    id: order.id,
    email: order.email,
    totalCents: order.total_cents,
    status: order.status,
    createdAt: order.created_at,
    items: items
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineCents: item.line_cents,
      })),
  }));
}

export async function listAdminProducts(): Promise<CatalogProduct[]> {
  return listProducts();
}

export async function addProduct(formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "You do not have access to admin." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const priceCents = dollarsToCents(String(formData.get("price") ?? ""));
  const available = formData.get("available") === "on";

  if (name.length < 2 || name.length > 80) {
    return { error: "Enter a product name between 2 and 80 characters." };
  }
  if (description.length < 2 || description.length > 280) {
    return { error: "Enter a short description." };
  }
  if (unit.length < 1 || unit.length > 20) {
    return { error: "Enter a unit such as lb, bunch, or pint." };
  }
  if (priceCents === undefined) {
    return { error: "Enter a price in dollars, such as 3.50." };
  }

  const id = slugify(name);
  if (!id) {
    return { error: "Use a name that contains letters or numbers." };
  }

  const existing = await dbGet<{ id: string }>("SELECT id FROM products WHERE id = ?", [id]);
  if (existing) {
    return { error: "A product with that name already exists." };
  }

  const positionRow = await dbGet<{ position: number }>(
    "SELECT COALESCE(MAX(position), -1) AS position FROM products",
  );
  await dbRun(
    `INSERT INTO products
       (id, name, description, price_cents, unit, available, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, priceCents, unit, available ? 1 : 0, (positionRow?.position ?? -1) + 1],
  );

  return {};
}

export async function updateProductPrice(formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "You do not have access to admin." };
  }

  const productId = String(formData.get("productId") ?? "");
  const priceCents = dollarsToCents(String(formData.get("price") ?? ""));
  if (priceCents === undefined) {
    return { error: "Enter a price in dollars, such as 3.50." };
  }

  const result = await dbRun("UPDATE products SET price_cents = ? WHERE id = ?", [
    priceCents,
    productId,
  ]);
  if (result.changes === 0) {
    return { error: "That product is not in the database." };
  }
  return {};
}

export async function setProductAvailability(formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "You do not have access to admin." };
  }

  const productId = String(formData.get("productId") ?? "");
  const available = String(formData.get("available") ?? "");
  if (available !== "0" && available !== "1") {
    return { error: "Availability could not be read." };
  }

  const result = await dbRun("UPDATE products SET available = ? WHERE id = ?", [
    Number(available),
    productId,
  ]);
  if (result.changes === 0) {
    return { error: "That product is not in the database." };
  }
  return {};
}

function dollarsToCents(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!PRICE_PATTERN.test(trimmed)) {
    return undefined;
  }
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isInteger(cents) || cents < 0 || cents > 100_000) {
    return undefined;
  }
  return cents;
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
