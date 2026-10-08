# Kuliah S2 MTI 48 — Jadwal & Tugas

Web statis untuk semester **2026-2027 Ganjil** (S2 MTI 48 Reg). Tanpa backend dan tanpa build step: cukup HTML, CSS, dan JavaScript.

Halamannya **pasif**: hanya menampilkan informasi, tanpa tombol, form, atau link yang bisa diklik pengunjung.

## Isi halaman

- **Kelas berikutnya** atau yang sedang berlangsung, dengan hitung mundur.
- **Hari ini**: daftar kelas hari ini beserta statusnya.
- **Tugas**: tugas dari `data.js` dengan deadline, keterangan, dan langkah pengerjaan.
- **Jadwal mingguan** Senin–Sabtu.
- **Mata kuliah**: kode, SKS, dosen, platform, dan link kelas (ditampilkan sebagai teks).
- Mode gelap mengikuti pengaturan perangkat. Bisa di-install di HP (PWA) dan tetap bisa dibuka saat offline.

## Mengubah data

Jadwal, link, dosen, dan tugas ada di **`data.js`** (array `MATKUL` dan `TUGAS`). Ubah, commit, lalu push. Situs ikut diperbarui otomatis.

## Struktur

```
index.html            halaman utama
style.css             tampilan (tema terang/gelap)
app.js                menampilkan jadwal dan tugas
data.js               data mata kuliah dan tugas ← edit di sini
sw.js                 service worker (offline)
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
