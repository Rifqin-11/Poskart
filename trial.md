# Rencana Implementasi Public Trial POSKART

## 1. Ringkasan keputusan

POSKART akan menyediakan trial operasional selama **14 hari** dengan model **hybrid approval**:

1. Pengguna membuat akun dan organisasi seperti biasa.
2. Organisasi tetap berada pada mode free sampai pengguna mengajukan trial.
3. Pengguna menggunakan email yang sudah diverifikasi oleh provider autentikasi dan menghubungkan satu device.
4. Server melakukan pemeriksaan anti-penyalahgunaan secara otomatis.
5. Device, owner, atau rekening payout yang sudah pernah trial langsung ditolak tanpa masuk antrean review, kecuali memiliki manual override.
6. Request yang lolos pemeriksaan otomatis masuk ke Super Admin untuk ditinjau.
7. Trial tidak langsung berjalan saat disetujui. Masa 14 hari dimulai ketika device pertama kali berhasil mengaktifkan trial melalui server.
8. Setelah trial habis, data tidak dihapus. Operasional booth dikunci sampai organisasi membeli subscription.

Model ini dipilih agar trial tetap mudah diakses oleh calon pelanggan yang valid, tetapi membuat pembuatan akun berulang menjadi tidak efektif.

---

## 2. Tujuan

- Membuka trial POSKART kepada publik tanpa mewajibkan kartu kredit.
- Memberikan pengalaman produk penuh menggunakan satu booth/device.
- Mencegah satu orang memperoleh trial berulang hanya dengan membuat email baru.
- Memberikan kontrol akhir kepada Super Admin selama tahap awal peluncuran.
- Mempertahankan seluruh data pengguna setelah trial berakhir agar proses konversi tidak merugikan pengguna.
- Menyediakan audit trail untuk setiap request, approval, rejection, override, aktivasi, dan konversi.

## 3. Bukan bagian dari implementasi awal

- KYC menggunakan KTP atau dokumen legal.
- Pemblokiran permanen hanya berdasarkan alamat IP.
- Auto-approval untuk seluruh request.
- Lebih dari satu device selama trial.
- Penghapusan otomatis organisasi, device, transaksi, konfigurasi, atau galeri setelah trial habis.
- Trial berulang setelah pengguna menghapus akun atau organisasi.

---

## 4. Aturan produk

### 4.1 Hak trial

- Durasi: **14 x 24 jam sejak aktivasi pertama**.
- Kapasitas: **1 device**.
- Paket: setara fitur Starter, tetapi menggunakan plan internal `starter-trial`.
- Trial hanya boleh diklaim satu kali oleh:
  - satu owner/profile;
  - satu physical device;
  - satu rekening payout, apabila rekening sudah disimpan.
- Anggota yang bergabung ke organisasi milik orang lain tidak memperoleh trial baru.
- Menghapus organisasi atau akun tidak menghapus riwayat penggunaan trial.
- Device yang pernah trial tetap dapat digunakan kembali setelah organisasi membeli subscription. Pemblokiran duplicate device hanya berlaku untuk memperoleh trial baru, bukan untuk penggunaan berbayar.

### 4.2 Kapan trial dimulai

Trial dimulai ketika seluruh kondisi berikut terpenuhi:

1. Request berstatus `approved`.
2. Approval belum melewati batas aktivasi.
3. Device yang disetujui melakukan request aktivasi ke server.
4. Server mengulang pemeriksaan identifier dan berhasil membuat claim secara atomik.

Approval berlaku selama **72 jam**. Jika tidak diaktifkan dalam periode tersebut, request berubah menjadi `activation_expired` dan harus ditinjau ulang.

### 4.3 Ketika trial berakhir

- Web tetap mengizinkan akses ke Dashboard ringkas, Settings Organization, Subscriptions, Checkout, bantuan, dan export data yang memang diizinkan.
- Halaman operasional berbayar dikunci atau dibuat read-only sesuai kebutuhannya.
- Flutter tidak boleh memulai sesi photobooth baru.
- Flutter tetap mengizinkan:
  - membuka Settings;
  - menyelesaikan upload yang tertunda;
  - melihat file lokal;
  - melakukan troubleshooting;
  - logout.
