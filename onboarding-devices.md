# Rencana Onboarding Device POSKART

## 1. Ringkasan keputusan

Onboarding device POSKART menggunakan urutan berikut:

1. Pengguna memiliki subscription aktif atau trial aktif.
2. Pengguna mengunduh atau membuka aplikasi POSKART Device pada tablet.
3. Pengguna login di aplikasi menggunakan akun yang memiliki akses ke organisasi.
4. Jika physical device belum pernah terdaftar, Flutter menampilkan pairing code.
5. Owner atau admin memasukkan pairing code tersebut pada halaman **Devices** di web.
6. Server membuat device secara atomik menggunakan hardware ID dari tablet dan konfigurasi awal yang aman.
7. Flutter mendeteksi pairing dalam sekitar 1–3 detik, mengambil bootstrap, lalu melanjutkan ke aplikasi tanpa perlu force close atau login ulang.
8. Web membuka konfigurasi device dan memperlihatkan progres sampai device telah melakukan sync pertama.
9. Setelah theme, frame, akses sesi, payment, dan printer diperiksa, device berstatus **Ready**.

Pairing code selalu dibuat oleh aplikasi Flutter, bukan oleh web. Web hanya digunakan untuk mengklaim dan mengonfigurasi device.

---

## 2. Masalah yang diselesaikan

Alur sekarang secara teknis sudah memiliki pairing, tetapi pengguna baru belum memperoleh petunjuk yang cukup mengenai urutannya. Setelah berlangganan, pengguna dapat membuka halaman Devices dan hanya melihat input pairing code tanpa memahami bahwa:

- aplikasi POSKART Device harus dibuka lebih dahulu;
- pengguna harus login di tablet;
- kode berasal dari tablet;
- kode hanya berlaku sementara;
- setelah pairing masih ada konfigurasi yang harus diperiksa;
- device belum dianggap siap hanya karena row device sudah muncul di web.

Akibatnya, pengguna dapat menganggap bahwa web seharusnya membuat kode, pairing sedang rusak, atau subscription belum aktif.

Dokumen ini memisahkan tiga status yang saat ini mudah tercampur:

```text
Paired       = physical device sudah dikaitkan ke organisasi
Synced       = Flutter sudah menerima bootstrap/config terbaru
Ready        = konfigurasi operasional minimum sudah lengkap
```

---

## 3. Tujuan

- Membuat pengguna memahami urutan setup tanpa perlu membaca dokumentasi panjang.
- Mengarahkan pengguna dari pembayaran berhasil sampai device pertama siap digunakan.
- Mempertahankan pairing yang aman berbasis hardware ID.
- Membuat pairing terasa realtime tanpa WebSocket atau Supabase Realtime.
- Menghindari kebutuhan force close setelah kode dimasukkan.
- Menampilkan progres yang sama di Dashboard, Devices, dan Flutter.
- Memakai alur yang sama untuk subscription berbayar dan trial aktif.
- Tidak mengubah device yang sudah pernah dipair agar login ulang tetap langsung masuk menggunakan cache lalu sync.

## 4. Bukan bagian dari implementasi ini

- Mengganti mekanisme pairing menjadi QR pairing.
- Membuka Supabase langsung ke Flutter.
- Menggunakan WebSocket atau Supabase Realtime hanya untuk pairing.
- Mengubah format hardware ID yang sudah digunakan.
- Memaksa printer terhubung sebelum pengguna dapat membuka landing page kiosk.
- Menghapus konfigurasi default yang membuat device dapat masuk segera setelah pairing.
- Menjalankan tutorial overlay panjang saat pengguna hanya membutuhkan instruksi setup.

---

## 5. Prinsip UX

### 5.1 Instruksi harus muncul pada saat dibutuhkan

Pengguna baru harus melihat panduan setup langsung pada:

- halaman pembayaran berhasil;
- Dashboard selama belum ada device siap;
- empty state halaman Devices;
- dialog Add device;
- layar pairing Flutter.

Dokumentasi tetap tersedia sebagai bantuan tambahan, tetapi tidak menjadi satu-satunya sumber petunjuk.

### 5.2 Gunakan checklist, bukan tour overlay

