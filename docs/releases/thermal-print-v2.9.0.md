# Thermal printing — v2.9.0

## Changelog

- Kiosk memisahkan photo slot dari artwork frame pada render cetak baru;
  brightness, contrast, sharpness, dan efek foto tidak mengubah piksel frame
  murni. Teks/logo frame memakai threshold tajam dan density tetap global.
- Tiga kontrol manual menggantikan Angkat bayangan: Haluskan latar gelap,
  Kontras lokal (CLAHE), dan Terangkan latar dengan segmentasi orang MediaPipe.
  Semua default 0; tidak ada auto-levels atau deteksi malam.
- Kontrol per perangkat tersedia di web admin dan kiosk, beserta preview
  thermal lokal. Foto uji tidak diunggah dan softfile tidak dimodifikasi.
- Cetak ulang lokal menggunakan metadata render yang terkait dengan revisi
  foto. Tanpa mask, penyesuaian tetap global dan segmentasi latar dilewati.
- API/kolom shadow lift lama dan gallery API/RPC v1 tetap tersedia.

## Deployment

1. Terapkan `20261024190000_device_photo_print_tuning.sql` sebelum deploy API.
2. Deploy admin/API dari `main`, tag `thermal-preview-v2.9.0`.
3. Publikasikan kiosk dengan tag `v2.9.0`; changelog aplikasi berada di
   `changelog/2.9.0.yaml` pada repo aplikasi.

Validasi lokal: 152 tes Flutter, analyze bersih, 19 tes Node, TypeScript,
build web, dan APK arm64 release berhasil. Signature APK lokal cocok dengan
produksi. Smoke test MediaPipe browser berhasil dengan aset lokal tanpa request
ke layanan eksternal. Uji printer/tablet fisik dan pengukuran latensi belum
dilakukan; jangan menganggap estimasi 300–500 ms sebagai hasil pengukuran.

Panduan konfigurasi, model, fallback dan kompatibilitas:
[`../printer-thermal-preview.md`](../printer-thermal-preview.md).