- Tidak ada file, konfigurasi, transaksi, atau device yang dihapus.
- CTA utama mengarahkan owner ke pemilihan paket subscription.

### 4.4 Pembelian subscription saat trial

Jika pembayaran dilakukan ketika trial masih aktif, subscription berbayar dimulai dari akhir trial. Sisa hari trial tidak hangus. Mekanisme ini sudah sesuai dengan perilaku `activatePaidSubscription()` saat ini yang memakai tanggal masa aktif yang lebih jauh antara waktu sekarang dan `current_period_end`.

Setelah pembayaran berhasil:

- `subscriptions.status` menjadi `active`;
- `trial_claims.converted_at` diisi;
- reminder trial yang belum terkirim dibatalkan;
- device melakukan sync dan melanjutkan penggunaan tanpa pairing ulang.

---

## 5. Alur pengguna

```text
Daftar / login
    |
    v
Buat organisasi (status free)
    |
    v
Klik "Ajukan trial 14 hari"
    |
    v
Validasi email terverifikasi dan lengkapi profil bisnis
    |
    v
Hubungkan satu device menggunakan pairing code
    |
    v
Server menjalankan pre-check
    |-------------------------------|
    |                               |
Identifier pernah trial       Belum pernah trial
    |                               |
    v                               v
Tolak otomatis                Buat request pending
                                    |
                                    v
                           Review Super Admin
                           |                |
                           v                v
                        Reject          Approve
                                            |
                                            v
                                  Menunggu aktivasi device
                                            |
                                            v
                                  Aktivasi trial secara atomik
                                            |
                                            v
                                   Bootstrap + sync Flutter
                                            |
                                            v
                                      Trial 14 hari
```

---

## 6. Pemeriksaan anti-penyalahgunaan

### 6.1 Hard block

Request langsung ditolak apabila salah satu kondisi berikut ditemukan dan tidak memiliki manual override yang valid:

- Profile owner pernah mengaktifkan trial.
- Hardware/device identifier pernah digunakan untuk trial.
- Rekening payout pernah digunakan untuk trial lain.
- Organisasi sudah memiliki trial aktif atau subscription aktif.
- Device sedang terdaftar aktif pada organisasi lain tanpa proses pemindahan resmi.

Contoh error code:

```text
TRIAL_OWNER_ALREADY_USED
TRIAL_DEVICE_ALREADY_USED
TRIAL_PAYOUT_ACCOUNT_ALREADY_USED
TRIAL_ALREADY_ACTIVE
TRIAL_DEVICE_REGISTERED_ELSEWHERE
```

Pesan Flutter untuk duplicate device:

> Device ini sebelumnya sudah pernah menggunakan trial POSKART. Silakan pilih paket berlangganan atau hubungi support jika perangkat ini berpindah kepemilikan.

Pemeriksaan selalu dilakukan di server. Flutter hanya menampilkan hasil dari server dan tidak menjadi sumber kebenaran.

### 6.2 Soft risk signal

Indikator berikut tidak otomatis menolak request, tetapi ditampilkan kepada Super Admin:

- Banyak akun dibuat dari IP yang sama dalam waktu singkat.
- Banyak organisasi menggunakan domain email atau pola nama serupa.
- Pairing code dibuat berulang kali.
- Device sering berpindah akun/organisasi.
- Akun baru langsung mengajukan trial tanpa melengkapi profil bisnis.
- Event date, nama bisnis, atau tujuan penggunaan tidak masuk akal/tidak lengkap.

Alamat IP tidak boleh menjadi hard block karena beberapa calon pelanggan dapat menggunakan Wi-Fi bersama.

### 6.3 Keterbatasan Device ID

Device ID merupakan deterrent kuat, tetapi bukan identitas yang tidak dapat dipalsukan. Uninstall, factory reset, custom APK, atau perubahan sistem tertentu dapat mengubah identifier.

Gunakan kombinasi berikut:

