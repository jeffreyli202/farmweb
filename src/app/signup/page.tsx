import type { Metadata } from "next";
import { SignupForm } from "@/components/AuthForm";
import { farm } from "@/data/farm";

export const metadata: Metadata = {
  title: `Sign up | ${farm.name}`,
  description: "Create an account to order from the farm.",
};

export default function SignupPage() {
  return (
    <main>
      <section className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">Account</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">Sign up</h1>
        <div className="mt-8">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}
