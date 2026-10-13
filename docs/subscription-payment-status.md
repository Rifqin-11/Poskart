# Subscription payment status

## Rollout

Apply `supabase/migrations/20261013080000_atomic_subscription_payment_reconciliation.sql`
to the target database **before deploying** the application changes. The new
gateway callbacks and status checks require this function and its columns.
No live database is changed by the test commands below.

Keep the service-role key server-side. The reconciliation RPC is executable
only by `service_role`; the status API authenticates the user and scopes every
order lookup to their organization before using the service client.

## Behavior

- Settings → Organization shows recent payment history, pending notices,
  manual checks, order details, and links to resume the original invoice.
- The dashboard has a small link to Organization when payment is pending.
- The return page and Organization check the latest pending payments every
  15 seconds while visible. Gateway calls have a database-backed per-order
  cooldown to prevent duplicate requests across tabs.
- Gateway outages retain the current status and display a retry message.
  A URL query parameter is never accepted as proof of payment.
- Paid reconciliation locks the order and serializes renewals per organization.
  Subscription activation and the paid status commit in one transaction. A
  failed activation rolls both back, allowing a later callback/check to retry.
- Paid orders never activate twice or revert to pending/failed. Separate paid
  orders add their durations to the existing expiry, using calendar months.
- Existing paid orders are preserved without reactivation. Historical paid
  orders from the old callback flow that failed to activate need manual review;
  they are not automatically extended again.

## Validation

```sh
node --test scripts/test-subscription-payments.mjs
npx tsc --noEmit --incremental false
npm run build
```

The SQL integration test is optional and uses a disposable in-memory PostgreSQL
database. Install `@electric-sql/pglite` outside the repository, then set
`POSKART_PGLITE_MODULE` to its package directory when running the test command.
Without that variable, only the SQL integration test is skipped.

Before production rollout, test a sandbox payment from each enabled gateway:
pending → paid, closing/reopening the popup, checking from Organization, gateway
timeout, and a repeated callback after a successful manual check.