- Android SSAID/Android ID yang tersedia bagi aplikasi;
- installation key yang dibuat aplikasi dan disimpan di secure storage;
- server-issued device registration ID setelah pairing;
- normalized hardware fingerprint yang tidak menyimpan data sensitif mentah;
- akun owner, rekening payout, dan hasil manual review sebagai identifier tambahan.

Tahap lanjutan dapat menambahkan Play Integrity/app attestation agar request hanya diterima dari APK POSKART resmi.

### 6.4 Rate limit awal

- Maksimal 3 pembuatan akun per IP per 24 jam.
- Maksimal 3 pairing code aktif/regenerasi per device dalam satu window pairing.
- Maksimal 5 percobaan pengajuan trial per akun per hari.
- CAPTCHA pada signup dan pengajuan trial.

Nilai tersebut harus dapat dikonfigurasi dan dievaluasi kembali berdasarkan data produksi.

### 6.5 Keputusan tanpa OTP WhatsApp

Implementasi awal tidak menggunakan OTP WhatsApp agar tidak menambah biaya pesan dan operasional.

- Login Google menggunakan status verifikasi email dari provider Google tanpa mengirim verifikasi ulang.
- Login email/password hanya dianggap valid setelah email dikonfirmasi melalui Supabase Auth.
- Nomor telepon bersifat opsional untuk kebutuhan kontak dan tidak digunakan sebagai bukti identitas atau hard block.
- Perlindungan utama berasal dari owner/profile, hardware device, rekening payout bila tersedia, rate limit, CAPTCHA, dan manual review Super Admin.
- Konsekuensinya, pengguna dengan akun baru dan physical device yang benar-benar berbeda masih mungkin mengajukan request. Kasus tersebut ditangani melalui manual review dan soft risk signals.

---

## 7. State machine

### 7.1 Trial request

```text
pending
  |-- needs_information
  |       |-- pending
  |       `-- canceled
  |-- rejected
  |-- canceled
  `-- approved
          |-- activated
          `-- activation_expired
```

Definisi:

- `pending`: menunggu review Super Admin.
- `needs_information`: Super Admin meminta data tambahan.
- `approved`: disetujui dan menunggu aktivasi device.
- `activated`: claim berhasil dibuat dan trial sedang/sempat berjalan.
- `rejected`: ditolak oleh sistem atau Super Admin.
- `canceled`: dibatalkan oleh pengguna/Super Admin.
- `activation_expired`: tidak diaktifkan dalam 72 jam setelah approval.

### 7.2 Trial claim

```text
active -> converted
active -> expired
active -> revoked
```

- `active`: trial sedang berjalan.
- `converted`: organisasi membeli subscription.
- `expired`: masa 14 hari selesai tanpa konversi.
- `revoked`: trial dihentikan oleh Super Admin karena pelanggaran.

Hak akses aktual tetap ditentukan oleh kombinasi `subscriptions.status` dan `subscriptions.current_period_end`. Cron tidak boleh menjadi syarat agar trial yang sudah habis dapat diblokir.

---

## 8. Rancangan database

Semua perubahan dibuat melalui migration baru. Migration historis tidak diubah.

### 8.1 Internal trial plan

Tambahkan plan internal:

```text
id: starter-trial
name: Starter Trial
max_devices: 1
is_public: false
```

Plan ini tidak ditampilkan pada landing page/pricing. Durasi sebenarnya tetap berasal dari `trial_claims.ends_at` dan `subscriptions.current_period_end`.

### 8.2 `trial_requests`

Kolom yang direncanakan:

```text
id uuid primary key
organization_id text
requester_profile_id uuid
device_id text nullable
device_pairing_id uuid nullable
hardware_id_hash text
email_snapshot text
contact_phone text nullable
business_name text
city text
intended_use text
event_date date nullable
status text
risk_flags jsonb
reviewed_by uuid nullable
reviewed_at timestamptz nullable
review_note text nullable
rejection_code text nullable
rejection_reason text nullable
approved_at timestamptz nullable
activation_deadline timestamptz nullable
activated_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Constraint penting:

- Satu request `pending`, `needs_information`, atau `approved` per organisasi.
- Request harus dimiliki owner organisasi.
- `approved` wajib memiliki `reviewed_by`, `approved_at`, dan `activation_deadline`.
- `rejected` wajib memiliki alasan yang dapat diaudit.

