"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className="text-sm font-medium text-foreground">
      Cart{itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
