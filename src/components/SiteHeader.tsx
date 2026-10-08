import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { CartLink } from "@/components/CartLink";
import { farm } from "@/data/farm";
import { getCurrentUser } from "@/lib/users";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-6 py-5">
        <Link href="/" className="font-serif text-2xl tracking-tight text-leaf">
          {farm.name}
        </Link>
        <nav className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-2">
          <Link href="/products" className="text-sm font-medium text-foreground">
            Products
          </Link>
          <CartLink />
          {user?.isAdmin ? (
            <Link href="/admin" className="text-sm font-medium text-foreground">
              Admin
            </Link>
          ) : null}
          {user ? (
            <>
              <span className="max-w-48 truncate text-sm text-foreground/70">{user.email}</span>
              <form action={logoutAction}>
                <button type="submit" className="text-sm font-medium text-foreground">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-foreground">
                Log in
              </Link>
              <Link href="/signup" className="text-sm font-medium text-foreground">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
