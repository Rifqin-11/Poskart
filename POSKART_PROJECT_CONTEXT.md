# POSKART Admin — Project Context untuk Agent AI

> Dokumen ini adalah ringkasan teknis berbasis source code repository `poskart_admin`. Gunakan sebagai context awal ketika membuat spesifikasi fitur, dokumentasi teknis, SOP, use case, laporan, prompt implementasi, atau dokumen akademik. Jika ada perbedaan antara dokumen ini dan source code terbaru, source code adalah sumber kebenaran.

## 1. Identitas dan tujuan sistem

POSKART adalah platform SaaS untuk operasional bisnis photobooth. Repository ini berisi aplikasi web admin dan public site berbasis Next.js App Router. Web mengelola organisasi/tenant, perangkat photobooth, transaksi, pembayaran, galeri foto, template, theme, antrean, keuangan, subscription, serta konfigurasi yang digunakan oleh aplikasi kiosk Flutter.

Sistem bukan hanya dashboard CRUD. Alur bisnis utamanya adalah:

```text
Admin/Owner mengatur organisasi, device, harga, template, theme, dan payment
                 ↓
Flutter kiosk mengambil konfigurasi melalui API /api/kiosk/*
                 ↓
Pengunjung memilih paket/template dan menjalankan sesi photobooth
                 ↓
Transaksi, hasil foto, print job, delivery, dan statistik tersimpan
                 ↓
Admin memonitor operasional, galeri, pemasukan, dan payout
```

## 2. Teknologi utama

- Framework: Next.js `16.2.6`, React `19.2.4`, TypeScript.
- Model routing: Next.js App Router dengan route groups `(admin)`, `(builder)`, dan `(root)`.
- UI: Tailwind CSS v4, Radix UI, Lucide, Framer Motion, GSAP.
- State: Zustand dan TanStack React Query.
- Backend/data: Supabase Auth, PostgreSQL, Row Level Security, server actions, dan route handlers.
- Builder: `@dnd-kit`, `react-rnd`, schema layout JSON.
- Pembayaran: Duitku dan Midtrans; QRIS serta Cash/Voucher/Event untuk transaksi tertentu.
- Storage/media: Cloudinary atau ImageKit sebagai provider aktif, R2 untuk sebagian asset/server storage, serta signed URL.
- Email: Resend melalui `lib/delivery/gallery-delivery.ts`.
- Deployment: Vercel untuk web/API; Railway worker untuk rendering Live Photo berbasis FFmpeg.
- Kiosk client: aplikasi Flutter terpisah yang berkomunikasi dengan route `/api/kiosk/*` menggunakan Bearer token.

## 3. Struktur direktori penting

```text
app/
  (admin)/          Halaman admin yang membutuhkan autentikasi/otorisasi
  (builder)/        Visual builder dan theme builder
  (root)/           Landing page, auth, public gallery, queue, checkout, legal
  api/              API route handlers untuk web, kiosk, payment, cron, media
features/           UI dan client-side feature modules
server/             Service, action, payment, queue, money, dan bootstrap server
lib/                Integrasi Supabase, auth, kiosk, builder, gallery, storage, payment
stores/             Zustand stores serta default/initial builder data
supabase/migrations/ Schema, RLS, RPC, trigger, dan perubahan database
workers/            Railway Live Photo rendering worker
docs/               Dokumentasi deployment/operasional tertentu
```

Pola implementasi yang diharapkan: page menghubungkan feature component; feature memakai hook/API; operasi sensitif dilakukan melalui server action, server service, atau route handler; akses database mengikuti organisasi pengguna dan RLS.

## 4. Modul dan fitur fungsional

### 4.1 Public site dan autentikasi

- Landing page, halaman About, Contact, Privacy, Terms, dan Refund Policy.
- Register, login, logout, callback auth, redirect, dan session refresh Supabase.
- Public gallery melalui `/g/[token]`, `/s/[sessionId]`, dan shared gallery.
- Download foto individual melalui route signed/download.
- Public queue: pengunjung dapat melihat frame/antrean dan mendaftarkan antrean melalui event token.
- Subscription pricing, checkout, callback payment, dan halaman return.