Setup device merupakan proses lintas web dan tablet. Karena pengguna harus berpindah perangkat, tour overlay mudah terputus dan tidak cocok sebagai panduan utama.

Gunakan checklist persisten dengan status nyata dari server. Tour Devices yang sudah ada tetap dapat digunakan untuk menjelaskan halaman setelah device berhasil ditambahkan.

### 5.3 Jangan menandai selesai terlalu cepat

Memasukkan pairing code belum berarti setup selesai. Tahap dinyatakan selesai hanya setelah Flutter menerima konfigurasi dan mengirim heartbeat/sync pertama.

### 5.4 Satu CTA utama per tahap

Contoh:

- Belum install aplikasi: **Download POSKART Device**.
- Aplikasi sudah menampilkan kode: **Masukkan pairing code**.
- Pairing selesai tetapi konfigurasi belum lengkap: **Konfigurasi device**.
- Konfigurasi selesai tetapi belum sync: **Tunggu device melakukan sync**.
- Device siap: **Jalankan test session**.

---

## 6. Alur end-to-end

```text
Pembayaran atau trial aktif
        |
        v
CTA "Siapkan device pertama"
        |
        v
Halaman Devices menampilkan checklist setup
        |
        v
Install/buka POSKART Device pada tablet
        |
        v
Login ke organisasi yang sama
        |
        |-- Hardware ID sudah terdaftar --> cache + bootstrap --> landing kiosk
        |
        `-- Hardware ID baru
                 |
                 v
        Flutter membuat pairing code
                 |
                 v
        Owner/admin memasukkan code di web
                 |
                 v
        Server memvalidasi code + organisasi + limit + hardware ID
                 |
                 v
        Device dibuat secara atomik dengan konfigurasi minimum
                 |
                 |-------------------------------|
                 |                               |
                 v                               v
        Flutter polling status            Web membuka Configure
                 |                               |
                 v                               v
        Bootstrap + cache config        Admin melengkapi config
                 |                               |
                 `---------------|---------------'
                                 v
                       Heartbeat/sync pertama
                                 |
                                 v
                           Device Ready
                                 |
                                 v
                         Jalankan test session
```

---

## 7. Pengalaman setelah pembayaran berhasil

### 7.1 Status pembayaran harus menjadi sumber kebenaran

CTA onboarding hanya ditampilkan sebagai aktif setelah server memastikan subscription sudah `active` atau `trialing`. Query string dari payment popup tidak boleh menjadi satu-satunya bukti pembayaran berhasil.

Jika callback payment gateway belum diterima, halaman return menampilkan:

> Pembayaran sedang dikonfirmasi. Halaman ini akan diperbarui otomatis.

Halaman dapat mengecek status order dalam interval pendek dengan batas waktu. Setelah subscription aktif, tampilkan success state dan CTA utama:

> Subscription aktif. Sekarang hubungkan tablet pertama Anda ke POSKART.

Button:

```text
Siapkan device pertama -> /devices?setup=first-device
```

CTA sekunder:

```text
Kembali ke Dashboard -> /dashboard
```

### 7.2 Jangan langsung membuka modal input code

Redirect ke Devices harus membuka mode onboarding, tetapi tidak langsung memaksa modal input code. Pengguna harus melihat urutan install, login, dan mengambil code terlebih dahulu.

---

## 8. Checklist setup pada Dashboard

Selama belum ada device berstatus Ready, Dashboard menampilkan card **Selesaikan setup POSKART**.

Checklist:

1. Subscription atau trial aktif.
2. Buka dan login ke aplikasi POSKART Device.
3. Hubungkan device menggunakan pairing code.
4. Pilih theme dan frame.
5. Atur akses sesi dan metode pembayaran.
6. Periksa printer.
7. Jalankan test session.

Status checklist tidak boleh hanya disimpan sebagai boolean dari UI. Status harus dihitung dari sumber data sebenarnya.

Contoh CTA dinamis:

```text
Belum ada pairing request  -> Buka panduan device
Pairing request tersedia   -> Masukkan pairing code
Device sudah dipair        -> Konfigurasi device
Menunggu sync              -> Lihat status sync
Device ready               -> Jalankan test session
```

