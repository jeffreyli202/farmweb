import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClearCart } from "@/components/ClearCart";
import { farm } from "@/data/farm";
import { sendOrderReceipt } from "@/lib/mail";
import { formatPrice } from "@/lib/money";
import { getOwnOrder, recordPaidCheckoutSession } from "@/lib/orders";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = {
  title: `Order | ${farm.name}`,
  description: "Payment status for your farm order.",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isInteger(id)) {
    redirect("/cart");
  }

  const query = await searchParams;
  const sessionId = Array.isArray(query.session_id) ? query.session_id[0] : query.session_id;
  let order = await getOwnOrder(id);
  if (!order) {
    return (
      <main>
        <section className="mx-auto max-w-xl px-6 py-16">
          <h1 className="font-serif text-4xl tracking-tight">Order not found</h1>
        </section>
      </main>
    );
  }

  if (sessionId && order.status !== "paid") {
    try {
      await recordPaidCheckoutSession(sessionId);
    } catch (error) {
      console.error(error);
    }
    order = (await getOwnOrder(id)) ?? order;
  }

  const paid = order.status === "paid";
  const receipt = paid ? await sendOrderReceipt(order.id) : "skipped";
  const receiptSent = receipt === "sent" || receipt === "already";

  return (
    <main>
      {paid ? <ClearCart /> : null}
      <section className="mx-auto max-w-xl px-6 py-16">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">
          {paid ? `Order ${order.id}` : "Payment"}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">
          {paid ? "Thank you" : `Order ${order.id}`}
        </h1>
        <p className="mt-4 text-lg text-foreground/80">
          {paid
            ? `Thank you for your order. ${formatPrice(order.totalCents)} is paid.`
            : `${formatPrice(order.totalCents)} is not paid yet. If you just left the card page, refresh in a moment.`}
        </p>
        {receiptSent ? (
          <p className="mt-3 text-foreground/80">A receipt is on its way to {user.email}.</p>
        ) : null}
        <Link href="/products" className="mt-6 inline-block font-medium text-leaf underline">
          Back to products
        </Link>
      </section>
    </main>
  );
}