### 4.2 Admin dashboard

Route utama berada di `app/(admin)/`:

| Area | Fungsi |
|---|---|
| Dashboard | KPI/statistik transaksi, pendapatan, print, dan ringkasan operasional |
| Devices | Kelola booth/device, status online/offline/maintenance, konfigurasi printer, dan log status |
| Gallery | Melihat session/foto, share, delete, print, delivery, dan shared gallery |
| Templates | Kelola frame template, urutan tampil, penggunaan, dan frame builder |
| Themes | Kelola theme preset dan theme builder |
| Pricing | Kelola paket harga, jumlah print/foto, payment/access mode, dan event access |
| POS | Catat serta kelola penjualan POS offline/manual dan statistik POS |
| Transactions | Monitor transaksi kiosk, filter status/provider/package/tanggal, archive/testing, dan action request |
| Queue | Monitor antrean dan proses pendaftaran/queue event |
| Money | Wallet, kategori, income/expense, tag, dan ringkasan keuangan |
| Withdraw | Kelola payout account, payout invoice, alokasi transaksi, dan status pencairan |
| Invoices | Melihat invoice/order terkait subscription atau payout |
| Organization | Kelola anggota, role, onboarding, dan join code |
| Settings | Profile, organisasi, payment, media/storage, dan konfigurasi aplikasi |
| Super Admin | Tenant/organization, SaaS pricing, payment gateway, gallery storage, payout invoice, dan transaction action request |

### 4.3 Visual builder

Terdapat dua konteks builder: frame template builder dan visual theme/layout builder. Builder mendukung canvas, page tabs, layer list, drag/resize, context menu, property inspector, save/load, asset/media, color key, dan zoom.

Layout builder memiliki page:

`landing`, `template`, `camera`, `preview`, `thanks`.

Node/component yang perlu dipahami agent mencakup text, image/media, button, QR/QR link/QR placeholder, camera view, photo result, receipt preview, frame preview, preview media toggle, template list/preview, return countdown, session countdown, dan payment countdown. Node deprecated seperti `stamp`, `countdown-overlay`, dan `flash-overlay` disaring oleh schema sanitizer.

Kontrak layout memiliki bentuk umum:

```ts
{
  version: 1,
  canvas: { ... },
  pages: {
    landing: [], template: [], camera: [], preview: [], thanks: []
  }
}
```

`overlayMode` membatasi node ke tipe overlay yang diizinkan. Jangan menambah properti builder hanya di web; jika properti dikonsumsi Flutter, selaraskan default, inspector, contract, renderer, dan fallback di kedua project.

### 4.4 Kiosk API dan konfigurasi Flutter

Route `/api/kiosk/*` menggunakan Bearer token, bukan cookie middleware web. Route ini melayani:

- login, refresh, logout, current user, Google OAuth;
- device registration/status/printer/theme;
- config dan asset manifest;
- template, builder asset, builder theme;
- pricing dan event statistics;
- transaction, POS sales, payment Duitku;
- gallery upload/sign/complete/deliver;
- Live Photo job enqueue/status;
- print jobs dan transaction reprint events;
- app update metadata.

Kiosk context memvalidasi access token, user, membership organization, dan device/organization scope. Jangan mengekspos service role key atau credential provider ke browser/kiosk.

### 4.5 Transaksi dan pembayaran

- Subscription POSKART memakai payment gateway dan mengaktifkan subscription setelah callback/notification terverifikasi.
- Duitku dapat digunakan untuk checkout subscription dan pembayaran QRIS kiosk.
- Midtrans memiliki route notification.
- Transaksi kiosk memiliki provider/status, package, amount, print count, paid time, archive/testing, dan metadata device/session.
- Provider transaksi yang tersedia pada schema terbaru: `QRIS`, `Cash`, `Voucher`, dan `Event`.
- `Event` adalah complimentary/event access dan tidak diperlakukan sebagai pendapatan normal.
- QRIS pending tanpa merchant order dapat dikecualikan dari statistik tertentu.
- Ledger pembayaran dijaga dengan policy/function agar core payment record tidak dihapus/diubah sembarangan.