### 8.3 `trial_claims`

```text
id uuid primary key
request_id uuid unique
organization_id text nullable
owner_profile_id uuid nullable
device_id text nullable
started_at timestamptz
ends_at timestamptz
status text
converted_at timestamptz nullable
revoked_at timestamptz nullable
revoked_by uuid nullable
revoke_reason text nullable
created_at timestamptz
updated_at timestamptz
```

Foreign key organisasi/profile menggunakan `ON DELETE SET NULL` agar audit penggunaan trial tidak hilang ketika akun atau organisasi dihapus.

### 8.4 `trial_identifiers`

```text
id uuid primary key
trial_claim_id uuid
identifier_type text
identifier_hash text
created_at timestamptz
unique(identifier_type, identifier_hash)
```

`identifier_type` minimal:

```text
owner_profile
hardware_device
payout_account
```

Nilai sensitif dinormalisasi lalu di-hash pada server. Jangan menyimpan rekening atau fingerprint mentah di tabel anti-abuse. Nomor telepon, jika pengguna memilih mengisinya, hanya menjadi data kontak dan bukan hard-block identifier karena tidak diverifikasi.

### 8.5 `trial_overrides`

```text
id uuid primary key
trial_request_id uuid
identifier_type text
identifier_hash text
reason text
approved_by uuid
expires_at timestamptz nullable
created_at timestamptz
```

Override tidak menghapus riwayat claim lama. Override hanya mengizinkan request tertentu melewati satu identifier yang sudah pernah digunakan.

### 8.6 Audit log

Gunakan tabel audit yang tersedia atau tambahkan event berikut:

```text
trial.requested
trial.auto_rejected
trial.needs_information
trial.approved
trial.rejected
trial.override_created
trial.activation_expired
trial.activated
trial.expired
trial.revoked
trial.converted
```

---

## 9. Database function atomik

### 9.1 `submit_trial_request(...)`

Tanggung jawab:

1. Memastikan caller adalah owner organisasi.
2. Memastikan email sudah diverifikasi oleh provider autentikasi. Akun Google dianggap terverifikasi tanpa verifikasi email tambahan; akun email/password harus memiliki `email_confirmed_at`.
3. Memastikan pairing/device benar-benar milik organisasi tersebut.
4. Menghitung hash identifier di server atau menerima hash dari server application layer, bukan dari UI.
5. Memeriksa `trial_identifiers` dan request aktif.
6. Mencatat auto-rejection atau membuat request `pending`.
7. Mengembalikan status dan public-safe error code.

### 9.2 `review_trial_request(...)`

Tanggung jawab:

1. Hanya dapat dijalankan Super Admin.
2. Mengunci row request (`FOR UPDATE`).
3. Mengulang seluruh hard-block check.
4. Memastikan override valid jika ada identifier lama.
5. Mengubah status menjadi `approved`, `rejected`, atau `needs_information`.
6. Menetapkan deadline aktivasi 72 jam untuk approval.
7. Menulis audit log.

### 9.3 `activate_approved_trial(...)`

Tanggung jawab:

1. Dipanggil menggunakan authenticated kiosk context.
2. Mengunci request, subscription, dan identifier terkait.
3. Memastikan device/hardware sama dengan yang disetujui.
4. Memastikan approval belum kedaluwarsa.
5. Mengulang hard-block check untuk mencegah race condition.
6. Membuat `trial_claims` dan `trial_identifiers`.
7. Mengubah subscription menjadi:

```text
plan_id: starter-trial
status: trialing
current_period_end: now() + interval '14 days'
device_limit: 1
```

8. Menandai request `activated`.
9. Mengembalikan bootstrap permission kepada Flutter.

Seluruh operasi harus berada dalam satu transaksi. Unique constraint tetap menjadi perlindungan terakhir terhadap double activation.

---

## 10. API dan server actions

### 10.1 Web user

```text
POST /api/trials/requests
GET  /api/trials/current
POST /api/trials/current/cancel
```

