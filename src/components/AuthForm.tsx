"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, signupAction } from "@/app/auth/actions";
import type { AuthFormState } from "@/lib/auth-types";

const fieldClassName =
  "mt-2 w-full rounded-xl border border-line bg-background px-3 py-2";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-leaf px-4 py-2 font-medium text-card disabled:cursor-not-allowed disabled:bg-line disabled:text-foreground/50"
    >
      {pending ? "Please wait" : label}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, {});

  if (state.verificationUrl) {
    return (
      <div className="space-y-4 text-foreground/80">
        <p>Account created. Verify your email before logging in.</p>
        <p>
          No email service is connected in development, so the verification
          link is shown here. It expires in 24 hours.
        </p>
        <Link href={state.verificationUrl} className="font-medium text-leaf underline">
          Verify this account
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClassName}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClassName}
        />
      </label>
      <label className="block text-sm font-medium">
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClassName}
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label="Create account" />
      <p className="text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-leaf underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClassName}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClassName}
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      {state.verificationUrl ? (
        <Link href={state.verificationUrl} className="block text-sm font-medium text-leaf underline">
          Open verification link
        </Link>
      ) : null}
      <SubmitButton label="Log in" />
      <p className="text-sm text-foreground/70">
        Need an account?{" "}
        <Link href="/signup" className="font-medium text-leaf underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