### 4.6 Gallery dan media delivery

Sesi gallery dapat memiliki banyak foto, asset provider, public token/share URL, retention, social-media consent, dan status delivery. Foto dapat dikirim melalui email softfile. File `email.html` adalah template referensi; HTML pengiriman aktual berada di `lib/delivery/gallery-delivery.ts`, sehingga perubahan copy/CTA harus mempertimbangkan keduanya.

Provider upload aktif dikontrol oleh app configuration/Super Admin. Credential provider dibaca server-side. Cron `/api/cron/gallery-cleanup` membersihkan asset/provider record sesuai retention dan dilindungi `CRON_SECRET` di production.

### 4.7 Live Photo

Alur Live Photo:

```text
Flutter upload source video per slot
  → /api/kiosk/gallery/live-photo/jobs
  → live_photo_render_jobs
  → Railway worker claim job via Supabase RPC
  → FFmpeg render framed GIF
  → upload ke Cloudinary
  → upsert gallery_photos(kind = framed)
  → public gallery refresh
```

Worker berada di `workers/live-photo-worker.mjs`, membutuhkan FFmpeg dan credential server-side. Deployment order: migration database, web/API, lalu Railway worker.

### 4.8 Device, printer, dan print job

Admin dapat mengelola device/booth, status, battery, app version, sync time, printer status/name/error, serta tuning printer seperti brightness, contrast, dot density, dan bottom safe zone. Print job dan additional print event disimpan untuk idempotensi dan audit; jumlah copy dibatasi oleh database.

### 4.9 Organisasi, role, dan subscription

Sistem mendukung multi-tenancy. Data bisnis umumnya memiliki `organization_id`. Membership menghubungkan profile ke organization dengan role seperti `owner`, `admin`, `staff`, atau `designer`. Ada juga jalur Super Admin untuk operasi lintas organisasi.

Fitur subscription mencakup plan, duration, included/custom device limit, device addon, gateway setting, activation, invoice/order, dan feature access. Setiap perubahan fitur harus mempertimbangkan batas organisasi dan policy subscription.

## 5. Model data utama

Tabel inti yang ada pada migration Supabase meliputi:

- Identity/tenant: `profiles`, `organizations`, `organization_members`, `tenants`, `tenant_invitations`.
- Device/config: `booths`, `devices`, `app_configs`, `kiosk_asset_manifest`, `device_print_jobs`.
- Builder/media: `templates`, `theme_presets`, `layout_schemas`, `assets`.
- Commerce: `pricing_products`, `transactions`, `pos_sales`, `subscription_orders`, `payment_ledger_entries`.
- Gallery: `gallery_sessions`, `gallery_photos`, `shared_galleries`, `shared_gallery_sessions`, `live_photo_render_jobs`.
- Finance/payout: `money_wallets`, `money_categories`, `money_entries`, `money_tags`, `money_entry_tags`, `organization_payout_accounts`, `payout_invoices`, `payout_invoice_items`.
- Queue/operations: `guest_queue_entries`, `queue_events`, `admin_notifications`, `transaction_action_requests`, `transaction_print_events`.

Relasi konseptual:

```text
auth.users → profiles → organization_members → organizations
organizations → devices/booths, templates, themes, layouts, pricing_products
organizations → transactions/pos_sales → payment ledger/payout invoice items
transactions → gallery_sessions → gallery_photos
gallery_sessions ↔ shared_galleries (melalui shared_gallery_sessions)
devices → print jobs / print events
pricing_products → kiosk checkout → transactions
```

Database memakai RLS dan helper seperti `get_auth_organization_id()`, `is_auth_admin()`, serta function auth organization IDs. Saat membuat dokumen data model, selalu sebutkan bahwa `organization_id` adalah batas isolasi tenant dan bahwa akses aktual ditentukan oleh RLS/policy, bukan hanya filter UI.

## 6. Alur penting yang harus dipahami agent

### Sesi photobooth

