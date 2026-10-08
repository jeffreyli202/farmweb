import type { Metadata } from "next";
import { CartSummary } from "@/components/CartSummary";
import { farm } from "@/data/farm";
import { listProducts } from "@/lib/orders";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = {
  title: `Cart | ${farm.name}`,
  description: "Vegetables you have added for this order.",
};

export default async function CartPage() {
  const products = listProducts();
  const user = await getCurrentUser();

  return (
    <main>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">
          Your order
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
          Cart
        </h1>
        <CartSummary products={products} signedIn={user !== null} />
      </section>
    </main>
  );
}
