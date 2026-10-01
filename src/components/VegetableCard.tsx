import { formatPrice } from "@/lib/money";
import type { Vegetable } from "@/types/vegetable";

type VegetableCardProps = {
  vegetable: Vegetable;
};

export function VegetableCard({ vegetable }: VegetableCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-2xl tracking-tight">{vegetable.name}</h3>
        <p className="shrink-0 text-right">
          <span className="block font-medium">
            {formatPrice(vegetable.priceCents)}
          </span>
          <span className="text-sm text-foreground/60">/ {vegetable.unit}</span>
        </p>
      </div>
      <p className="mt-3 flex-1 text-foreground/80">{vegetable.description}</p>
      <div className="mt-5 flex justify-end text-sm">
        <button
          type="button"
          disabled={!vegetable.available}
          className={
            vegetable.available
              ? "rounded-full bg-leaf px-4 py-2 font-medium text-card"
              : "cursor-not-allowed rounded-full bg-line px-4 py-2 font-medium text-foreground/50"
          }
        >
          {vegetable.available ? "Add to cart" : "Sold out"}
        </button>
      </div>
    </article>
  );
}
