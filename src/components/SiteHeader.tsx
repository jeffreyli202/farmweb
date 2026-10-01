import Link from "next/link";
import { farm } from "@/data/farm";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 py-5">
        <Link href="/" className="font-serif text-2xl tracking-tight text-leaf">
          {farm.name}
        </Link>
        <nav>
          <Link href="/products" className="text-sm font-medium text-foreground">
            Products
          </Link>
        </nav>
      </div>
    </header>
  );
}
