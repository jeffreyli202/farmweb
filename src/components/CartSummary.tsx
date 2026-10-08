"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrderAction } from "@/app/cart/actions";
import { CartControls } from "@/components/CartControls";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/money";
import type { CatalogProduct, OrderState } from "@/lib/orders";

type CartSummaryProps = {
  products: CatalogProduct[];
  signedIn: boolean;
};

function SubmitOrderButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-leaf px-4 py-2 font-medium text-card disabled:cursor-not-allowed disabled:bg-line disabled:text-foreground/50"
    >
      {pending ? "Checking prices" : "Pay with card"}
    </button>
  );
}

export function CartSummary({ products, signedIn }: CartSummaryProps) {
  const { quantities } = useCart();
  const [state, formAction] = useActionState<OrderState, FormData>(placeOrderAction, {});
  const lines = products.flatMap((product) => {
    const quantity = quantities[product.id] ?? 0;
    if (quantity === 0) {
      return [];
    }
    return [
      {
        product,
        quantity,
        lineCents: product.priceCents * quantity,
      },
    ];
  });
  const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);

  if (lines.length === 0) {
    return (
      <div className="mt-8 max-w-xl">
        <p className="text-lg text-foreground/80">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block font-medium text-leaf underline">
          See products
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li
            key={line.product.id}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-serif text-2xl tracking-tight">{line.product.name}</h2>
              <p className="mt-1 text-sm text-foreground/70">
                {formatPrice(line.product.priceCents)} / {line.product.unit}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="font-medium">{formatPrice(line.lineCents)}</p>
              <CartControls
                vegetableId={line.product.id}
                available={line.product.available}
              />
            </div>
            <input type="hidden" name="productId" value={line.product.id} />
            <input type="hidden" name="quantity" value={line.quantity} />
            <input type="hidden" name="priceCents" value={line.product.priceCents} />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-right font-serif text-2xl tracking-tight">
        Total {formatPrice(totalCents)}
      </p>
      <div className="mt-6 flex flex-col items-end gap-3">
        {state.error ? (
          <p role="alert" className="text-sm font-medium text-clay">
            {state.error}
          </p>
        ) : (
          <p className="max-w-md text-right text-sm text-foreground/70">
            Each price is checked against the database. Stripe then charges the card. The order stays unpaid until Stripe confirms it.
          </p>
        )}
        {signedIn ? (
          <SubmitOrderButton />
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-leaf px-4 py-2 font-medium text-card"
          >
            Log in to submit
          </Link>
        )}
      </div>
    </form>
  );
}
