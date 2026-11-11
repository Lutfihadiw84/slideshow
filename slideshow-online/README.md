# Slideshow Online

Aplikasi web sederhana untuk menayangkan presentasi secara publik dan looping.

## Fitur
- Halaman admin dengan password.
- Upload PPTX, PDF, JPG, PNG, WEBP.
- Banyak gambar dapat dijadikan urutan slide.
- Durasi pergantian slide 2–120 detik.
- Looping otomatis.
- Halaman publik tanpa login: `/slide`.
- Tampilan layar penuh.

## Persyaratan server
- Node.js 18 atau lebih baru.
- LibreOffice terpasang di server untuk mengonversi PPTX ke PDF.
- HTTPS disarankan jika dipasang di internet.

## Menjalankan di komputer Windows (uji lokal)
1. Instal Node.js LTS.
2. Instal LibreOffice. Di Windows aplikasi mencoba lokasi default `C:\\Program Files\\LibreOffice\\program\\soffice.exe`; jika berbeda, isi `LIBREOFFICE_PATH` di file `.env`. Di Linux, aplikasi menggunakan perintah `libreoffice` kecuali `LIBREOFFICE_PATH` diatur.
3. Ekstrak ZIP ini.
4. Salin `.env.example` menjadi `.env`, lalu ubah password dan session secret.
5. Buka terminal pada folder proyek, jalankan `npm install`.
6. Jalankan `npm start`.
7. Buka `http://localhost:3000/admin` untuk login dan upload.
8. Halaman publik ada di `http://localhost:3000/slide`.

## Menjadikan publik
Deploy folder proyek ini ke VPS atau hosting Node.js yang mendukung aplikasi Express. Pasang domain dan HTTPS, lalu atur environment variables:
- `ADMIN_PASSWORD`: password admin yang kuat.
- `SESSION_SECRET`: string acak panjang.
- `PORT`: port yang disediakan hosting.

Pastikan folder `uploads/` dan `data/` dapat ditulis oleh aplikasi dan disimpan secara persisten. Jangan gunakan penyimpanan sementara/ephemeral karena file akan hilang saat server restart atau redeploy.

## Catatan penting
- File PPTX dikonversi oleh LibreOffice di server menjadi PDF. Efek animasi, transisi, video, font khusus, dan beberapa elemen PowerPoint mungkin tidak tampil persis sama.
- PDF ditampilkan dengan PDF.js dari CDN, jadi browser membutuhkan koneksi internet.
- File maksimum 100 MB per file.
- Untuk penggunaan organisasi/instansi, gunakan password kuat, HTTPS, backup, dan batasi akses admin.
- Aplikasi ini adalah starter project; belum memiliki multi-user, riwayat presentasi, atau penyimpanan cloud terkelola.
