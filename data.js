// Data kuliah — edit file ini untuk mengubah jadwal, link kelas, atau dosen.
// hari: 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
// Semua jam dalam WIB (Asia/Jakarta).

const SEMESTER = {
  nama: '2026-2027 Ganjil',
  program: 'S2 MTI 48 Reg',
  kelas: 'P3148Reg',
  // Pertemuan 1 dimulai pada minggu ini (Selasa, 22 Sep 2026); tiap mata kuliah
  // mengikuti hari kuliahnya masing-masing, lalu berulang tiap minggu.
  mulai: '2026-09-22',
  // Jumlah pertemuan per mata kuliah (asumsi: 14 kuliah + UTS + UAS).
  pertemuan: 16,
};

const MATKUL = [
  {
    id: 'mp',
    inisial: 'MP', // label singkat di kalender
    nama: 'Metodologi Penelitian',
    kode: 'P31420101',
    sks: 3,
    hari: 2,
    mulai: '19:00',
    selesai: '21:30',
    dosen: [],
    platform: 'Zoom',
    // Link Zoom sengaja tidak dicantumkan (repo publik). Isi `link` kalau perlu.
    link: '',
    infoLink: 'Link Zoom & passcode dibagikan di grup kelas',
    warna: '#2f6fde',
  },
  {
    id: 'kppk',
    inisial: 'KPPK', // label singkat di kalender
    nama: 'Kecerdasan Pendukung Pengambilan Keputusan',
    singkat: 'KPPK',
    kode: 'P31420303',
    sks: 3,
    hari: 3,
    mulai: '19:00',
    selesai: '21:30',
    dosen: ['Dr. Abdul Syukur, M.M', 'Dr. Farrikh Al Zami, M.Kom'],
    platform: 'Google Meet',
    link: 'https://meet.google.com/ofc-zuuc-zoo',
    warna: '#0e9f8a',
  },
  {
    id: 'pi',
    inisial: 'PI', // label singkat di kalender
    nama: 'Pengambilan Informasi',
    kode: 'P31420201',
    sks: 3,
    hari: 4,
    mulai: '19:00',
    selesai: '21:30',
    dosen: ['Prof. Dr. Ir. Muljono, S.Si, M.Kom', 'Dr. Catur Supriyanto, S.Kom, M.CS'],
    platform: 'Google Meet',
    link: 'https://meet.google.com/eai-ddxp-zga',
    warna: '#8b5cf6',
  },
  {
    id: 'vk',
    inisial: 'VK', // label singkat di kalender
    nama: 'Visi Komputer',
    kode: 'P31420202',
    sks: 3,
    hari: 5,
    mulai: '19:00',
    selesai: '21:30',
    dosen: [
      'Prof. Dr. Pulung Nurtantio Andono, S.T., M.Kom.',
      'Dr. Ir. Ricardus Anggi Pramunendar, S.Kom, M.Cs',
    ],
    platform: 'Google Meet',
    link: 'https://meet.google.com/qin-vmum-uwy',
    warna: '#e8792b',
  },
];

// Tugas, dikelompokkan per mata kuliah. matkulId = id di MATKUL.
// mulai/deadline dalam WIB. deadline format: YYYY-MM-DDTHH:MM;
// kosongkan deadline kalau belum diumumkan (tampil "Deadline menyusul").
// Link: `links: [{ label, url }, ...]` untuk beberapa tombol, atau `link` + `linkLabel`.
const TUGAS = [
  {
    id: 'mp-tugas1',
    matkulId: 'mp',
    judul: 'Tugas 1: Masalah nyata → pernyataan riset (bahan Bab 1)',
    mulai: '2026-10-06',
    deadline: '2026-10-16T23:59', // 10 hari kalender setelah 6 Okt
    catatan: 'Individu · Laporan PDF 2.500–4.000 kata (di luar daftar pustaka).\n'
      + 'Bidang: Software Engineering / Data Mining / AI / Image Processing.\n'
      + 'Format: A4, Times New Roman 12, spasi 1,5, margin 3 cm. Sitasi Vancouver, ≥10 pustaka (≥8 jurnal/prosiding bereputasi).\n'
      + 'Soal lengkap: lihat Kulino / grup kelas.\n'
      + 'Kumpul di LMS Kulino (tautan menyusul) sebagai Tugas1_MetPen_NIM_Nama.pdf.\n'
      + 'Telat: −10%/hari, maks 3 hari. Similarity maks 20%.',
    langkah: [
      'Pilih masalah nyata + kumpulkan bukti & urgensi (300–500 kata)',
      'Solusi yang telah ada: ≥3 solusi bersumber + tingkat keberhasilannya',
      'Perspektif komputasi: input–proses–output + tabel ≥5 riset terdahulu (5 thn terakhir)',
      'Kritik satu solusi: kelebihan, keterbatasan berbukti, research gap eksplisit',
      '≥3 riset lain yang mendukung kritik & alasan gap masih terbuka',
      'Pernyataan riset: rumusan masalah, 1–3 pertanyaan, tujuan, pendekatan & metrik',
      'Sampul, daftar pustaka Vancouver, format penulisan',
      'Lampiran pengungkapan alat bantu AI + cek similarity ≤20%',
      'Unggah PDF ke Kulino (Tugas1_MetPen_NIM_Nama.pdf)',
    ],
  },
  {
    id: 'pi-tugas1',
    matkulId: 'pi',
    judul: 'Rangkuman paper → PPT → video presentasi',
    mulai: '2026-10-08',
    deadline: '2026-10-15T19:00', // dikumpulkan pertemuan depan (pertemuan 4)
    catatan: 'Bahan: paper yang disediakan Prof. Muljono (tombol "Bahan paper").\n'
      + 'Pengumpulan dan info lebih lanjut di LMS Kulino.',
    langkah: [
      'Rangkum salah satu paper yang disediakan Prof. Muljono',
      'Buat rangkuman tersebut menjadi file PPT',
      'Rekam video presentasi',
    ],
    links: [
      { label: 'Bahan paper', url: 'https://belv.lol/pi' },
      { label: 'Kulino', url: 'https://kulino.dinus.ac.id/' },
    ],
  },
];
