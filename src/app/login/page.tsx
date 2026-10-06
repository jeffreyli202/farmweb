import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForm";
import { farm } from "@/data/farm";

export const metadata: Metadata = {
  title: `Log in | ${farm.name}`,
  description: "Log in to your farm account.",
};

export default function LoginPage() {
  return (
    <main>
      <section className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">Account</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">Log in</h1>
        <div className="mt-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
