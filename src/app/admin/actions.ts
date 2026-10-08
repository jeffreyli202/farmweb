"use server";

import { redirect } from "next/navigation";
import type { AdminFormState } from "@/lib/admin";
import { addProduct, setProductAvailability, updateProductPrice } from "@/lib/admin";

export async function addProductAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const result = await addProduct(formData);
  if (result.error) {
    return result;
  }
  redirect("/admin");
}

export async function updatePriceAction(formData: FormData) {
  const result = await updateProductPrice(formData);
  if (result.error) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin");
}

export async function setAvailabilityAction(formData: FormData) {
  const result = await setProductAvailability(formData);
  if (result.error) {
    redirect(`/admin?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin");
}