Card tidak perlu tampil lagi setelah organisasi memiliki minimal satu device Ready. Menu profile atau halaman Devices tetap menyediakan **Panduan setup device** agar panduan dapat dibuka kembali.

---

## 9. Empty state halaman Devices

Jika organisasi belum memiliki device, ganti empty state sederhana menjadi panel onboarding yang menjelaskan urutan setup.

### 9.1 Isi utama

Judul:

> Hubungkan tablet pertama Anda

Deskripsi:

> Pairing code dibuat di aplikasi POSKART Device setelah Anda login. Buka aplikasi di tablet terlebih dahulu, lalu masukkan kode yang muncul ke halaman ini.

Langkah:

```text
1. Download atau buka POSKART Device di tablet.
2. Login menggunakan akun organisasi ini.
3. Salin pairing code yang tampil selama 10 menit.
4. Masukkan code di web dan lanjutkan konfigurasi.
```

CTA utama:

```text
Masukkan pairing code
```

CTA sekunder:

```text
Download aplikasi
Cara mendapatkan code
```

Tambahkan QR download jika URL distribusi aplikasi sudah stabil. QR download tidak boleh disamakan dengan pairing QR.

### 9.2 Device tambahan

Jika organisasi sudah memiliki device, tombol **Add device** tetap ringkas. Dialognya tetap menyertakan kalimat:

> Kode dibuat di tablet baru setelah login ke POSKART Device.

Tidak perlu menampilkan ulang seluruh empty-state wizard.

---

## 10. Dialog pairing pada web

### 10.1 Konten

Judul:

> Masukkan pairing code dari tablet

Deskripsi:

> Buka POSKART Device, login, lalu masukkan kode 8 karakter yang tampil. Kode berlaku selama 10 menit.

Input:

- uppercase otomatis;
- karakter selain alfanumerik dihapus;
- font monospace;
- mendukung paste;
- tombol submit nonaktif sebelum panjang minimum terpenuhi;
- loading state tidak menghapus code yang sedang diperiksa.

Action:

```text
Batal
Hubungkan device
```

Link bantuan:

```text
Belum melihat code di tablet?
```

### 10.2 Setelah code valid

Web melakukan hal berikut:

1. Memvalidasi code, expiry, organisasi, hardware ID, role, dan device limit.
2. Membuat device menggunakan konfigurasi minimum melalui transaksi database yang sudah ada.
3. Menutup dialog pairing.
4. Membuka Configure Booth untuk device yang baru dibuat.
5. Memperlihatkan banner bahwa tablet sedang mengambil konfigurasi.

Contoh banner:

> Device berhasil dihubungkan. Lengkapi konfigurasi sambil POSKART Device mengambil data awal.

Membatalkan Configure Booth setelah pairing tidak boleh menghapus device. Device tetap dapat menggunakan konfigurasi default, tetapi web menandainya **Perlu dikonfigurasi**.

---

## 11. Layar pairing Flutter

### 11.1 Device baru

Setelah login berhasil dan server menyatakan hardware ID belum terdaftar, Flutter menampilkan layar pairing.

Konten utama:

- nama organisasi;
- pairing code;
- waktu kedaluwarsa;
- instruksi path `POSKART Web -> Devices -> Add device`;
- indikator menunggu approval;
- tombol membuat code baru;
- tombol logout.

Tambahkan status progres yang lebih eksplisit:

```text
Menunggu code dimasukkan di web
Device berhasil dihubungkan
Mengunduh konfigurasi
Menyiapkan aset awal
POSKART siap digunakan
```

### 11.2 Setelah pairing diklaim

Polling dua detik hanya berjalan ketika layar pairing terbuka. Setelah status `configured`:

1. Poller dihentikan.
2. Flutter menjalankan `completeDevicePairing(hardwareId)`.
3. Auth/device state diperbarui.
4. Bootstrap diambil.
5. Konfigurasi dan aset minimum disimpan ke cache.
6. Flutter masuk ke landing page tanpa restart aplikasi.

Jika bootstrap gagal karena gangguan sementara:

- jangan mengembalikan device ke status belum dipair;
- tampilkan retry otomatis dan button **Coba lagi**;
- simpan `deviceId` yang sudah diperoleh;
- jika cache minimum tersedia, lanjutkan menggunakan cache;
- kirim error telemetry tanpa menampilkan stack trace kepada pengguna.

