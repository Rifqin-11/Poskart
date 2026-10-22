# Self-service trial

Trial Starter aktif langsung selama 14 hari dengan 1 device. Tidak ada antrean approval atau aktivasi dari kiosk.

## Aturan

- Hanya owner organisasi dengan email Auth terverifikasi yang boleh memulai.
- Organisasi, email (trim + lowercase), dan profil owner hanya boleh mengaktifkan trial sekali. Mengganti owner, email profil, atau membuat organisasi baru tidak menghapus riwayat yang cocok.
- Email diambil dari `auth.users`, bukan email bisnis yang dapat diedit.
- Riwayat trial lama yang sudah expired, converted, atau revoked tetap dihitung. Request lama yang belum pernah diaktifkan dapat dilanjutkan langsung melalui tombol Mulai Trial.
- Trial yang berakhir/dicabut tidak dapat diajukan ulang. Menghapus akun/organisasi tidak menghapus identifier pemakaian.
- Hardware/rekening bukan syarat approval atau pemblokiran pada alur baru. Riwayat lama tetap disimpan.
- Batas email bukan identitas orang: akun dengan email dan organisasi berbeda masih memerlukan pemantauan abuse oleh superadmin.

## Pencabutan

Di superadmin → **Trial Organisasi**, gunakan **Cabut Trial** dan masukkan alasan 5–1000 karakter. Alasan terlihat oleh owner dan tersimpan bersama waktu/admin pencabutan.

Pencabutan mengubah claim menjadi `revoked`, request menjadi `canceled`, dan subscription trial menjadi Free dalam satu transaksi. Data organisasi tidak dihapus. Identifier tetap tersimpan. Paket berbayar tidak dapat dicabut melalui aksi ini; pembelian paket mengubah claim aktif menjadi `converted`.

Aktivasi, pencabutan, dan rekonsiliasi pembayaran memakai lock subscription organisasi yang sama. Unique identifier serta lock owner/email mencegah pengambilan trial ganda. Retry aktivasi tidak memperpanjang masa trial.

## Deployment

Terapkan `supabase/migrations/20261022090000_self_service_trials.sql` sebelum deploy aplikasi baru. Migration mem-backfill identifier dari histori, memperbaiki kolom audit agar dapat bertahan setelah penghapusan akun/organisasi, dan menutup jalur approval lama. Tidak ada migration yang dijalankan otomatis oleh perubahan kode ini.

## Pengujian

Tanpa database:

```sh
node --test scripts/test-self-service-trials.mjs scripts/test-operational-subscription.mjs scripts/test-subscription-payments.mjs
```

Pengujian SQL menggunakan PostgreSQL/WASM terisolasi, tidak terhubung ke Supabase:

```sh
npm install --prefix /path/to/temporary-directory --no-package-lock --ignore-scripts @electric-sql/pglite
PGLITE_MODULE=/path/to/temporary-directory/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/test-self-service-trials-db.mjs
```

PGlite menguji transaksi, grants, constraints, backfill, expiry, revocation, conversion, dan penghapusan. Uji contention multi-koneksi dan smoke test UI tetap perlu dilakukan di staging PostgreSQL sebelum production.
