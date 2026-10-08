# Li Farm

Li Farm is an online shop for vegetables from the farm. Shoppers browse what is for sale, keep a cart, create an account, and pay by card. Admins can add products, change prices, mark items sold out, and review orders.

This project is in development. It is a working practice store, not a finished public shop. Card checkout uses Stripe test mode, so payments are not real charges. Signup verification and order receipts are not emailed yet.

## What it does

- The home page introduces the farm. Products live at `/products`.
- The cart checks submitted prices against the database, then opens Stripe Checkout. An order stays unpaid until Stripe confirms the amount.
- Accounts use a password and an email verification step. In local development the verification link is shown on the page.
- The database is hosted on Turso. Product rows are created there, and a missing starter crop is filled from `src/data/vegetables.ts` without overwriting a price that was already saved.

## Run it locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a `.env` file in the project root. It is gitignored.

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
STRIPE_SECRET_KEY=sk_test_...
```

`STRIPE_WEBHOOK_SECRET` is needed when Stripe should mark an order paid even if the shopper never returns to the site. For local testing, forward events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use test card `4242 4242 4242 4242`, any future expiry, and any CVC.
