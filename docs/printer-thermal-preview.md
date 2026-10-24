# Preview thermal dan kontrol foto cetak (kiosk 2.9.0)

## Pemakaian

- Kiosk: **Settings → Printer → Penyesuaian hasil printer**. Pilih foto uji,
  lalu bandingkan foto digital dan raster USB 1-bit; tersedia perbesaran.
- Web: **Devices → Configure → System → Printer & output tuning**. Foto uji
  JPG/PNG diproses lokal di browser dan tidak diunggah. Kertas, gaya dan sharpness
  di panel simulasi tidak disinkronkan; samakan dengan kiosk.
- Tiga slider baru manual, rentang 0–100, default **0 (nonaktif)**:
  - **Haluskan latar gelap**: denoise terbatas di shadow dan kurva shadow floor;
    Photo Smooth memakai Bayer teratur di shadow untuk menghindari noise difusi.
  - **Kontras lokal (CLAHE)**: histogram lokal dengan clip limit dan interpolasi
    antartile. Dikurangi di shadow; terlalu tinggi tetap bisa menguatkan noise.
  - **Terangkan latar**: segmentasi orang dengan MediaPipe, lalu latar diangkat
    menuju putih. Periksa rambut, tepi baju dan foto grup di preview.
- Simpan konfigurasi web untuk menerapkannya ke kiosk. Tidak ada auto-levels,
  deteksi malam atau pengaktifan slider otomatis. Foto digital, softfile, gallery
  dan berkas asli tidak diubah. Tidak ada detail baru yang dapat dipulihkan dari
  area sumber yang memang hitam total.

## Foto vs frame

Cetakan sesi baru menyimpan PNG cetak netral beserta `.mask.png` dan `.base.png`
lokal. Dua render slot hitam/putih memakai layout, timestamp, rotasi, clipping,
opacity dan overlay yang sama; selisihnya menjadi mask kontribusi foto.
Kontribusi frame dipisahkan sebelum tone processing, lalu dikomposisikan kembali
tanpa penyesuaian. Pixel frame murni memakai threshold tajam, bukan dithering;
error diffusion foto tidak menyebar ke frame. **Density tetap global**.

Cetak ulang sesi baru di galeri pada perangkat yang sama memilih render melalui
pointer atomik `poskart_print_<session>_render.json` beserta mask lokal.
Pointer diterbitkan setelah render dan kedua sidecar lengkap; retake tidak
mencampurkan mask revisi sebelumnya dengan foto revisi baru. Metadata ini tidak
diunggah. Jika mask tidak tersedia (remote print, perangkat lain, sesi lama),
brightness/contrast/sharpness/A/B berlaku global seperti sebelumnya dan **C
dilewati**. Mask rusak menyebabkan error yang jelas, bukan penyesuaian global
diam-diam. Preview foto uji selalu memperlakukan seluruh gambar sebagai foto;
tidak menyimpulkan posisi slot dari JPG/PNG pilihan pengguna.

Segmentasi kiosk berjalan pada worker native CPU yang diserialkan, hanya bila
C > 0. Mask foto digunakan untuk menemukan area foto yang terlihat dan memotong
input inferensi per area. Overlay opak yang memisah slot dapat membagi area;
rotasi, occlusion berat dan foto grup tetap perlu diuji fisik. Jika inferensi
gagal, cetak/preview gagal dengan pesan untuk menonaktifkan C, bukan menghapus
latar orang secara diam-diam. Web melakukan inferensi satu kali per foto uji dan
meng-cache mask di memori; hasil lama tidak menimpa slider/foto yang lebih baru.

## Model dan browser runtime

Model yang sama dibundel di `assets/mediapipe/selfie_segmenter.tflite` (kiosk)
dan `public/mediapipe/selfie_segmenter.tflite` (web), 249.537 byte, SHA-256:
`191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b`.
Sumber: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite
Panduan/model card: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter

Web memakai `@mediapipe/tasks-vision` **0.10.35**, disalin ke public lokal oleh
`scripts/prepare-mediapipe.mjs` sebelum `npm run dev` / `npm run build`.
Folder WASM generated tidak di-commit; hindari menjalankan `next build` langsung
tanpa skrip persiapan. Tidak ada permintaan inferensi ke server atau CDN.

## Rollout dan kompatibilitas

1. Terapkan `20261024190000_device_photo_print_tuning.sql` **sebelum** deploy
   API/web baru karena proyeksi device menambahkan tiga kolom.
2. Deploy web/API, kemudian kiosk 2.9.0. Kolom/API `printer_shadow_lift` tetap
   tersedia untuk 2.8.1; tidak ada perubahan gallery API/RPC v1.
3. Migrasi SQL dan JSON lokal memindahkan nilai shadow lift lama ke A satu kali.
   Nilai 0 eksplisit pada field baru tidak pernah dikembalikan ke nilai lama.
   Payload kiosk lama tanpa field baru mempertahankan konfigurasi baru.
4. Cache job USB mencakup ketiga slider. Preview dan cetak memakai task raster
   yang sama. Driver printer sistem dapat menerapkan halftoning sendiri.

Jangan menandai migration sebagai applied atau mengulang migration payout hanya
untuk fitur ini. Panas printer, dot gain, kertas dan waktu inferensi tetap harus
diukur pada tablet/printer fisik; tidak ada jaminan waktu tambahan 300–500 ms.

## Validasi lokal

```sh
node --test scripts/test-thermal-preview.mjs scripts/test-device-mutations.mjs
npx tsc --noEmit
```

Di repo kiosk: `flutter analyze` dan `flutter test`. Tes mencakup frame yang
identik bit-per-bit saat kontrol foto diubah, mask layout nyata, noise sintetis,
default 0, migrasi nilai lama, dan inferensi preview lazy melalui mock channel.
