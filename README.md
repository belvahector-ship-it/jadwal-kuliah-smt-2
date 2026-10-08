# Kuliah S2 MTI 48 — Jadwal, Link Kelas, Tugas & Pengingat

Web statis pribadi untuk semester **2026-2027 Ganjil** (S2 MTI 48 Reg). Tanpa backend dan tanpa build step: cukup HTML, CSS, dan JavaScript.

## Fitur

- **Beranda**: kartu kelas yang sedang berlangsung atau kelas berikutnya, dengan hitung mundur dan tombol *Masuk Zoom/Meet*. Tombolnya berdenyut 15 menit sebelum kelas mulai.
- **Jadwal**: tampilan mingguan dan detail tiap mata kuliah (kode, SKS, dosen, dan link Google Meet yang bisa disalin sekali klik).
- **Tugas**: tambah, edit, hapus, dan centang selesai. Ada filter status dan mata kuliah, serta label *Terlambat / Hari ini / Besok*.
- **Pengingat**:
  - Notifikasi browser sebelum kelas (5–60 menit) dan menjelang deadline (H-1 dan 3 jam). Hanya jalan selama web terbuka.
  - Ekspor **.ics** untuk Google Calendar atau Apple Calendar. Pengingatnya tetap masuk ke HP walaupun web ditutup.
- Cadangan tugas (ekspor/impor JSON), mode gelap, bisa di-install di HP (PWA), dan tetap bisa dibuka saat offline.

## Mengubah data

Semua jadwal, link, dan dosen ada di **`data.js`**. Ubah, commit, lalu push. Tugas disimpan di `localStorage` browser, jadi tidak ikut tersimpan di repo.

## Struktur

```
index.html            halaman utama (4 tab)
style.css             tampilan (tema terang/gelap)
app.js                logika: jadwal, tugas, notifikasi, ekspor .ics
data.js               data mata kuliah ← edit di sini
sw.js                 service worker (offline + klik notifikasi)
manifest.webmanifest  supaya bisa di-install sebagai aplikasi
icon.svg              ikon
```

## Coba di komputer

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Publish ke GitHub Pages

1. **Settings → General → Danger Zone → Change visibility → Public.**
2. **Settings → Pages**: pilih *Source: Deploy from a branch*, lalu *Branch: `main` / (root)*, dan simpan.
3. Tunggu 1–2 menit. Web aktif di **https://belvahector-ship-it.github.io/jadwal-kuliah-smt-2/**. Alamat ini bisa dipendekkan dengan shortlink sendiri.

Catatan privasi: link Zoom, passcode, dan PDF soal sengaja tidak dicantumkan karena repo ini publik.
