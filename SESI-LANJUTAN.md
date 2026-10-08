# Catatan Serah Terima: Web Jadwal Kuliah S2 MTI 48

Ringkasan sesi cloud tanggal 8 Okt 2026, untuk dilanjutkan di sesi lokal (Claude Desktop atau Claude Code yang tersambung ke Chrome).

## Kesimpulan percakapan

**Tujuan**: web statis pribadi berisi jadwal kuliah, link kelas, tugas, dan pengingat untuk semester **2026-2027 Ganjil**, kelas **S2 MTI 48 Reg (P3148Reg)**, Magister Teknik Informatika UDINUS.

**Keputusan yang sudah diambil**
- Dipakai sendiri. Web statis (HTML/CSS/JS) tanpa backend dan tanpa build step.
- Hosting di **GitHub Pages dengan repo publik** (opsi B).
- Memakai **URL bawaan GitHub**, tanpa custom domain. Nanti dipendekkan sendiri lewat shortlink pribadi (sejenis s.id atau bit.ly).
- **Tidak mencantumkan** link Zoom, passcode Zoom, dan PDF soal tugas, karena repo publik. Link Google Meet tetap dicantumkan.
- Riwayat git sudah dibersihkan menjadi satu commit (`f519a0a`), jadi data Zoom dan PDF tidak ada lagi di riwayat.

**Fitur yang sudah jadi**
- **Beranda**: kelas yang sedang berlangsung atau berikutnya dengan hitung mundur dan tombol masuk kelas, daftar kelas hari ini, dan tugas terdekat.
- **Jadwal**: tampilan mingguan Senin–Sabtu dan kartu tiap mata kuliah (kode, SKS, dosen, link).
- **Tugas**:
  - Tambah, edit, hapus, centang selesai, dan filter. Disimpan di `localStorage`.
  - **Tugas bawaan** dari `data.js` beserta checklist langkah pengerjaan.
- **Pengingat**:
  - Notifikasi browser sebelum kelas (5–60 menit) dan menjelang deadline (H-1 dan 3 jam). Hanya jalan selama web terbuka.
  - Ekspor **.ics** untuk Google Calendar.
- Lainnya: cadangan JSON, tema terang/gelap, PWA (bisa di-install, jalan offline).

**Data mata kuliah** (semua 3 SKS, 19.00–21.30 WIB sesuai KRS)

| Hari | Mata kuliah | Kode | Platform |
|---|---|---|---|
| Selasa | Metodologi Penelitian | P31420101 | Zoom (link tidak dicantumkan) |
| Rabu | Kecerdasan Pendukung Pengambilan Keputusan | P31420303 | Google Meet |
| Kamis | Pengambilan Informasi | P31420201 | Google Meet |
| Jumat | Visi Komputer | P31420202 | Google Meet |

**Tugas yang sudah dimasukkan**
- **Tugas 1 Metodologi Penelitian**: diberikan Selasa 6 Okt 2026, deadline **Jumat 16 Okt 2026 pukul 23.59 WIB** (10 hari kalender). Laporan individu dalam bentuk PDF, 2.500–4.000 kata, dikumpulkan di LMS Kulino. Checklist 9 langkah ada di web.

## Status saat ini

- Kode final ada di branch **`main`**, sama dengan branch `ibelva/magical-mendel-6iak0v`.
- Repo `belvahector-ship-it/jadwal-kuliah-smt-2` **masih private**.
- **GitHub Pages belum aktif**, jadi situs belum online.

## Instruksi terakhir (untuk sesi lokal)

Pengguna sudah memberi izin penuh, termasuk memakai Chrome miliknya. Kerjakan berurutan:

1. **Jadikan repo publik**
   Buka https://github.com/belvahector-ship-it/jadwal-kuliah-smt-2/settings, lalu Danger Zone → *Change visibility* → **Public** → konfirmasi.
2. **Aktifkan GitHub Pages**
   Buka https://github.com/belvahector-ship-it/jadwal-kuliah-smt-2/settings/pages, lalu *Source*: **Deploy from a branch** → *Branch*: **`main`**, folder **`/ (root)`** → **Save**.
3. **Verifikasi** setelah 1–2 menit di **https://belvahector-ship-it.github.io/jadwal-kuliah-smt-2/**. Pastikan keempat tab tampil (Beranda, Jadwal, Tugas, Pengingat) dan Tugas 1 Metodologi Penelitian muncul.
4. Beri tahu pengguna URL tersebut supaya bisa dibuatkan shortlink.

Jangan menambahkan link Zoom, passcode, atau PDF soal ke repo, karena repo publik.

## Hal yang masih terbuka

- **Jam kelas**: undangan Meet Pengambilan Informasi tertulis 19.30, dan Zoom Metodologi Penelitian 19.15. Web saat ini memakai 19.00 sesuai KRS. Konfirmasi ke pengguna.
- **Dosen Metodologi Penelitian** belum diketahui (field `dosen` masih kosong di `data.js`).
- **Akhir semester** diasumsikan 31 Jan 2027 (`SEMESTER.akhir`). Ini dipakai untuk pengulangan jadwal di file .ics.
- **Link pengumpulan Kulino** untuk Tugas 1 masih "menyusul".
- Tawaran yang belum dijawab: membantu mengerjakan isi Tugas 1 (memilih topik, kerangka 6 bagian, mencari referensi). Tanyakan dulu format hasil yang diinginkan.

## Cara mengubah data

- Jadwal, link, dan dosen ada di `data.js` (array `MATKUL`).
- Tugas bawaan ada di `data.js` (array `TUGAS`). Naikkan `rev` kalau isi tugas diubah, supaya browser yang sudah pernah membuka web ikut memperbarui.
- Coba lokal dengan `python3 -m http.server 8000`, lalu buka http://localhost:8000.
- Push ke `main` otomatis memperbarui situs setelah Pages aktif.
