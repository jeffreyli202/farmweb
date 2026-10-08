"use server";

import type { OrderState } from "@/lib/orders";
import { placeOrder } from "@/lib/orders";

export async function placeOrderAction(
  _previous: OrderState,
  formData: FormData,
): Promise<OrderState> {
  return placeOrder(formData);
}
