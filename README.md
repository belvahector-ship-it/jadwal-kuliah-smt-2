# Kuliah S2 MTI 48 — Jadwal & Tugas

Web statis untuk semester **2026-2027 Ganjil** (S2 MTI 48 Reg). Tanpa backend dan tanpa build step: cukup HTML, CSS, dan JavaScript.

Halamannya **baca-saja**: pengunjung bisa masuk kelas lewat tombol link dan menyalin link, tapi tidak bisa mencentang, menambah, atau mengubah isi apa pun.

## Isi halaman

- **Kelas berikutnya** atau yang sedang berlangsung, dengan hitung mundur dan tombol *Masuk Google Meet*.
- **Hari ini**: daftar kelas hari ini beserta statusnya.
- **Mata kuliah & tugas**: kode, SKS, dosen, tombol masuk/salin link, dan di bawahnya tugas mata kuliah itu (deadline, keterangan, langkah pengerjaan).
- **Jadwal mingguan** Senin–Sabtu; tiap slot membuka link kelasnya.
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
