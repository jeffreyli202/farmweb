import type { Metadata } from "next";
import { VerifyForm } from "@/components/VerifyForm";
import { farm } from "@/data/farm";

export const metadata: Metadata = {
  title: `Verify email | ${farm.name}`,
  description: "Confirm your email address.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main>
      <section className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">Account</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">Verify email</h1>
        <div className="mt-8">
          {token ? (
            <VerifyForm token={token} />
          ) : (
            <p className="text-foreground/80">This verification link is missing a token.</p>
          )}
        </div>
      </section>
    </main>
  );
}
