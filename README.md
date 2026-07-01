# Museum Digital Batik Nusantara Berbasis AI 🏛️✨

Selamat datang di repository resmi **Museum Digital Batik Nusantara Berbasis Artificial Intelligence**. Proyek ini merevolusi website katalog batik statis tradisional menjadi pengalaman museum digital interaktif yang didukung oleh AI untuk mengenalkan kekayaan warisan budaya batik Indonesia kepada dunia.

---

## 🗺️ Struktur Folder Proyek

```
museum-digital-nasional/
├── index.html            (Halaman Utama / Landing Page)
├── explorer.html         (Galeri Tradisional: Cari & Filter Wilayah/Warna)
├── ai-center.html        (Pusat Fitur AI: Smart Search, Rekomendasi, Chatbot, Learning)
├── quiz.html             (Modul Evaluasi Wawasan: Game Kuis AI)
├── dashboard.html        (Dashboard AI & Analitik Aktivitas Pengunjung)
├── about.html            (Informasi Standardisasi Arsip Museum & Kontributor)
│
├── css/
│   ├── style.css         (Gaya global, token desain, navbar, footer, aksesibilitas)
│   ├── home.css          (Overrides halaman utama)
│   ├── explorer.css      (Gaya halaman pencarian galeri tradisonal)
│   ├── collection.css    (Gaya Similar Collection & list modal)
│   ├── ai.css            (Gaya chatbot, formulir rekomendasi, audio guide, skeleton)
│   ├── quiz.css          (Gaya matching game, feedback kuis, timer)
│   └── dashboard.css     (Gaya panel matriks & grafik SVG glowing)
│
├── js/
│   ├── data.js           (Sumber data lokal batik Nusantara)
│   ├── nav.js            (Orkestrasi navigasi header & mobile hamburger)
│   ├── colorblind.js     (Accessibility filter simulasi buta warna)
│   ├── modal.js          (Popup modal detail terintegrasi Similar Collection)
│   ├── explorer.js       (Logika filter traditional galeri)
│   ├── auth.js           (Sistem login demo & kelola favorit pengguna)
│   ├── admin.js          (Panel pengelolaan data/tambah batik bagi admin)
│   ├── main.js           (Entry point orchestrator web)
│   │
│   ├── smartsearch.js    (Logika AI Natural Language search)
│   ├── recommendation.js (Logika AI Recommendation questionnaire)
│   ├── similarity.js     (Algoritma hitung koefisien kemiripan motif)
│   ├── curator.js        (Logika obrolan chatbot asisten museum virtual)
│   ├── learning.js       (Logika modul studi & Audio Guide Web Speech)
│   └── quiz.js           (Logika game kuis kustom PG, B/S, & Menjodohkan)
│
├── model/
│   ├── batik.json        (Koleksi data batik terstruktur format JSON)
│   └── knowledge.json    (Basis pengetahuan FAQ untuk curator & quiz)
│
├── api/
│   └── gemini.js         (HTTP Client Gemini API)
│
└── assets/               (Ornamen visual & video latar hero)
```

---

## 🤖 6 Fitur Utama AI & Mekanisme Kerja

### 1. AI Smart Search
- **Fungsi**: Memungkinkan pencarian motif batik menggunakan bahasa alami percakapan sehari-hari.
- **Mekanisme**: Mengirimkan query ke model **Gemini 1.5 Flash** untuk dianalisis kecocokan semantiknya. Jika API Key kosong, sistem beralih ke pencocokan sinonim semantik offline (pembobotan kata kunci warna, daerah, konteks resmi/santai).

### 2. AI Recommendation
- **Fungsi**: Menganalisis preferensi busana batik terbaik berdasarkan input acara, budget, warna, motif, dan daerah asal.
- **Mekanisme**: Menghitung kecocokan menggunakan Gemini API untuk merangkum alasan kecocokan adat-budaya, atau menggunakan mesin rekomendasi lokal berbobot (Keraton vs Pesisir, Tulis vs Cap).

### 3. AI Curator Chatbot ("Ki Kurator Nusantara")
- **Fungsi**: Percakapan asisten museum virtual yang interaktif tentang asal, filosofi, sejarah motif batik, dan cara perawatan kain tradisional.
- **Mekanisme**: Membaca basis pengetahuan `knowledge.json` dan data katalog sebagai konteks prompt RAG (Retrieval-Augmented Generation) ke Gemini API.

### 4. Similar Collection
- **Fungsi**: Menghitung koefisien kemiripan antar-batik dan menyarankan motif serupa saat pengguna membuka detail batik.
- **Mekanisme**: Menggunakan rumus perhitungan jarak atribut visual (daerah, teknik, palet warna hex, tag subjek).

### 5. AI Learning & Audio Guide
- **Fungsi**: Modul edukasi terstruktur (ringkasan, filosofi, tips perawatan) dilengkapi **pembaca panduan audio (teks-ke-suara)** otomatis.
- **Mekanisme**: Memanfaatkan Web Speech Synthesis API browser lokal (bahasa Indonesia) dan menghasilkan fakta unik dinamis menggunakan Gemini.

### 6. AI Quiz
- **Fungsi**: Game kuis interaktif yang menghasilkan soal Pilihan Ganda, Benar/Salah, dan Menjodohkan (Matching Game) secara acak dari basis data.

---

## 🔒 Konfigurasi Kunci API Gemini yang Aman

Website ini berjalan penuh di sisi klien (Client-side HTML/JS) sehingga aman untuk di-hosting di **GitHub Pages**:
1. Dapatkan API Key Gemini secara gratis di [Google AI Studio](https://aistudio.google.com/).
2. Buka halaman **AI Center** pada website.
3. Masukkan API Key Anda pada widget banner yang disediakan.
4. Kunci disimpan dengan aman secara lokal di browser Anda (`localStorage`) dan **tidak akan pernah diunggah ke repositori GitHub**.

---

## 🚀 Cara Menjalankan di Visual Studio Code

1. Clone atau buka folder proyek ini di **Visual Studio Code**.
2. Instal ekstensi **Live Server** di VS Code jika belum memilikinya.
3. Klik kanan pada file `index.html` dan pilih **Open with Live Server** (atau klik tombol *Go Live* di sudut kanan bawah editor).
4. Browser default Anda akan terbuka secara otomatis pada alamat lokal `http://127.0.0.1:5500`.

---

## 🧪 Panduan Pengujian Fitur

1. **Uji Responsivitas**: Buka web lalu tekan `F12` (Developer Tools). Pilih simulasi HP/Tablet di pojok kiri atas dan pastikan semua navigasi & kartu di-render rapi dan tidak bertabrakan.
2. **Uji Simulasi Buta Warna**: Klik ikon garis tiga aksesibilitas di kiri atas navbar, pilih *Protanopia* atau *Tritanopia*, dan pastikan visual seluruh halaman berubah warna secara real-time.
3. **Uji AI Tanpa Kunci**: Masuk ke AI Center tanpa mengisi API Key. Jalankan Smart Search (contoh: "biru"), Recommendation, Curator Chat, dan Learning. Pastikan engine fallback offline berjalan lancar dan menampilkan data kecocokan lokal.
4. **Uji AI Dengan Kunci**: Isi API Key Gemini Anda di AI Center, lalu tanyakan hal bebas di AI Curator Chat (contoh: "Batik apa yang cocok untuk wisuda teknik elektro?"). AI akan merespons secara dinamis dengan kecerdasan kustom.
