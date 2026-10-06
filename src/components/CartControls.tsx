"use client";

import { useCart } from "@/components/CartProvider";

type CartControlsProps = {
  vegetableId: string;
  available: boolean;
};

export function CartControls({ vegetableId, available }: CartControlsProps) {
  const { quantities, addOne, removeOne } = useCart();
  const quantity = quantities[vegetableId] ?? 0;

  if (quantity === 0) {
    return (
      <button
        type="button"
        disabled={!available}
        onClick={() => addOne(vegetableId)}
        className={
          available
            ? "rounded-full bg-leaf px-4 py-2 font-medium text-card"
            : "cursor-not-allowed rounded-full bg-line px-4 py-2 font-medium text-foreground/50"
        }
      >
        {available ? "Add to cart" : "Sold out"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => removeOne(vegetableId)}
        className="rounded-full border border-line bg-card px-3 py-2 font-medium text-foreground"
      >
        -1
      </button>
      <span className="min-w-24 text-center font-medium text-leaf">
        In cart · {quantity}
      </span>
      <button
        type="button"
        onClick={() => addOne(vegetableId)}
        disabled={!available}
        className="rounded-full bg-leaf px-3 py-2 font-medium text-card disabled:cursor-not-allowed disabled:bg-line disabled:text-foreground/50"
      >
        +1
      </button>
    </div>
  );
}
