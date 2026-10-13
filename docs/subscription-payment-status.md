# Subscription payment status

## Rollout

Apply `supabase/migrations/20261013080000_atomic_subscription_payment_reconciliation.sql`
and `supabase/migrations/20261013100000_subscription_payment_expiry_and_cancellation.sql`
to the target database **before deploying** the application changes. The new
gateway callbacks and status checks require this function and its columns.
No live database is changed by the test commands below.

Keep the service-role key server-side. The reconciliation RPC is executable
only by `service_role`; the status API authenticates the user and scopes every
order lookup to their organization before using the service client.

## Behavior

- Settings → Langganan shows the plan summary plus recent payment history,
  pending notices, manual checks, order details, and links to resume the
  original invoice. Settings → Organization keeps a short subscription summary
  that links to the Langganan tab.
- Pending invoices are valid for 15 minutes, with a countdown. Paid/failed/
  cancelled/expired orders leave the active list and remain in collapsed history.
  Failed/expired/cancelled orders have no check, pay, or cancel actions; support
  links include the Order ID and instructions to attach payment proof.
- Expiry is checked in the database when listing/checking payments and before
  creating another invoice. The migration also closes old pending invoices.
- Cancellation requires a fresh gateway verification and creator/owner/admin
  permission. Midtrans cancellation is attempted via its API. Duitku POP has no
  general cancellation endpoint: local cancellation explicitly warns that the
  external invoice may remain valid. Some gateway channels enforce their own
  expiry; POSKART always stops offering payment actions after its 15-minute limit.
- Verified paid callbacks remain authoritative after cancellation or expiry.
  Closing an invoice never cancels the current subscription and is not a refund.
- Invalid JSON, HTML/login redirects, and native network/parser errors receive
  readable retry/login messages rather than raw browser errors.
- The dashboard has a small link to the Langganan tab when payment is pending.
- The return page and the Langganan tab check the latest pending payments every
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
pending → paid, closing/reopening the popup, checking from the Langganan tab,
gateway timeout, and a repeated callback after a successful manual check.