```text
Kiosk autentikasi → resolve organization/device → ambil config/template/pricing
→ pengunjung memilih paket → pembayaran atau event access
→ pilih template → kamera mengambil 1–5 foto
→ hasil/frame/Live Photo diproses → gallery session dan photo dibuat
→ print job dan transaction diperbarui → QR/share/email delivery
```

### Subscription POSKART

```text
/subscriptions → /checkout?plan=... → Duitku/payment gateway
→ callback/notification server → verifikasi pembayaran
→ activation subscription → /checkout/return
```

### Auth web

Request web melewati Supabase middleware untuk refresh/session handling. Route kiosk dikecualikan dari matcher middleware karena memakai Bearer auth dan tidak boleh mendapat redirect cookie-based.

## 7. Keamanan dan batasan teknis

- Jangan menaruh service role key, payment secret, storage secret, atau credential gateway di `NEXT_PUBLIC_*`.
- Semua data tenant harus scoped ke organization dan dilindungi RLS/server authorization.
- Callback payment harus diverifikasi; jangan menganggap redirect browser sebagai bukti pembayaran sukses.
- Signed URL/download dan public token harus memiliki expiry/scope yang benar.
- Validasi input dilakukan di server, terutama amount, copies, organization/device ID, file/media, dan status transition.
- Cron cleanup harus menggunakan secret.
- Jangan mengubah middleware matcher untuk route kiosk tanpa memahami perbedaan cookie auth vs Bearer auth.
- Jangan mengubah schema builder tanpa memeriksa consumer Flutter dan backward compatibility.

## 8. Konvensi kerja agent AI

Sebelum mengusulkan atau menulis perubahan:

1. Cari route/page, feature component, server action/service, API route, dan migration yang menjadi source of truth.
2. Telusuri alur data dari UI → hook/API → server → Supabase/storage/payment → UI response.
3. Bedakan preview/template file dari runtime path. Contoh: email aktual dikirim dari `lib/delivery/gallery-delivery.ts`.
4. Untuk perubahan lintas web-Flutter, buat daftar kontrak yang harus tetap sama: field, default, status, endpoint, auth, dan fallback.
5. Untuk dokumen akademik, gunakan istilah sistem yang sesuai source code dan tandai bagian yang berupa rancangan/proposal.
6. Jangan mengarang tabel, endpoint, role, atau fitur yang tidak ditemukan. Jika belum diverifikasi, tulis sebagai `perlu verifikasi`.
7. Setelah perubahan kode, jalankan pemeriksaan proporsional seperti TypeScript, lint, test terkait, dan build bila relevan.

## 9. File rujukan utama

- Routing: `app/`
- Admin feature map: `features/admin/`
- Kiosk auth/context: `lib/kiosk/server.ts`
- Builder schema: `lib/builder/schema.ts`, `types/builder.ts`, `stores/builder-*`
- Gallery: `lib/gallery/`, `features/admin/gallery/`, `lib/delivery/gallery-delivery.ts`
- Payment: `lib/duitku.ts`, `lib/midtrans.ts`, `server/payments/`, `app/api/payments/`
- Database source: `supabase/migrations/`
- Live Photo worker: `workers/live-photo-worker.mjs`, `docs/railway-live-photo-worker.md`
- Environment reference: `.env.example`

## 10. Format output yang diharapkan dari agent

Saat diminta membuat dokumen, prioritaskan struktur berikut sesuai kebutuhan:

1. tujuan dan ruang lingkup;
2. aktor/role dan hak akses;
3. fitur dan fungsi;
4. alur proses/data;
5. endpoint atau integrasi;
6. model data dan relasi;
7. keamanan, validasi, dan batasan;
8. asumsi, status implementasi, dan bagian yang perlu verifikasi.

Gunakan bahasa Indonesia formal untuk laporan/skripsi, bahasa teknis ringkas untuk dokumentasi developer, dan sertakan path file aktual ketika menjelaskan implementasi. Jangan menyatakan fitur sebagai sudah berjalan jika source code hanya menunjukkan schema, placeholder, atau rancangan.
