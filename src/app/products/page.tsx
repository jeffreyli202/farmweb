import type { Metadata } from "next";
import { VegetableList } from "@/components/VegetableList";
import { farm } from "@/data/farm";
import { vegetables } from "@/data/vegetables";

export const metadata: Metadata = {
  title: `Products | ${farm.name}`,
  description: "Vegetables available to order online.",
};

export default function ProductsPage() {
  const inStock = vegetables.filter((vegetable) => vegetable.available);
  const soldOut = vegetables.filter((vegetable) => !vegetable.available);

  return (
    <main>
      <section className="bg-leaf text-card">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-sm tracking-[0.18em] uppercase text-card/70">
            Online orders
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            {farm.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-card/85">
            {inStock.length} crops are ready to ship.{" "}
            {soldOut.length === 0
              ? "Everything on the list is available."
              : `${soldOut.length} ${soldOut.length === 1 ? "crop is" : "crops are"} waiting on the next planting.`}
          </p>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="font-serif text-3xl tracking-tight">Available to order</h2>
        <p className="mt-2 mb-8 max-w-xl text-foreground/70">
          Packed at the farm and shipped to you.
        </p>
        <VegetableList vegetables={inStock} />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-serif text-3xl tracking-tight">Sold out</h2>
        <p className="mt-2 mb-8 max-w-xl text-foreground/70">
          Still on the farm list, just not ready to sell.
        </p>
        <VegetableList vegetables={soldOut} />
      </section>
    </main>
  );
}
