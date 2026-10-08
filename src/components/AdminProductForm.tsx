"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addProductAction } from "@/app/admin/actions";
import type { AdminFormState } from "@/lib/admin";

const fieldClassName =
  "mt-2 w-full rounded-xl border border-line bg-background px-3 py-2";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-leaf px-4 py-2 font-medium text-card disabled:cursor-not-allowed disabled:bg-line disabled:text-foreground/50"
    >
      {pending ? "Saving" : "Add product"}
    </button>
  );
}

export function AdminProductForm() {
  const [state, formAction] = useActionState<AdminFormState, FormData>(addProductAction, {});

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">
        Name
        <input name="name" required className={fieldClassName} />
      </label>
      <label className="block text-sm font-medium">
        Price in dollars
        <input
          name="price"
          inputMode="decimal"
          placeholder="3.50"
          required
          className={fieldClassName}
        />
      </label>
      <label className="block text-sm font-medium">
        Unit
        <input name="unit" placeholder="lb" required className={fieldClassName} />
      </label>
      <label className="flex items-end gap-2 pb-2 text-sm font-medium">
        <input name="available" type="checkbox" defaultChecked className="size-4" />
        Available to order
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Description
        <input name="description" required className={fieldClassName} />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
