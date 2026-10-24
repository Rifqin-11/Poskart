# Preview thermal dan angkat bayangan manual

## Pemakaian

- Kiosk: **Settings → Printer → Penyesuaian hasil printer**. Pilih foto uji,
  lalu bandingkan foto digital dan raster thermal. Preview dapat diperbesar.
- Web: **Devices → Configure → System → Printer & output tuning**. Pilih
  JPG/PNG lokal untuk simulasi browser. Samakan kertas, gaya, dan ketajaman
  simulasi dengan kiosk; tiga kontrol simulasi tersebut tidak disinkronkan.
- Brightness, contrast, dot density, dan **Angkat bayangan** mengikuti nilai
  pada form. Simpan konfigurasi perangkat di web untuk menerapkannya ke kiosk.
- Angkat bayangan default **0 (nonaktif)**. Naikkan secara manual untuk membuat
  area gelap lebih ringan sebelum dithering. Tidak ada auto-levels, analisis
  histogram, deteksi malam, atau perubahan algoritma dithering otomatis.
- Pengaturan berlaku pada seluruh gambar yang dicetak: gunakan foto
  **berbingkai** untuk memeriksa pengaruhnya pada teks dan logo hitam juga.
  Kembalikan ke 0 jika pengaturan tidak cocok untuk event berikutnya.
- Preview tidak mengunggah foto uji. Foto digital, gallery, dan file asli
  tidak diubah. Bayangan yang tidak memiliki detail pada sumber tidak dapat
  dipulihkan; efek ini hanya mengurangi kepadatan hitam pada cetakan.

## Batas preview

Kiosk mengubah raster USB ESC/POS yang sebenarnya menjadi PNG 1-bit. Web
meniru tone curve, Atkinson/Bayer, dan ketajaman di browser; resampling browser
bisa sedikit berbeda. Driver printer sistem dapat memakai halftoning sendiri.
Panas printer, dot gain, dan jenis kertas tetap memerlukan satu uji cetak fisik.

## Urutan rollout

1. Terapkan `20261024130000_device_printer_shadow_lift.sql` **sebelum** deploy
   web/API baru (query device menambahkan kolom `printer_shadow_lift`).
2. Deploy web/API, kemudian kiosk baru. Kiosk lama mengabaikan kolom baru;
   payload API lama tanpa `shadowLift` mempertahankan nilai yang sudah ada.
3. Nilai per perangkat dipertahankan saat pairing, bootstrap, sync, dan antrean
   offline. Cache job USB mencakup nilai bayangan agar job lama tidak terpakai.

Migration gallery sebelumnya tidak diperlukan oleh fitur ini. Jangan menandai
migration sebagai applied atau menjalankan ulang migration payout yang sudah
diterapkan hanya untuk mengaktifkan preview.

## Validasi lokal

```sh
node --test scripts/test-thermal-preview.mjs scripts/test-device-mutations.mjs
```

Di repo kiosk:

```sh
flutter test test/printer_thermal_preview_test.dart
```