### 11.3 Login ulang device terdaftar

Pada login berikutnya:

1. Flutter mengirim hardware ID.
2. Server menemukan device di organisasi yang sesuai.
3. Flutter melewati pairing screen.
4. App membuka cache lebih dahulu lalu sync konfigurasi terbaru.

Device terdaftar yang sedang offline tetap dapat masuk menggunakan cache. Device baru yang belum pernah dipair tidak dapat mengaktifkan kiosk secara offline.

---

## 12. Configure Booth pertama

Konfigurasi pertama tetap menggunakan modal Configure Booth yang sudah ada.

Urutan yang direkomendasikan:

1. **General**
   - nama device;
   - lokasi;
   - theme/layout;
   - pricing atau event;
   - payment dan voucher.
2. **Frame**
   - frame yang tersedia;
   - category frame bila digunakan.
3. **System**
   - PIN Settings;
   - timer;
   - printer dan tuning;
   - pengaturan sistem lain.

Sediakan preset **Gunakan konfigurasi default** agar pengguna dapat menyelesaikan onboarding dengan cepat. Pengguna tetap dapat mengubahnya kemudian.

Setelah Save:

- update konfigurasi device;
- trigger invalidasi cache/query web;
- tunggu heartbeat atau `last_sync` baru dari Flutter;
- tampilkan progres `Menyimpan -> Menunggu sync -> Ready`;
- jangan menganggap Ready hanya karena server action Save berhasil.

---

## 13. Definisi status onboarding

### 13.1 Subscription Ready

Bernilai true ketika entitlement organisasi memperbolehkan operasional:

```text
subscriptions.status in ('active', 'trialing')
AND current_period_end > now()
```

### 13.2 App Opened

Bernilai true ketika terdapat pairing request aktif untuk organisasi. Ini berarti aplikasi telah login dan meminta code.

### 13.3 Device Paired

Bernilai true ketika:

```text
devices.hardware_id tersedia
AND device_pairings.status = 'configured'
AND device_pairings.device_id = devices.id
```

### 13.4 Device Configured

Bernilai true jika konfigurasi minimum tersedia:

- device memiliki layout/theme aktif;
- minimal satu frame ditugaskan;
- minimal satu pricing product atau event ditugaskan;
- metode akses sesi valid;
- konfigurasi payment konsisten dengan metode sesi.

Printer tidak menjadi hard requirement karena beberapa operator dapat menjalankan mode digital-only. Jika paket memerlukan print, printer menjadi requirement untuk status Ready.

### 13.5 Device Synced

Bernilai true ketika device telah mengirim heartbeat atau sync setelah `updated_at` konfigurasi terakhir.

Gunakan timestamp server, bukan perbandingan string lokal:

```text
last_sync_at >= configuration_updated_at
```

### 13.6 Device Ready

```text
subscriptionReady
AND devicePaired
AND deviceConfigured
AND deviceSynced
AND device is not revoked/deleted
```

---

## 14. Sumber data dan penyimpanan

### 14.1 Gunakan tabel yang sudah ada

Status utama dapat diturunkan dari:

- `subscriptions`;
- `device_pairings`;
- `devices`;
- assignment theme/layout;
- assignment frame;
- assignment pricing/event;
- heartbeat atau last sync device.

Jangan menyimpan duplicate boolean seperti `is_paired` atau `has_theme` jika nilainya dapat dihitung dari relasi canonical.

### 14.2 State UI opsional

Jika diperlukan untuk menyimpan posisi checklist atau dismissal lintas user, tambahkan tabel ringan:

