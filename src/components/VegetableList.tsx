import { VegetableCard } from "@/components/VegetableCard";
import type { Vegetable } from "@/types/vegetable";

type VegetableListProps = {
  vegetables: Vegetable[];
};

export function VegetableList({ vegetables }: VegetableListProps) {
  if (vegetables.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-foreground/70">
        Nothing in this list yet.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {vegetables.map((vegetable) => (
        <li key={vegetable.id}>
          <VegetableCard vegetable={vegetable} />
        </li>
      ))}
    </ul>
  );
}
