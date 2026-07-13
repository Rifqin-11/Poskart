# Egress and Builder Asset Migration

## Supabase dashboard verification

1. Open the Supabase usage page and change **All projects** to the POSKART project.
2. Inspect the highest egress dates and hover the bars to record the breakdown.
3. Create two custom reports for the same 24-48 hour window:
   - Storage Egress
   - Database API Egress
4. Compare the reports after deployment. Cached egress should fall after the
   legacy builder assets stop being referenced.

## R2 migration order

Apply the manifest migration first. It creates the manifest table and removes
write access to the legacy `builder-assets` bucket while leaving reads intact:

```bash
npx supabase db push
```

Run the inventory without changing data:

```bash
node --env-file=.env.local scripts/migrate-builder-assets-to-r2.mjs
```

Review the JSON output, then run the actual migration during a short
maintenance window:

```bash
node --env-file=.env.local scripts/migrate-builder-assets-to-r2.mjs --apply
```

The script uploads referenced legacy objects to R2, updates template/layout
JSON URLs, and writes the R2 URL plus content hash and size to
`kiosk_asset_manifest`. It does not delete the legacy objects.

## Verification checklist

- Reload the web builder and confirm old frame images load from
  `https://assets.poskart.my.id`.
- Sync a kiosk and confirm the active layout contains R2 URLs.
- Confirm the asset manifest revision changes only when an asset changes.
- Restart a kiosk offline and open the frame picker; it must use local cached
  thumbnails and must not download during rendering.
- Keep the legacy Supabase bucket readable for 30 days. Before deletion,
  search templates, layout schemas, and asset records for the legacy storage
  marker and verify the result is empty.

## Runtime monitoring

- Kiosk JSON endpoints expose `X-POSKART-Response-Bytes` for response-size
  sampling.
- Flutter logs cache hits and misses from `ThemeBackgroundManager` in device
  logs.
- The kiosk heartbeat still checks remote print jobs every 15 seconds, while
  normal device status writes are throttled to once per 60 seconds.