Alternatif yang lebih sesuai pola admin saat ini adalah memakai server actions untuk submit/cancel, tetapi seluruh validasi tetap berada di server/database function.

Contoh respons request yang ditolak karena device:

```json
{
  "ok": false,
  "code": "TRIAL_DEVICE_ALREADY_USED",
  "message": "Device ini sebelumnya sudah pernah menggunakan trial POSKART.",
  "supportAllowed": true
}
```

### 10.2 Flutter kiosk

```text
GET  /api/kiosk/trials/status?hardwareId=...
POST /api/kiosk/trials/activate
```

Endpoint menggunakan Bearer authentication dan kiosk context yang sama dengan endpoint kiosk lain. Flutter tidak mengakses tabel Supabase secara langsung.

Polling status:

- hanya aktif ketika layar trial/pairing terbuka;
- interval 5 detik;
- berhenti saat `activated`, `rejected`, `activation_expired`, logout, atau aplikasi background;
- gunakan exponential backoff ketika terjadi network error;
- tidak memakai Supabase Realtime pada tahap awal.

### 10.3 Super Admin

Gunakan server actions dengan role check Super Admin:

```text
listTrialRequests(filters)
getTrialRequestDetail(id)
approveTrialRequest(id, note)
rejectTrialRequest(id, reason)
requestTrialInformation(id, message)
createTrialOverride(id, identifierType, reason)
revokeTrialClaim(id, reason)
```

---

## 11. Integrasi pairing device

Pairing saat ini sudah memiliki code 8 karakter, expiry 10 menit, hashing hardware ID, regeneration limit, validation limit, dan claim atomik. Trial harus menggunakan data pairing tersebut, bukan membuat mekanisme Device ID kedua.

Perubahan yang diperlukan:

1. Simpan referensi pairing/device pada `trial_requests`.
2. Tambahkan eligibility check setelah server mengetahui hardware hash.
3. Jangan memblokir pairing berbayar hanya karena hardware pernah trial.
4. Duplicate hardware hanya memblokir klaim trial baru.
5. Setelah approval, Flutter mendeteksi status melalui endpoint trial dan mengaktifkan trial tanpa restart aplikasi.
6. Setelah aktivasi, Flutter menjalankan bootstrap/sync lalu masuk landing page.

Untuk organisasi free, hanya route yang diperlukan untuk onboarding, trial request, pairing, subscription, dan checkout yang boleh dilewati. Jangan membuka seluruh halaman operasional sebelum trial aktif.

---

## 12. UI pengguna web

### 12.1 Halaman pengajuan

Tampilkan:

- Penjelasan trial 14 hari.
- Satu device termasuk.
- Tidak memerlukan kartu kredit.
- Trial baru dimulai setelah disetujui dan device diaktifkan.
- Field nama bisnis, kota, tujuan penggunaan, event date opsional, website/akun sosial bisnis, dan nomor telepon opsional untuk kontak.
- Status email terverifikasi.
- Device yang akan dipakai.
- Tombol `Ajukan trial`.

### 12.2 Status request

Status card:

- `Menunggu pemeriksaan`
- `Perlu informasi tambahan`
- `Disetujui - aktifkan di device`
- `Trial aktif - tersisa X hari`
- `Ditolak`
- `Trial telah berakhir`

Setiap status harus memiliki next action yang jelas.

### 12.3 Duplicate device

Tampilkan pesan langsung dan jangan membuat request `pending`:

> Device ini sebelumnya sudah pernah menggunakan trial POSKART. Anda tetap dapat menggunakan device ini dengan paket berlangganan. Hubungi support jika device telah berpindah kepemilikan.

Actions:

- `Lihat paket`
- `Hubungi support`

---

## 13. UI Super Admin

Tambahkan section/tab `Trial requests` di halaman Super Admin.

### 13.1 Daftar request

Filter:

- status;
- tanggal request;
- risk level;
- organisasi;
- email;
- device;
- reviewer.

Kolom utama:

```text
Request
Organization
Owner/email
Device
Submitted at
Risk
Status
Reviewer
Action
```

### 13.2 Detail review

Tampilkan:

