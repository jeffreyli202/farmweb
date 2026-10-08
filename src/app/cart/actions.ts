"use server";

import { redirect } from "next/navigation";
import type { OrderState } from "@/lib/orders";
import { placeOrder } from "@/lib/orders";

export async function placeOrderAction(
  _previous: OrderState,
  formData: FormData,
): Promise<OrderState> {
  const result = await placeOrder(formData);
  if (result.checkoutUrl) {
    redirect(result.checkoutUrl);
  }
  return result;
}
