# Kuliah S2 MTI 48 — Jadwal, Kalender & Tugas

Web statis untuk semester **2026-2027 Ganjil** (S2 MTI 48 Reg). Tanpa backend dan tanpa build step: cukup HTML, CSS, dan JavaScript.

Halamannya **baca-saja**: pengunjung bisa membuka link kelas, menyalin link, mengunduh kalender, dan mengatur notifikasi di browsernya sendiri, tapi tidak bisa mencentang, menambah, atau mengubah isi apa pun.

## Tab

- **Beranda**: kelas yang sedang berlangsung atau berikutnya (beserta nomor pertemuan), hitung mundur, tombol *Masuk Google Meet*, kelas hari ini, dan tugas terdekat.
- **Jadwal**: jadwal mingguan dan kartu mata kuliah (kode, SKS, dosen, pertemuan berikutnya, tombol masuk/salin link).
- **Kalender**: kalender 2026 per bulan. Setiap hari kuliah dilingkari dengan warna mata kuliah, diberi label singkat dan nomor pertemuan (P1, P2, …). Pertemuan 1 dimulai 22 Sep 2026.
- **Tugas**: tugas dikelompokkan per mata kuliah, lengkap dengan deadline, keterangan, dan langkah pengerjaan.
- **Pengingat**: notifikasi browser sebelum kelas dan menjelang deadline, unduhan kalender **.ics**, dan pilihan tema: **Termux** (bawaan, gaya terminal hijau-hitam), Terang, Gelap, atau Ikuti perangkat.

## Mengubah data

Jadwal, link, dosen, dan tugas ada di **`data.js`** (array `MATKUL` dan `TUGAS`). Tanggal pertemuan 1 dan jumlah pertemuan diatur di `SEMESTER.mulai` dan `SEMESTER.pertemuan`. Kosongkan `deadline` tugas kalau belum diumumkan. Ubah, commit, lalu push. Situs ikut diperbarui otomatis.

## Struktur

```
index.html            halaman utama (5 tab)
style.css             tampilan (tema terang/gelap)
theme-termux.css      tema Termux (bawaan)
app.js                jadwal, kalender, tugas, notifikasi, ekspor .ics
data.js               data mata kuliah dan tugas ← edit di sini
sw.js                 service worker (offline + klik notifikasi)
manifest.webmanifest  supaya bisa di-install sebagai aplikasi
icon.svg              ikon
```

## Coba di komputer

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Situs: **https://belvahector-ship-it.github.io/jadwal-kuliah-smt-2/**

Catatan privasi: link Zoom, passcode, dan PDF soal sengaja tidak dicantumkan karena repo ini publik.