- Nama dan email owner.
- Status verifikasi email.
- Nomor telepon kontak jika pengguna memilih mengisinya, dengan label `Belum diverifikasi`.
- Nama organisasi, kota, tujuan penggunaan, event date.
- Device name, model, OS/app version, shortened Device ID.
- First seen dan last seen device.
- Riwayat pairing device.
- Riwayat trial owner, hardware, dan rekening payout.
- Soft risk signals.
- Request timeline/audit log.
- Catatan internal reviewer.

Actions:

- `Approve trial`
- `Reject trial`
- `Request information`
- `Allow reused device`
- `Revoke active trial` untuk request yang sudah aktif.

Semua action destructive atau override wajib menggunakan confirmation modal dan alasan tertulis.

### 13.3 Checklist approval

Super Admin menggunakan checklist konsisten:

- Email terverifikasi.
- Device belum pernah trial atau memiliki override yang sah.
- Owner belum pernah trial.
- Organisasi tidak memiliki subscription/trial lain.
- Data penggunaan masuk akal.
- Tidak ada risk signal berat yang belum dijelaskan.

Target operasional ditampilkan kepada pengguna: **review maksimal 1 x 24 jam**.

---

## 14. UI Flutter

### 14.1 Device belum mengajukan trial

Tampilkan pairing code dan arahan untuk membuka web. Setelah device berhasil terhubung, arahkan ke status trial jika organisasi belum memiliki subscription aktif.

### 14.2 Pending

```text
Pengajuan trial sedang diperiksa

Kami sedang memeriksa pengajuan trial untuk device ini.
Anda akan menerima pemberitahuan setelah pengajuan disetujui.

Status: Menunggu persetujuan
```

### 14.3 Approved

```text
Trial disetujui
Menyiapkan konfigurasi booth...
```

Flutter kemudian:

1. Memanggil activation endpoint.
2. Menyimpan status dan expiry dari server.
3. Menjalankan bootstrap.
4. Mengunduh konfigurasi dan aset prioritas.
5. Masuk landing page tanpa force close/restart.

### 14.4 Rejected/duplicate

Tampilkan alasan yang aman tanpa membocorkan hash atau mekanisme internal. Sediakan tombol `Lihat paket`, `Coba lagi` jika diizinkan, dan `Hubungi support`.

### 14.5 Trial expired

Tampilkan expiry screen yang tidak menghapus cache. Upload queue tetap berjalan di background sesuai mekanisme yang sudah ada.

---

## 15. Offline policy

- Device yang belum pernah dipair dan belum mengaktifkan trial tidak dapat memulai trial secara offline.
- Setelah trial aktif, Flutter menyimpan `trialEndsAt`, `lastVerifiedServerAt`, dan server-time offset.
- Device boleh berjalan offline selama cached entitlement masih valid.
- Saat expiry tidak dapat diverifikasi karena internet terputus, berikan grace period maksimal 24 jam sejak verifikasi server terakhir.
- Setelah grace period habis, sesi baru dikunci tetapi upload queue dan akses Settings tetap tersedia.
- Jangan hanya mempercayai jam lokal device. Gunakan last-known server time dan deteksi rollback waktu yang mencurigakan.
- Setiap kali online, status server selalu mengalahkan cache lokal.

---

## 16. Notifikasi dan email

Kirim notifikasi kepada owner:

- Request diterima.
- Informasi tambahan diperlukan.
- Request disetujui.
- Request ditolak.
- Approval akan kedaluwarsa.
- Trial berhasil diaktifkan.
- Trial berakhir dalam 7 hari.
- Trial berakhir dalam 3 hari.
- Trial berakhir besok.
- Trial telah berakhir.

Reminder subscription yang sudah ada dapat digunakan, tetapi query perlu mengambil `status` dan copy harus dibedakan:

- `trialing`: CTA `Pilih paket` dan copy `Trial berakhir...`.
- `active`: CTA `Perpanjang subscription` dan copy subscription saat ini.

Setelah pembayaran berhasil, reminder trial lama harus dibatalkan dan claim ditandai `converted`.

---

## 17. Keamanan dan privasi

