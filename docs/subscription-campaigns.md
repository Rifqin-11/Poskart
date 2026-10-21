# Subscription campaigns

Manage at **Super Admin → SaaS → Campaigns**. Photobooth vouchers are unaffected.

## Deployment

Apply `supabase/migrations/20261021120000_subscription_campaigns.sql` and `supabase/migrations/20261021140000_subscription_automatic_campaigns.sql` to the target database **before deploying the application changes**. Use the project's normal reviewed migration workflow; do not skip earlier pending migrations. No production migration is performed by the tests.

The migration adds campaign/audit tables, discount snapshots on subscription orders, and service-role-only pricing/statistics functions. No scheduler is required: published campaigns are evaluated against server time at checkout. Start is inclusive and end exclusive. The editor uses Asia/Jakarta (WIB); storage uses timestamptz.

## Christmas example

- Name: Christmas Sale; code: `XMAS20`.
- Start: December 1, 00:00 WIB; end: January 1, 00:00 WIB.
- Percentage: 10%; optional tiers: Rp300,000 → 15%, Rp500,000 → 20%.
- Minimum checkout: Rp150,000; maximum discount: Rp100,000.
- Choose eligible packages, new/existing/all organizations, total invoice quota and per-organization quota.
- Save as draft, then publish. Scheduled/active/expired are derived from the period. Pause stops new discounted invoices; archive preserves history.

Choose **Kode voucher** to require a code on `/checkout`, or **Otomatis saat checkout** to apply a campaign without tenant input. Automatic campaigns receive an internal invoice identifier; no public voucher code is required. The largest eligible automatic discount wins (ties use oldest campaign, then ID). Manual vouchers replace automatic discounts, never stack. Clearing the manual code restores automatic selection. Both modes respect schedule, package, audience, minimum and quota rules.

The server calculates the actual package/device subtotal and validates eligibility. The order insert revalidates under a campaign row lock, snapshots the name/code/discount, and supplies the resulting payable amount to Duitku or Midtrans. If the displayed discount changed, checkout requires a refresh or reapplication rather than silently charging another amount. Resumable automatic invoices retain their frozen price and reserved quota slot.

## Rules and limits

- Exactly one voucher per checkout; no stacking. Discounts apply to package plus additional-device subtotal, not payment-provider fees.
- Tier with the highest qualifying minimum wins; otherwise the primary discount applies. All tiers use the campaign's percentage/fixed type. Percentages round down to whole Rupiah. Discounts are capped at subtotal minus Rp1; this is not a free-subscription flow.
- “New” means the organization has no paid subscription orders; “existing” means at least one paid order. Limits are per organization, not per member account.
- Quota counts **issued invoices**, not just successful payments. Failed/cancelled/expired invoices retain slots because a late payment notification can still arrive. A resumable pending invoice keeps its original discount even if the campaign is paused/edited. Do not reassign issued slots manually without gateway reconciliation.
- Each change has an audit entry with the super admin actor and before/after values; the UI shows the latest 50 entries. Campaigns are archived, not deleted.
- Statistics include issued invoices, paid invoices and total discount on paid invoices. Refund-adjusted attribution, public banners and bulk-generated unique codes are not included.

## Verification

```sh
npx tsc --noEmit
node --test scripts/test-subscription-payments.mjs scripts/test-operational-subscription.mjs scripts/test-subscription-campaign-checkout.mjs
POSKART_PGLITE_MODULE=/external/path/to/@electric-sql/pglite node --test scripts/test-subscription-campaigns.mjs
```

PGlite tests run the actual migration in isolated in-memory Postgres. The package is optional and is not added to application dependencies. Gateway sandbox/browser checkout should also be verified before production release.
