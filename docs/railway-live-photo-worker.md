# Railway Live Photo Worker

The POSKART Live Photo worker is a persistent Node process that renders framed
Live Photo GIFs outside the Flutter kiosk device. Flutter records each source
slot as a native high-resolution MP4/MOV during the final three seconds of the
camera countdown; Railway samples those videos and performs the final layout
composition.

## Railway service

The recommended setup is an isolated Railway service from this repository:

```text
Root Directory: /workers
Start Command: npm start
```

The `workers` directory has its own `package.json`, so Railway installs only the
dependencies required by the Live Photo worker. The following command is also
available when a custom start command is preferred:

```bash
npm run worker:live-photo
```

If the service deploys from the repository root instead, leave Root Directory
empty and use `npm run worker:live-photo` from the root `package.json`.

Install `ffmpeg` in the final Railway image by adding this service variable:

```bash
RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg
```

## Required variables

Use the same production values as the web app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PAYMENT_CREDENTIALS_SECRET=
```

`CLOUDINARY_*` is now only required when Cloudinary remains the active gallery
storage provider or as a legacy fallback. If Super Admin selects ImageKit, the
worker reads encrypted ImageKit credentials from `app_configs` and uses
`PAYMENT_CREDENTIALS_SECRET` to decrypt them.

Optional tuning:

```bash
LIVE_PHOTO_FRAME_COUNT=10
LIVE_PHOTO_TARGET_WIDTH=1200
LIVE_PHOTO_FRAME_DURATION_MS=300
LIVE_PHOTO_WORKER_POLL_MS=3000
LIVE_PHOTO_WORKER_MAX_ATTEMPTS=3
LIVE_PHOTO_WORKER_LEASE_TIMEOUT_SECONDS=900
LIVE_PHOTO_FETCH_TIMEOUT_MS=30000
LIVE_PHOTO_MAX_SOURCE_BYTES=26214400
```

If Railway still reports `Missing script: "worker:live-photo"`, it is running an
older commit or a different root directory than expected. Redeploy the latest
commit and verify either:

- `Root Directory: /workers` with `Start Command: npm start`, or
- repository root with `Start Command: npm run worker:live-photo`.

## Flow

1. Flutter records and uploads per-slot native Live Photo video sources to Cloudinary.
2. Flutter calls `/api/kiosk/gallery/live-photo/jobs`.
3. The Railway worker polls `live_photo_render_jobs`.
4. The worker renders the framed Live Photo GIF and uploads it to Cloudinary.
5. The worker upserts `gallery_photos` with `kind = framed` and `photo_index = 1`.
6. The public gallery page refreshes while the job is queued or processing.

## Deploy order after worker hardening

The current worker claims jobs through the Supabase RPC
`claim_live_photo_render_job`, so deploy in this order:

1. Apply the latest Supabase migrations.
2. Deploy the Next.js web/API service.
3. Redeploy the Railway Live Photo worker.