- Semua review/approval/rejection hanya melalui server-side Super Admin role check.
- RLS tidak memberi user biasa akses ke request organisasi lain.
- Kiosk hanya dapat membaca status untuk context organisasi dan hardware miliknya.
- Raw hardware fingerprint tidak dikirim kembali ke UI.
- Hash identifier menggunakan normalisasi yang konsisten dan server-side pepper dari environment variable.
- Jangan mencatat token pairing, nomor rekening penuh, nomor telepon kontak, atau identifier mentah ke application log.
- Rate limit dan CAPTCHA diterapkan pada request publik.
- Audit log bersifat append-only bagi user biasa.
- Dokumentasikan penggunaan identifier anti-fraud pada Privacy Policy.

Environment yang direncanakan:

```env
PUBLIC_TRIAL_ENABLED=false
PUBLIC_TRIAL_DAYS=14
PUBLIC_TRIAL_DEVICE_LIMIT=1
PUBLIC_TRIAL_PLAN_ID=starter-trial
TRIAL_APPROVAL_ACTIVATION_HOURS=72
TRIAL_OFFLINE_GRACE_HOURS=24
TRIAL_IDENTIFIER_PEPPER=...
```

`PUBLIC_TRIAL_ENABLED` menjadi kill switch tanpa perlu menghapus data trial yang sudah ada.

---

## 18. Perubahan area kode

### Web/admin

- `lib/subscription-policy.ts`
  - Tambahkan helper state trial dan derived expiry/countdown.
- `lib/supabase/middleware.ts`
  - Izinkan onboarding/trial/pairing/subscription routes bagi organisasi free.
- `server/admin/page-access.ts`
  - Samakan protected access dengan centralized entitlement policy.
- `features/admin/settings/_components/organization-card.tsx`
  - Tampilkan status trial, countdown, dan CTA.
- `features/admin/superadmin/*`
  - Tambahkan daftar/detail/action review trial.
- `server/admin/actions/*`
  - Tambahkan server actions trial dengan Super Admin role verification.

### Subscription

- `server/subscription/activation.ts`
  - Tandai trial converted setelah pembayaran berhasil.
  - Pertahankan sisa masa trial saat subscription dibeli.
- `server/subscription/expiry-reminders.ts`
  - Bedakan reminder trial dan paid subscription.
- `lib/subscription-policy.ts`
  - Menjadi satu sumber kebenaran entitlement web dan kiosk.

### Kiosk/pairing

- `lib/kiosk/device-pairings.ts`
  - Ekspos hardware hash/referensi pairing secara aman untuk trial request.
  - Jangan memblokir paid pairing karena history trial.
- `app/api/kiosk/device-pairings/route.ts`
  - Pertahankan pairing contract; tambahkan status trial hanya bila diperlukan tanpa merusak client lama.
- `lib/kiosk/server.ts`
  - Gunakan centralized subscription entitlement; tolak organisasi free/expired untuk sesi operasional.
- `app/api/kiosk/trials/*`
  - Status dan activation endpoint.

### Database

- Migration internal trial plan.
- Migration `trial_requests`, `trial_claims`, `trial_identifiers`, dan `trial_overrides`.
- Migration RPC submit/review/activate.
- Migration RLS dan indexes.
- Migration audit events bila tabel audit saat ini belum mencukupi.

### Flutter

- Trial request/pairing status screen.
- Polling lifecycle yang hanya aktif pada layar terkait.
- Immediate duplicate-device message.
- Approved activation dan bootstrap tanpa restart.
- Offline entitlement cache dan expiry screen.

---

## 19. Pengujian wajib

### Eligibility dan abuse

- Akun baru + device baru dapat membuat request pending.
- Device yang pernah trial langsung menerima `TRIAL_DEVICE_ALREADY_USED`.
- Email baru dengan device lama tetap ditolak berdasarkan riwayat hardware.
- Rekening payout lama memunculkan block/flag sesuai aturan.
- IP yang sama tidak otomatis menolak user sah.
- Penghapusan organisasi tidak menghapus history identifier.
- Manual override hanya berlaku untuk request yang ditentukan.

### Review

