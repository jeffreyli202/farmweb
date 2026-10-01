import { farm } from "@/data/farm";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-foreground/70">
        {farm.name}. Online orders only. Prices are for this week.
      </div>
    </footer>
  );
}
