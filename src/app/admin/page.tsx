import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setAvailabilityAction, updatePriceAction } from "@/app/admin/actions";
import { AdminProductForm } from "@/components/AdminProductForm";
import { farm } from "@/data/farm";
import { listAdminOrders, listAdminProducts } from "@/lib/admin";
import { formatPrice } from "@/lib/money";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = {
  title: `Admin | ${farm.name}`,
  description: "Add products and review orders.",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.isAdmin) {
    return (
      <main>
        <section className="mx-auto max-w-xl px-6 py-16">
          <h1 className="font-serif text-4xl tracking-tight">Admins only</h1>
          <p className="mt-4 text-foreground/80">
            {user.email} is not an admin email. Add it to the admin list, then sign in again.
          </p>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const products = listAdminProducts();
  const orders = listAdminOrders();

  return (
    <main>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">Admin</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">Farm database</h1>
        <p className="mt-4 max-w-2xl text-foreground/80">
          Signed in as {user.email}. New products and price changes are saved in the database
          the shop and checkout read.
        </p>

        {error ? (
          <p role="alert" className="mt-6 text-sm font-medium text-clay">
            {error}
          </p>
        ) : null}

        <h2 className="mt-12 font-serif text-3xl tracking-tight">Add a product</h2>
        <div className="mt-6">
          <AdminProductForm />
        </div>

        <h2 className="mt-14 font-serif text-3xl tracking-tight">Products</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {products.map((product) => (
            <li key={product.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-serif text-2xl tracking-tight">{product.name}</h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {product.available ? "For sale" : "Sold out"} · {product.unit}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form action={updatePriceAction} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    name="price"
                    defaultValue={(product.priceCents / 100).toFixed(2)}
                    aria-label={`Price for ${product.name}`}
                    className="w-24 rounded-xl border border-line bg-background px-3 py-2"
                  />
                  <button type="submit" className="text-sm font-medium text-leaf">
                    Save price
                  </button>
                </form>
                <form action={setAvailabilityAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="available" value={product.available ? "0" : "1"} />
                  <button type="submit" className="text-sm font-medium text-foreground">
                    {product.available ? "Mark sold out" : "Mark for sale"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-serif text-3xl tracking-tight">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-foreground/80">No orders yet.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {orders.map((order) => (
              <li key={order.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-2xl tracking-tight">Order {order.id}</h3>
                  <p className="font-medium">{formatPrice(order.totalCents)}</p>
                </div>
                <p className="mt-1 text-sm text-foreground/70">
                  {order.email} · {order.status === "paid" ? "Paid" : "Unpaid"} ·{" "}
                  {dateFormat.format(new Date(order.createdAt))}
                </p>
                <ul className="mt-4 space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.name}`}>
                      {item.quantity} × {item.name} · {formatPrice(item.lineCents)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-foreground/70">
          <Link href="/products" className="font-medium text-leaf underline">
            View the shop
          </Link>
        </p>
      </section>
    </main>
  );
}
