"use server";

import { redirect } from "next/navigation";
import type { AuthFormState, VerifyState } from "@/lib/auth-types";
import { login, logout, signup, verifyEmail } from "@/lib/users";

export async function signupAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return signup(formData);
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await login(formData);
  if (!result.error) {
    redirect("/");
  }
  return result;
}

export async function verifyEmailAction(
  _previous: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  return verifyEmail(formData);
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
