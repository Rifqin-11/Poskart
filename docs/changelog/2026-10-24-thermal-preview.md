# 2026-10-24 — Preview thermal (kiosk v2.8.1)

- Tambahkan preview thermal lokal pada konfigurasi printer perangkat di web.
- Tambahkan pengaturan manual Angkat bayangan (0–100), default 0/nonaktif.
- Sinkronkan pengaturan bayangan melalui pairing, bootstrap, dan API printer;
  payload kiosk lama mempertahankan nilai yang sudah tersimpan.
- Foto uji tidak diunggah; foto digital dan gallery tidak diubah.
- Terapkan migration `20261024130000_device_printer_shadow_lift.sql`
  sebelum deploy web/API yang menggunakan kolom baru.
- Migration thumbnail `20261018000100` dan `20261018000200` juga sudah
  diterapkan; RPC v1 tetap tersedia tanpa perubahan.

Preview web adalah simulasi browser. Preview kiosk mengikuti raster USB;
hasil fisik masih bergantung pada printer dan kertas.
