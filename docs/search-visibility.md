# Search visibility: receipt photobooth

## Shipped in the application

- Homepage H1, title, and description describe the receipt photobooth app/software. The original brand tagline remains visible.
- `/software-receipt-photobooth` (Indonesian) and `/receipt-photobooth-app` (English) explain the software, setup, supported hardware, offline limitations, and trial.
- Both routes are server-rendered, have self-referencing canonicals and reciprocal `hreflang`, and appear in the sitemap and shared footer. The English main has `lang="en"`; shared Indonesian navigation remains marked as Indonesian.
- Public landing pages, sitemap, and robots do not wait for an authenticated session. Server actions retain the session check.
- Organization, SoftwareApplication, WebPage, and FAQ structured data use the same FAQ content as the visible page. The only Offer is the explicitly limited 14-day trial, not a hardcoded subscription price. No invented reviews or ratings.
- The app redirects the exact apex host `poskart.my.id` to `https://www.poskart.my.id` with 308, preserving the path and query. Localhost, preview hosts, and www are not redirected.
- Promotion consumers use a stable no-promo server/hydration snapshot before showing the client cache. This prevents the header's early promo fetch from causing a hydration mismatch in streamed homepage pricing; discount rules are unchanged.

## Required after deployment

1. **Vercel / Cloudflare domain settings:** if an upstream rule redirects the apex host before Next.js runs, change that existing redirect from 307 to 308 (or 301). The application cannot override a response already sent by the hosting/CDN layer. Keep www as the canonical domain. Do not add a reverse www-to-apex rule.
2. Check the status and Location header for the homepage and a nested path with query parameters:

   ```sh
   curl -I 'https://poskart.my.id/receipt-photobooth-app?utm_source=test'
   curl -I 'https://www.poskart.my.id/receipt-photobooth-app'
   ```

   Expect apex → www with 301/308, then 200 on www, without a loop or login redirect.
3. **Google Search Console:** verify a Domain property for `poskart.my.id` using its DNS record; submit `https://www.poskart.my.id/sitemap.xml`. Inspect the homepage and both new URLs, confirm the selected canonical, then request indexing. These account/DNS steps are not performed by the code change.
4. Validate JSON-LD with Schema Markup Validator and Google's Rich Results Test. Valid markup is not a promise of enhanced search display. Google generally restricts FAQ rich results to authoritative government/health sites; do not expect them for this SaaS. Software rich-result eligibility may require genuine review data; do not fabricate it.
5. Monitor Search Console queries by country and device: `receipt photobooth app`, `software receipt photobooth`, and `aplikasi receipt photobooth`. Compare impressions, clicks, CTR, and average position over time, not one personalized search.

## What this does not do

No Google ranking is guaranteed. Meta keywords and sitemap priority are not Google ranking boosts; `.my.id` alone does not establish a ranking disadvantage. Indexing, useful original content, relevant links, and real product reputation still matter. No external listing, backlink purchase, Search Console submission, DNS change, or hosting rule is created automatically.

## Checks

```sh
node --test scripts/test-receipt-seo.mjs
SEO_BASE_URL=http://localhost:3210 node --test scripts/test-receipt-seo.mjs
```

The optional HTTP checks verify server HTML without executing JavaScript. Browser checks should cover mobile and desktop layouts, native FAQ keyboard interaction, screenshot loading, and the host redirect. Run production Lighthouse after deployment; dev-mode timings are not production performance measurements.