```sql
create table public.organization_onboarding_state (
  organization_id text primary key
    references public.organizations(id) on delete cascade,
  flow_key text not null default 'first-device',
  last_step text,
  dismissed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Tabel ini hanya menyimpan preferensi UI. Status pairing, sync, dan Ready tetap dihitung dari data operasional.

Untuk implementasi awal, tabel baru dapat dihindari. Checklist cukup hilang otomatis ketika minimal satu device Ready.

---

## 15. Endpoint dan server contract

### 15.1 Endpoint yang dipertahankan

```text
POST   /api/kiosk/device-pairings
GET    /api/kiosk/device-pairings
DELETE /api/kiosk/device-pairings
```

Endpoint tersebut tetap diakses Flutter melalui Bearer auth dan tidak membuka tabel Supabase langsung ke aplikasi.

### 15.2 Endpoint onboarding web

Tambahkan endpoint/query server internal untuk merangkum status setup:

```text
GET /api/admin/onboarding/device-setup
```

Contoh response:

```json
{
  "subscription": {
    "status": "active",
    "ready": true
  },
  "firstDevice": {
    "id": "BTH-123",
    "pairingStatus": "configured",
    "configurationStatus": "incomplete",
    "syncStatus": "waiting",
    "ready": false
  },
  "currentStep": "configure-device",
  "steps": [
    { "key": "subscription", "complete": true },
    { "key": "open-app", "complete": true },
    { "key": "pair-device", "complete": true },
    { "key": "configure-device", "complete": false },
    { "key": "first-sync", "complete": false },
    { "key": "test-session", "complete": false }
  ]
}
```

Endpoint harus memakai organisasi dari session server, bukan menerima `organizationId` bebas dari client.

### 15.3 Status pairing response Flutter

Pertahankan field inti yang sudah ada:

```json
{
  "id": "pairing-uuid",
  "status": "pending",
  "expiresAt": "2026-08-02T10:00:00.000Z",
  "deviceId": null
}
```

Saat configured:

```json
{
  "id": "pairing-uuid",
  "status": "configured",
  "expiresAt": "2026-08-02T10:00:00.000Z",
  "deviceId": "BTH-123"
}
```

---

## 16. Copy yang digunakan

### 16.1 Checkout success

```text
Subscription aktif
Sekarang hubungkan tablet pertama Anda agar POSKART siap digunakan.

[Siapkan device pertama]
[Kembali ke Dashboard]
```

### 16.2 Devices empty state

```text
Hubungkan tablet pertama Anda

Pairing code dibuat di aplikasi POSKART Device setelah Anda login.
Buka aplikasi di tablet terlebih dahulu, lalu masukkan kode yang muncul ke sini.

[Masukkan pairing code]
[Download aplikasi]
```

### 16.3 Pairing dialog

```text
Masukkan pairing code dari tablet

Buka POSKART Device, login, lalu masukkan kode 8 karakter yang tampil.
Kode berlaku selama 10 menit.

[Batal] [Hubungkan device]
```

### 16.4 Menunggu sync

```text
Device berhasil dihubungkan
POSKART Device sedang mengunduh konfigurasi awal. Jangan tutup aplikasi di tablet.
```

### 16.5 Ready

```text
Device siap digunakan
Konfigurasi sudah diterima oleh tablet. Jalankan satu test session sebelum digunakan pelanggan.

