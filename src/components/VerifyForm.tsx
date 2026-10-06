"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyEmailAction } from "@/app/auth/actions";
import type { VerifyState } from "@/lib/auth-types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-leaf px-4 py-2 font-medium text-card disabled:cursor-not-allowed disabled:bg-line disabled:text-foreground/50"
    >
      {pending ? "Please wait" : "Verify email"}
    </button>
  );
}

export function VerifyForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<VerifyState, FormData>(verifyEmailAction, {});

  if (state.message) {
    return (
      <div className="space-y-4 text-foreground/80">
        <p>{state.message}</p>
        <Link href="/login" className="font-medium text-leaf underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <p className="text-foreground/80">
        Confirm this address to activate the account. The link itself does not
        log you in.
      </p>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
