# Railway Live Photo Worker

The POSKART Live Photo worker is a persistent Node process that renders framed
Live Photo GIFs outside the Flutter kiosk device.

## Railway service

Create a separate Railway service from this repository and use:

```bash
npm run worker:live-photo
```

Install `ffmpeg` in the Railway environment. With Nixpacks, add `ffmpeg` to the
service setup packages from the Railway dashboard, or use a service-level
Nixpacks config that includes `ffmpeg`.

## Required variables

Use the same production values as the web app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Optional tuning:

```bash
LIVE_PHOTO_FRAME_COUNT=10
LIVE_PHOTO_TARGET_WIDTH=1200
LIVE_PHOTO_FRAME_DURATION_MS=300
LIVE_PHOTO_WORKER_POLL_MS=3000
LIVE_PHOTO_WORKER_MAX_ATTEMPTS=3
```

## Flow

1. Flutter uploads per-slot Live Photo GIF sources to Cloudinary.
2. Flutter calls `/api/kiosk/gallery/live-photo/jobs`.
3. The Railway worker polls `live_photo_render_jobs`.
4. The worker renders the framed Live Photo GIF and uploads it to Cloudinary.
5. The worker upserts `gallery_photos` with `kind = framed` and `photo_index = 1`.
6. The public gallery page refreshes while the job is queued or processing.