- User biasa tidak dapat approve/reject.
- Super Admin dapat request information, approve, reject, dan override.
- Approval mengulang hard-block check.
- Dua Super Admin yang approve bersamaan hanya menghasilkan satu approval/claim.
- Approval kedaluwarsa setelah 72 jam tanpa aktivasi.

### Activation

- Trial dimulai saat activation endpoint sukses, bukan saat signup/approval.
- `current_period_end` tepat 14 hari dari server activation time.
- Device limit menjadi 1.
- Flutter masuk landing page tanpa restart.
- Request aktivasi berulang bersifat idempotent.

### Subscription conversion

- Pembayaran saat trial menambahkan durasi dari akhir trial.
- Pembayaran setelah trial habis memulai masa aktif dari waktu pembayaran.
- Claim berubah menjadi converted.
- Reminder trial berhenti setelah pembayaran.

### Expiry dan offline

- Web terkunci tepat setelah `current_period_end` tanpa menunggu cron.
- Flutter tidak memulai sesi baru setelah expiry.
- Upload tertunda tetap berjalan.
- Device offline menggunakan cached expiry dengan grace maksimal 24 jam.
- Rollback jam device tidak memperpanjang trial tanpa batas.

### Regression

- Paid user tetap dapat pairing device yang dahulu pernah trial.
- Existing subscription, checkout, reminder, dan pairing flow tetap berjalan.
- Existing free organization tidak otomatis kehilangan 14 hari tanpa tindakan pengguna.
- Joining organization tidak membuat trial baru.

---

## 20. Rollout

### Tahap 1 - Database dan feature flag

- Tambahkan schema, RPC, RLS, audit, dan internal trial plan.
- Deploy dengan `PUBLIC_TRIAL_ENABLED=false`.
- Pastikan tidak mengubah perilaku pengguna yang ada.

### Tahap 2 - Internal testing

- Aktifkan hanya untuk allowlist akun internal.
- Uji Android tablet fisik, emulator, web user, dan Super Admin.
- Uji pembayaran sebelum/sesudah expiry.

### Tahap 3 - Limited public

- Buka request kepada jumlah pengguna terbatas.
- Semua request masih manual review.
- Catat alasan approval/rejection dan kasus support.

### Tahap 4 - Public launch

- Aktifkan trial request publik.
- Tetap gunakan automated hard-block + manual approval.
- Tampilkan SLA review maksimal 1 x 24 jam.
- Siapkan kill switch dan monitoring error.

### Tahap 5 - Evaluasi auto-approval

Setelah data cukup, request berisiko rendah dapat disetujui otomatis. Manual review tetap digunakan untuk request dengan risk signal atau identifier override.

---

## 21. Metrics

Catat funnel berikut:

```text
signup
organization_created
trial_request_started
trial_request_submitted
trial_auto_rejected
trial_approved
trial_rejected
trial_activated
first_device_sync
first_theme_configured
first_session_completed
first_print_completed
trial_converted
trial_expired
```

Dashboard internal minimal menampilkan:

- jumlah request pending;
- median waktu review;
- approval/rejection rate;
- duplicate-device rejection rate;
- activation rate setelah approval;
- conversion rate;
- waktu rata-rata menuju sesi/print pertama;
- support/override rate;
- estimasi biaya operasional per trial aktif.

---

## 22. Definition of done

Implementasi dianggap selesai apabila:

- Pengguna dapat mengajukan trial menggunakan satu device.
- Duplicate owner, hardware, dan rekening diperiksa server-side.
- Duplicate device langsung mendapat pesan tanpa masuk antrean manual.
- Super Admin dapat meninjau, meminta data, approve, reject, override, dan revoke.
- Trial baru dimulai saat device mengaktifkannya setelah approval.
- Flutter masuk ke kiosk tanpa restart setelah aktivasi.
- Trial aktif tepat 14 hari dan device limit tepat 1.
- Web dan Flutter mengunci sesi operasional ketika trial berakhir tanpa menghapus data.
- Pembelian subscription mempertahankan sisa trial.
- Paid pairing tidak diblokir oleh riwayat trial device.
- Reminder, audit log, rate limit, RLS, dan monitoring bekerja.
- Seluruh acceptance test dan regression test lulus.