[Jalankan test session]
```

---

## 17. Error dan edge case

### 17.1 Subscription belum aktif

Web:

> Aktifkan subscription atau trial sebelum menambahkan device.

CTA menuju checkout atau request trial.

### 17.2 Device limit tercapai

> Seluruh slot device sudah digunakan. Tambah kapasitas subscription atau hapus device yang tidak digunakan.

Jangan menerima pairing code jika tidak ada slot.

### 17.3 Code salah atau kedaluwarsa

> Pairing code tidak ditemukan atau sudah kedaluwarsa. Buat code baru dari tablet lalu coba lagi.

Input tidak perlu dikosongkan otomatis agar pengguna dapat memperbaiki typo.

### 17.4 Code berasal dari organisasi lain

> Pairing code ini tidak dapat digunakan pada organisasi yang sedang aktif.

Jangan membocorkan nama atau data organisasi lain.

### 17.5 Device pernah terdaftar

Jika hardware ID sudah terdaftar di organisasi yang sama, Flutter tidak membuat pairing baru dan langsung login + sync.

Jika terdaftar pada organisasi lain:

> Device ini sudah terdaftar pada organisasi lain. Hubungi owner organisasi sebelumnya atau support untuk memindahkan device.

Pemindahan organisasi harus menggunakan flow khusus dan tidak dilakukan diam-diam oleh pairing.

### 17.6 Internet terputus saat pairing

- Flutter mempertahankan code yang sedang tampil.
- Polling menunggu koneksi kembali.
- Web menampilkan error yang dapat dicoba ulang.
- Pairing tetap mengikuti expiry server.
- Device baru belum dapat masuk kiosk secara offline.

### 17.7 Configure ditutup sebelum Save

- Device tidak dihapus.
- Flutter tetap dapat masuk menggunakan konfigurasi minimum.
- Web menampilkan badge **Perlu dikonfigurasi**.
- Checklist mengarahkan pengguna kembali ke Configure Booth.

### 17.8 Flutter sudah paired tetapi bootstrap gagal

- Jangan membuat pairing code baru.
- Simpan device ID hasil pairing.
- Retry bootstrap dengan backoff.
- Jika cache tersedia, buka cache.
- Tampilkan status **Terhubung, menunggu konfigurasi**.

---

## 18. Keamanan dan batas penggunaan

- Pairing code menggunakan alfabet tanpa karakter ambigu.
- Raw code tidak disimpan; server menyimpan hash.
- Masa berlaku 10 menit.
- Code sekali pakai.
- Claim dilakukan secara atomik menggunakan lock pada row pairing.
- Hanya owner dan admin yang dapat mengklaim pairing.
- Hardware ID yang sudah terdaftar tidak boleh dipindah organisasi otomatis.
- Regenerasi code dan percobaan validasi dibatasi.
- Device limit diperiksa kembali di server ketika claim, bukan hanya melalui button disabled.
- Organization ID berasal dari session auth.
- Error response tidak membocorkan hardware ID atau organisasi lain.
- Polling berhenti saat screen ditutup, pairing selesai, logout, atau code kedaluwarsa.

---

## 19. Analytics onboarding

Catat event produk berikut tanpa menyimpan pairing code mentah:

```text
subscription_activated
device_setup_opened
device_download_clicked
device_pairing_created
device_pairing_submitted
device_pairing_completed
device_configuration_saved
device_first_sync_completed
device_ready
device_test_session_completed
```

Metadata minimum:

- organization ID;
- actor user ID;
- device ID jika sudah ada;
- timestamp;
- source page;
- error code bila gagal.

Analytics digunakan untuk mengetahui langkah onboarding yang paling sering membuat pengguna berhenti.

---

## 20. Tahap implementasi

### Tahap 1 — Perjelas urutan setup

- Ubah checkout return success agar memiliki CTA **Siapkan device pertama**.
- Ganti empty state Devices dengan panduan install -> login -> code -> configure.
- Perbarui dialog Add device dengan copy yang menegaskan asal code.
- Tambahkan link download aplikasi dan bantuan.
- Pastikan redirect membawa `setup=first-device`.

### Tahap 2 — Checklist berbasis data nyata

- Buat server query status onboarding.
- Tambahkan card checklist pada Dashboard.
- Tambahkan status Paired, Synced, dan Ready pada Devices.
- Sembunyikan checklist setelah minimal satu device Ready.
- Izinkan panduan dibuka kembali dari Devices/profile menu.

### Tahap 3 — Handoff realtime Flutter

- Verifikasi polling hanya aktif pada pairing screen.
- Pastikan status `configured` langsung memanggil `completeDevicePairing`.
- Pastikan bootstrap selesai tanpa force close.
- Tambahkan progres pairing -> bootstrap -> asset minimum -> landing.
- Tambahkan retry yang tidak membuat pairing baru.

### Tahap 4 — First sync dan test session

- Bedakan timestamp update konfigurasi dan heartbeat device.
- Tampilkan status menunggu sync setelah Configure Save.
- Tandai Ready setelah konfigurasi terbaru diterima Flutter.
- Tambahkan CTA test session dan event completion.

### Tahap 5 — Observability dan optimasi

- Tambahkan analytics funnel onboarding.
- Tambahkan error code terstruktur untuk pairing/bootstrap.
- Ukur waktu dari code diklaim sampai landing Flutter.
- Ukur waktu dari Save sampai first sync.
- Tinjau pengguna yang berhenti pada setiap langkah.

---

## 21. File yang kemungkinan berubah saat implementasi

### Web Next.js

```text
features/billing/checkout/checkout-content.tsx
app/(root)/checkout/return/page.tsx
features/admin/dashboard/dashboard-overview.tsx
features/admin/devices/booth-management.tsx
features/admin/devices/use-devices.ts
features/admin/devices/api.ts
lib/i18n/dictionaries.ts
server/admin/actions/device-actions.ts
lib/kiosk/device-pairings.ts
```

Tambahkan modul onboarding tersendiri agar kalkulasi status tidak tersebar:

```text
server/onboarding/device-onboarding.ts
features/admin/onboarding/device-setup-card.tsx
features/admin/onboarding/api.ts
features/admin/onboarding/use-device-onboarding.ts
```

### Flutter

```text
lib/features/auth/device_pairing_screen.dart
lib/data/repositories/auth_repository.dart
lib/core/providers.dart
```

File auth state/notifier yang memiliki `completeDevicePairing()` juga harus diverifikasi agar transisi pairing -> bootstrap -> landing berlangsung dalam satu alur.

### Database

Tidak wajib menambah migration untuk Tahap 1. Migration hanya diperlukan jika state UI onboarding atau timestamp konfigurasi/sync yang lebih eksplisit belum tersedia.

---

## 22. Pengujian

### 22.1 Web

- Pembayaran sukses terverifikasi menampilkan CTA setup device.
- Pembayaran pending tidak membuka tools berbayar lebih awal.
- Empty state menjelaskan bahwa code berasal dari tablet.
- Pairing code valid membuka Configure Booth.
- Pairing code salah, expired, used, dan lintas organisasi ditolak dengan pesan tepat.
- Device limit tetap divalidasi di server.
- Menutup Configure tidak menghapus device.
- Checklist mengikuti data sebenarnya setelah refresh dan login dari browser lain.

### 22.2 Flutter

- Device baru menampilkan code setelah login.
- Polling berhenti ketika screen ditutup.
- Setelah code diklaim, app masuk tanpa restart.
- Bootstrap gagal sementara dapat retry tanpa code baru.
- Device terdaftar melewati pairing saat login ulang.
- Device terdaftar dapat masuk dari cache ketika offline.
- Device baru tidak dapat mengaktifkan kiosk secara offline.
- Code expired dan cancelled dapat diregenerasi.
- Login organisasi lain tidak dapat mengambil device yang sudah terdaftar.

### 22.3 End-to-end

1. Buat organisasi baru.
2. Aktifkan trial atau subscription.
3. Buka Flutter pada install baru.
4. Login dan dapatkan code.
5. Masukkan code di web.
6. Pastikan Flutter beralih tanpa force close maksimal dalam beberapa detik.
7. Save Configure Booth.
8. Pastikan status web berubah menjadi Synced/Ready setelah heartbeat.
9. Jalankan test session.
10. Login ulang dan pastikan pairing tidak muncul lagi.

---

## 23. Kriteria selesai

Implementasi dianggap selesai ketika:

- pengguna memahami bahwa pairing code berasal dari aplikasi Flutter;
- checkout success memiliki jalur langsung ke setup device;
- Dashboard dan Devices menampilkan langkah berikutnya secara konsisten;
- Flutter berpindah dari pairing ke landing tanpa restart;
- web membedakan Paired, Synced, dan Ready;
- device yang sudah terdaftar tidak diminta pairing ulang;
- mode offline untuk device yang sudah dipair tetap bekerja;
- tidak ada pembukaan akses operasional hanya karena query string payment;
- pairing tetap aman, sementara, sekali pakai, dan terikat organisasi;
- tidak ada regresi pada konfigurasi device, trial, subscription, atau cache Flutter.

---

## 24. Prioritas implementasi yang direkomendasikan

Jika implementasi dilakukan bertahap, mulai dari empat perubahan dengan dampak terbesar:

1. Checkout success CTA menuju onboarding device.
2. Empty state Devices yang menjelaskan install -> login -> pairing code.
3. Checklist setup persisten sampai first sync.
4. Handoff Flutter otomatis pairing -> bootstrap -> landing tanpa restart.

Empat perubahan tersebut menyelesaikan kebingungan utama tanpa mengganti fondasi pairing yang sudah berjalan.
