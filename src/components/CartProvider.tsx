"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "li-farm-cart";

type Quantities = Record<string, number>;

type CartContextValue = {
  quantities: Quantities;
  itemCount: number;
  addOne: (id: string) => void;
  removeOne: (id: string) => void;
};

const EMPTY: Quantities = {};
const listeners = new Set<() => void>();

let cached = "";

if (typeof window !== "undefined") {
  cached = readRaw();
}

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function parse(raw: string): Quantities {
  if (!raw) {
    return EMPTY;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return EMPTY;
    }

    const quantities: Quantities = {};
    for (const [id, quantity] of Object.entries(parsed)) {
      if (
        typeof quantity === "number" &&
        Number.isInteger(quantity) &&
        quantity > 0
      ) {
        quantities[id] = quantity;
      }
    }

    return Object.keys(quantities).length === 0 ? EMPTY : quantities;
  } catch {
    return EMPTY;
  }
}

function write(next: Quantities) {
  cached = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, cached);
  } catch {
    // The cart still updates on this page if storage is blocked.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cached;
}

function getServerSnapshot() {
  return "";
}

function addOne(id: string) {
  const current = parse(cached);
  write({
    ...current,
    [id]: (current[id] ?? 0) + 1,
  });
}

function removeOne(id: string) {
  const current = parse(cached);
  const nextQuantity = (current[id] ?? 0) - 1;
  if (nextQuantity <= 0) {
    const next = { ...current };
    delete next[id];
    write(next);
    return;
  }
  write({ ...current, [id]: nextQuantity });
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const quantities = useMemo(() => parse(raw), [raw]);

  const value = useMemo<CartContextValue>(() => {
    return {
      quantities,
      itemCount: Object.values(quantities).reduce(
        (sum, quantity) => sum + quantity,
        0,
      ),
      addOne,
      removeOne,
    };
  }, [quantities]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return cart;
}
