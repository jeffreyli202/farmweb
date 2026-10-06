"use client";

import Link from "next/link";
import { CartControls } from "@/components/CartControls";
import { useCart } from "@/components/CartProvider";
import { vegetables } from "@/data/vegetables";
import { formatPrice } from "@/lib/money";

export function CartSummary() {
  const { quantities } = useCart();
  const lines = vegetables.flatMap((vegetable) => {
    const quantity = quantities[vegetable.id] ?? 0;
    if (quantity === 0) {
      return [];
    }
    return [
      {
        vegetable,
        quantity,
        lineCents: vegetable.priceCents * quantity,
      },
    ];
  });
  const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);

  if (lines.length === 0) {
    return (
      <div className="mt-8 max-w-xl">
        <p className="text-lg text-foreground/80">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block font-medium text-leaf underline"
        >
          See products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li
            key={line.vegetable.id}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-serif text-2xl tracking-tight">
                {line.vegetable.name}
              </h2>
              <p className="mt-1 text-sm text-foreground/70">
                {formatPrice(line.vegetable.priceCents)} / {line.vegetable.unit}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="font-medium">{formatPrice(line.lineCents)}</p>
              <CartControls
                vegetableId={line.vegetable.id}
                available={line.vegetable.available}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-right font-serif text-2xl tracking-tight">
        Total {formatPrice(totalCents)}
      </p>
    </div>
  );
}
