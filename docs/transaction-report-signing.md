# Digital signature laporan transaksi

Generate sertifikat self-signed sekali, lalu simpan file `.p12` di secret manager/deployment environment -- jangan commit sertifikat atau private key.

```sh
openssl req -x509 -newkey rsa:2048 -keyout poskart-report-key.pem -out poskart-report-cert.pem -days 3650 -nodes -subj "/CN=POSKART Transaction Reports/O=POSKART/C=ID"
openssl pkcs12 -export -out poskart-report-signing.p12 -inkey poskart-report-key.pem -in poskart-report-cert.pem -name "POSKART Transaction Reports"
base64 < poskart-report-signing.p12 | tr -d '\n'
```

Set environment variables berikut di Railway/Vercel/local `.env.local`:

```env

```

Alternatif local development: gunakan `REPORT_SIGNING_P12_PATH` yang menunjuk ke file `.p12` di mesin lokal. Sertifikat self-signed membuat integritas PDF dapat diverifikasi, tetapi Adobe Acrobat akan menampilkan penerbit sebagai belum dipercaya. Ganti `REPORT_SIGNING_P12_BASE64` dengan sertifikat CA `.p12/.pfx` untuk penerbit terpercaya.
