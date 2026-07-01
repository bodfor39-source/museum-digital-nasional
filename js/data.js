/**
 * data.js — Sumber data terpusat koleksi motif batik Nusantara
 * Metadata sesuai standar CIDOC-CRM & Dublin Core
 * Berdasarkan data penelitian lapangan mahasiswa (tahap_1.xlsx)
 * Museum Digital Nasional Indonesia
 */

const BATIK_DATA = [
  {
    id: "mega-mendung",
    nama: "Mega Mendung",
    asal: "Cirebon, Jawa Barat",
    abad: "XVI",
    region: "jawa-barat",
    image: "img/mega-mendung.jpg",
    emoji: "🌧️",
    samples: [
      "img/samples/mega-mendung-1.jpg",
      "img/samples/mega-mendung-2.jpg",
      "img/samples/mega-mendung-3.jpg",
    ],
    ciriKhasMotif: "Gumpalan awan berarak di langit (awan mendung) yang disusun berlapis-lapis.",
    ciriKhas:
      "Bentuk awannya berbentuk lonjong, sedikit lancip, dan memanjang (berbeda dengan awan corak Tiongkok yang cenderung bulat). Diwarnai dengan teknik gradasi dari gelap ke terang hingga berlapis tujuh, umumnya menggunakan palet warna biru, merah tua, atau cokelat.",
    makna:
      "Mendung menahan hujan yang mendinginkan bumi. Mengajarkan tentang filosofi keteduhan, menahan amarah, menjaga kesabaran, dan tetap tenang meski berada dalam situasi yang serba sulit.",
    deskripsi:
      "Sebagai ikon batik pesisiran paling populer, Mega Mendung tidak hanya indah secara estetika tetapi juga kaya filosofi. Bentuk pergerakan awannya mencerminkan perjalanan hidup manusia yang terus bergerak namun dituntut untuk senantiasa bijak dan mendinginkan suasana.",
    colors: [
      { name: "Biru Indigo",  hex: "#1E3A8A" },
      { name: "Biru Langit",  hex: "#3B82F6" },
      { name: "Biru Muda",    hex: "#93C5FD" },
      { name: "Merah Tua",    hex: "#9B1C1C" },
      { name: "Coklat Soga",  hex: "#78350F" },
    ],
    // ── CIDOC-CRM ──────────────────────────────────────────────────────────
    cidoc: {
      // crm:E55_Type
      objectType: "Kain Batik",
      // crm:P45_consists_of
      medium: "Kain mori, malam (lilin batik), pewarna alami biru-indigo dan coklat soga",
      // crm:P32_used_general_technique
      technique: "Batik tulis",
      // crm:P43_has_dimension
      dimensions: "250 × 105 cm (perkiraan standar)",
      // crm:E12_Production
      production: {
        period: "Abad XVI",                          // crm:P4_has_time-span → E52_Time-Span
        place: "Cirebon, Jawa Barat",                // crm:P7_took_place_at → E53_Place
        actor: "Pengrajin Batik Cirebon",            // crm:P14_carried_out_by → E39_Actor
        actorType: "Komunitas pengrajin pesisir",    // crm:E55_Type (peran)
      },
      // crm:E53_Place
      currentLocation: "Museum Digital Nasional Indonesia",
      // crm:E42_Identifier
      accessionNumber: "MDN-2024-001",
      // crm:E55_Type — subjek tematik
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Pesisir",
        "Akulturasi Budaya Tionghoa-Jawa",
        "UNESCO Intangible Cultural Heritage",
      ],
      // dc:language
      language: "id",
      // dc:rights
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      // edm:dataProvider
      provider: "Museum Digital Nasional Indonesia",
      // crm:E13_Attribute_Assignment — peneliti yang mengidentifikasi
      kontributor: 5,
      contributors: [
        { nim: "2501020134", nama: "Anak Agung Pandji Cresna Arysudana" },
        { nim: "2301020082", nama: "Felin Ananda Wudi" },
        { nim: "2301020010", nama: "I Putu Raditya Jayadi Prayoga" },
        { nim: "2301020122", nama: "Yosuanry Simbolon" },
        { nim: "2301020035", nama: "I Putu Aldo Wikananda" },
      ],
    },
  },

  {
    id: "kawung-mataram",
    nama: "Kawung Mataram",
    asal: "Kesultanan Mataram, DI Yogyakarta / Jawa Tengah",
    abad: "XIII",
    region: "yogyakarta",
    image: "img/kawung.jpg",
    emoji: "⭕",
    samples: [
      "img/samples/kawung-1.jpg",
      "img/samples/kawung-2.jpg",
      "img/samples/kawung-3.jpg",
    ],
    ciriKhasMotif: "Empat bulatan lonjong atau oval yang menyilang berpusat pada satu titik sentral, menyerupai irisan buah aren atau kolang-kaling (buah kawung).",
    ciriKhas:
      "Polanya sangat geometris, simetris, dan disusun secara rapi berjajar. Mengutamakan keseimbangan dan proporsi yang sempurna antarsudut.",
    makna:
      "Menggambarkan empat arah mata angin (sedulur papat lima pancer). Filosofinya bermakna kesucian kemurnian hati, keadilan, kesempurnaan hidup, serta pengendalian hawa nafsu yang bertumpu pada kehendak Tuhan Yang Maha Esa.",
    deskripsi:
      "Kawung Mataram adalah salah satu motif tertua dalam sejarah batik Nusantara. Secara visual, motif ini terlihat sangat terstruktur dan rapi, mewakili tatanan alam semesta dan pedoman etika Jawa yang luhur.",
    colors: [
      { name: "Hitam Indigo", hex: "#1E1B4B" },
      { name: "Krem Sutra",   hex: "#FFFBEB" },
      { name: "Biru Tua",     hex: "#1E3A5F" },
      { name: "Emas Antik",   hex: "#D97706" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain mori, malam (lilin batik), pewarna soga coklat dan indigo",
      technique: "Batik tulis",
      dimensions: "250 × 105 cm (perkiraan standar)",
      production: {
        period: "Abad XIII",
        place: "Kesultanan Mataram, Jawa Tengah / DI Yogyakarta",
        actor: "Pengrajin Keraton Mataram",
        actorType: "Pengrajin keraton",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-002",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Keraton",
        "Seni Geometris Jawa",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 4,
      contributors: [
        { nim: "2301020002", nama: "Anak Agung Putu Gede Putra Buana" },
        { nim: "2301020026", nama: "I Kadek Darmayasa" },
        { nim: "2301020058", nama: "I Komang Indra Pramudita" },
        { nim: "2301020051", nama: "I Made Agus Wiswanegara" },
      ],
    },
  },

  {
    id: "gurdo-solo",
    nama: "Gurdo Solo",
    asal: "Surakarta (Solo), Jawa Tengah",
    abad: "XVII",
    region: "jawa-tengah",
    image: "img/gurdo-solo.jpg",
    emoji: "🦅",
    samples: [
      "img/samples/gurdo-solo-1.jpg",
    ],
    ciriKhasMotif: "Berbentuk burung Garuda (Gurdo) dengan kedua sayap yang membentang.",
    ciriKhas:
      "Menonjolkan ornamen sayap tunggal atau ganda, ekor, dan kepala burung Garuda. Biasanya menggunakan palet warna tradisional batik keraton, yakni warna cokelat kemerahan (sogan), putih, dan hitam.",
    makna:
      "Garuda dalam mitologi Hindu adalah kendaraan Dewa Wisnu yang melambangkan 'Burung Mentari'. Motif ini mengandung makna kewibawaan, kegagahan, kekuasaan, sifat melindungi, kecerdasan, dan keadilan.",
    deskripsi:
      "Gurdo merupakan bagian dari pusaka batik keraton Jawa. Pada zaman dahulu, tidak sembarang orang boleh mengenakannya karena batik ini mewakili status sosial tinggi dan keteladanan seorang pemimpin yang welas asih sekaligus tegas pelindung rakyatnya.",
    colors: [
      { name: "Soga Coklat",  hex: "#7C3F1E" },
      { name: "Krem Mori",    hex: "#FDF8EE" },
      { name: "Hitam Jelaga", hex: "#1C1917" },
      { name: "Merah Marun",  hex: "#7F1D1D" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain mori, malam (lilin batik), pewarna soga coklat-merah dan hitam",
      technique: "Batik tulis",
      dimensions: "250 × 105 cm (perkiraan standar)",
      production: {
        period: "Abad XVII",
        place: "Surakarta (Solo), Jawa Tengah",
        actor: "Pengrajin Keraton Surakarta",
        actorType: "Pengrajin keraton",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-003",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Keraton",
        "Simbolisme Garuda",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 2,
      contributors: [
        { nim: "2301020057", nama: "Angelina Calista Uran" },
        { nim: "2301020025", nama: "Dewa Gede Rama Andhika Putra" },
      ],
    },
  },

  {
    id: "merak-lasem",
    nama: "Merak Lasem",
    asal: "Lasem, Jawa Tengah",
    abad: "XIX",
    region: "jawa-tengah",
    image: "img/merak-lasem.jpg",
    emoji: "🦚",
    samples: [
      "img/samples/merak-lasem-1.jpg",
      "img/samples/merak-lasem-2.jpg",
      "img/samples/merak-lasem-3.jpg",
      "img/samples/merak-lasem-4.jpg",
      "img/samples/merak-lasem-5.jpg",
    ],
    ciriKhasMotif: "Burung merak oriental diselingi flora pesisiran berlatar merah darah ayam khas Lasem.",
    ciriKhas:
      "Menggambarkan keindahan fisik merak (khususnya bagian ekor) dan dipadukan dengan ciri khas batik Laseman — warna merah darah ayam khas Lasem atau yang biasa disebut abang biron — hasil akulturasi budaya Tionghoa dan Jawa, diselingi ornamen flora pesisiran (buketan) gaya oriental.",
    makna:
      "Merak dipandang sebagai simbol raja dari segala jenis burung. Maknanya adalah lambang keanggunan, kecantikan wanita, keteladanan hidup, keluhuran budi pekerti, dan perlindungan.",
    deskripsi:
      "Merak Lasem sangat kental dengan nilai pesisir yang terbuka akan masuknya kebudayaan luar. Motif ini menyajikan visual yang elegan sekaligus mewah, sering dikenakan untuk menunjukkan martabat dan feminisme para wanita yang menggunakannya.",
    colors: [
      { name: "Merah Darah Ayam", hex: "#B91C1C" },
      { name: "Hijau Zamrud",     hex: "#065F46" },
      { name: "Biru Tua",         hex: "#1E3A5F" },
      { name: "Krem Mori",        hex: "#FDF6E3" },
      { name: "Hitam Tinta",      hex: "#0F172A" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain mori, malam (lilin batik), pewarna merah abang biron khas Lasem",
      technique: "Batik tulis",
      dimensions: "250 × 105 cm (perkiraan standar)",
      production: {
        period: "Abad XIX",
        place: "Lasem, Jawa Tengah",
        actor: "Pengrajin Batik Lasem",
        actorType: "Komunitas pengrajin akulturasi Tionghoa-Jawa",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-004",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Pesisir",
        "Akulturasi Budaya Tionghoa-Jawa",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 6,
      contributors: [
        { nim: "2301020105", nama: "I Gusti Bagus Agung Sanjudhika Utama" },
        { nim: "2301020070", nama: "I Made Bagus Alit Pintara" },
        { nim: "2301020003", nama: "I Made Dwi Ferynanda" },
        { nim: "2301020006", nama: "I Made Sedana Yoga" },
        { nim: "2301020113", nama: "Kristantri Monika Rini" },
        { nim: "—",          nama: "I Gede Andika" },
      ],
    },
  },

  {
    id: "ceplok-gayo",
    nama: "Ceplok Gayo",
    asal: "Aceh",
    abad: "XX",
    region: "sumatera",
    image: "img/ceplok-gayo.jpg",
    emoji: "✦",
    samples: [
      "img/samples/ceplok-gayo-1.jpg",
      "img/samples/ceplok-gayo-2.jpg",
      "img/samples/ceplok-gayo-3.jpg",
    ],
    ciriKhasMotif: "Pola geometris simetris warna-warni berlatar hitam terinspirasi ukiran Kerawang Gayo",
    ciriKhas:
      "Berbentuk geometris dan simetris yang disusun secara berulang-ulang, menonjolkan warna-warna cerah yang kontras (seperti merah, kuning, hijau, dan putih) di atas dasar kain berwarna hitam pekat.",
    makna:
      "Warna-warni pada ceplokan melambangkan perbedaan yang ada dalam masyarakat sebagai karunia yang harus disyukuri, mewakili sikap toleransi, kekompakan, serta keharmonisan. Motif ini juga dimaknai sebagai pengingat kepada Tuhan (habluminallah) dan hubungan baik antar-manusia (habluminannas).",
    deskripsi:
      "Ceplok Gayo merupakan bentuk adaptasi seni ukir Kerawang Gayo ke dalam media kain batik. Susunannya yang berulang memberikan kesan dinamis, elegan, dan menonjolkan falsafah hidup masyarakat Aceh Gayo yang religius serta menjunjung tinggi toleransi. Berasal dari Aceh, berkembang pesat pada abad ke-20.",
    colors: [
      { name: "Hitam Pekat",  hex: "#0A0A0A" },
      { name: "Merah Cerah",  hex: "#DC2626" },
      { name: "Kuning Emas",  hex: "#F59E0B" },
      { name: "Hijau Segar",  hex: "#16A34A" },
      { name: "Putih Bersih", hex: "#F9FAFB" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain mori, malam (lilin batik), pewarna sintetis merah, kuning, hijau, putih di atas dasar hitam",
      technique: "Batik cap",
      dimensions: "200 × 105 cm (perkiraan standar)",
      production: {
        period: "Abad XX",
        place: "Aceh (wilayah Gayo)",
        actor: "Pengrajin Batik Gayo, Aceh",
        actorType: "Komunitas pengrajin adat Gayo",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-005",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Aceh",
        "Seni Geometris Gayo",
        "Kerawang Gayo",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 5,
      contributors: [
        { nim: "2301020095", nama: "I Kadek Herik Arya Saputra" },
        { nim: "2301020027", nama: "Ida Bagus Made Arsa Wibawa" },
        { nim: "2301020049", nama: "Made Putra Hariana" },
        { nim: "2301020039", nama: "Muhammad Gilan" },
        { nim: "2301020030", nama: "Ni Made Nelia Adnyani" },
      ],
    },
  },

  {
    id: "tangkawang-ampiek",
    nama: "Tangkawang Ampiek",
    asal: "Kalimantan Timur",
    abad: "XX",
    region: "kalimantan",
    image: "img/tangkawang-ampiek.jpg",
    emoji: "🌿",
    samples: [],
    ciriKhasMotif: "Paduan ukiran kayu Ampiek khas Kutai dengan flora pohon Tengkawang Kalimantan",
    ciriKhas:
      "Desainnya kental dengan corak flora (sulur-suluran) asimetris atau spiral yang terinspirasi dari lekuk ukiran rumah adat atau perisai Dayak/Kutai. Menggunakan gradasi warna-warna khas pedalaman.",
    makna:
      "Ampiek dalam bahasa Kutai berarti kain motif ukiran. Sedangkan Tengkawang adalah pohon yang memberikan manfaat kesehatan serta penghidupan. Batik ini mengandung makna keselamatan, harapan akan kesembuhan, kekuatan, serta keharmonisan manusia dengan alam semesta yang menghidupinya.",
    deskripsi:
      "Motif ini adalah bentuk penghormatan masyarakat Kalimantan Timur terhadap alamnya. Melalui Tangkawang Ampiek, masyarakat merayakan kekayaan flora lokal sekaligus mengabadikan tradisi kerajinan ukir kayu ke dalam tekstil yang anggun dan berfilosofi kuat. Berasal dari Kalimantan Timur, berkembang pada abad ke-20.",
    colors: [
      { name: "Coklat Kayu",    hex: "#78350F" },
      { name: "Hijau Hutan",    hex: "#14532D" },
      { name: "Oranye Tembaga", hex: "#C2410C" },
      { name: "Krem Alami",     hex: "#FEF3C7" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain sutra, malam (lilin batik), pewarna alam khas pedalaman Kalimantan",
      technique: "Batik tulis",
      dimensions: "200 × 100 cm (perkiraan standar)",
      production: {
        period: "Abad XX",
        place: "Kalimantan Timur",
        actor: "Pengrajin Dayak Kutai, Kalimantan Timur",
        actorType: "Komunitas pengrajin adat Dayak/Kutai",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-006",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Kalimantan",
        "Seni Ukir Dayak",
        "Flora Kalimantan",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 1,
      contributors: [
        { nim: "2301020035", nama: "I Putu Aldo Wikananda" },
      ],
    },
  },

  {
    id: "parang-seling",
    nama: "Parang Seling",
    asal: "Jawa Tengah / Keraton Yogyakarta dan Surakarta",
    abad: "XVI",
    region: "jawa-tengah",
    image: "img/parang-seling.jpg",
    emoji: "⚔️",
    samples: [],
    ciriKhasMotif: "Motif parang diagonal diselingi motif feminin lain dalam komposisi bergantian",
    ciriKhas:
      "Deretan garis diagonal bermotif huruf 'S' (Parang) yang disusun miring pada sudut 45 derajat, diselingi (seling) dengan pola atau motif lain pada baris diagonal sebelahnya — misalnya diselingi bunga atau sawunggaling. Adanya pengulangan motif parang secara diagonal bergantian dengan motif berbeda yang diulang dalam ukuran dan alur yang sejajar.",
    makna:
      "Parang sendiri bermakna ketajaman pemikiran dan semangat yang pantang menyerah seperti ombak lautan. Penambahan 'seling' (motif selingan) seringkali dianggap sebagai bentuk versi feminin dari Parang, yang bermakna keseimbangan, harmoni, kebijaksanaan hidup, dan keluwesan karakter.",
    deskripsi:
      "Motif ini meredam sisi maskulin dan kaku dari motif parang tunggal sehingga menjadikannya lebih kaya ragam. Perpaduan harmonis ini sangat digemari kaum wanita keraton karena mencitrakan keanggunan yang selaras dengan pendirian yang teguh. Berasal dari tradisi keraton Yogyakarta dan Surakarta, abad ke-16.",
    colors: [
      { name: "Soga Tua",     hex: "#7C3F1E" },
      { name: "Hitam Malam",  hex: "#1C1917" },
      { name: "Krem Gading",  hex: "#FEF9EE" },
      { name: "Coklat Tua",   hex: "#4A2511" },
    ],
    cidoc: {
      objectType: "Kain Batik",
      medium: "Kain mori, malam (lilin batik), pewarna soga coklat dan hitam",
      technique: "Batik tulis",
      dimensions: "250 × 105 cm (perkiraan standar)",
      production: {
        period: "Abad XVI",
        place: "Jawa Tengah / Keraton Yogyakarta dan Surakarta",
        actor: "Pengrajin Keraton Yogyakarta & Surakarta",
        actorType: "Pengrajin keraton",
      },
      currentLocation: "Museum Digital Nasional Indonesia",
      accessionNumber: "MDN-2024-007",
      subjects: [
        "Tekstil",
        "Warisan Budaya Takbenda",
        "Batik Keraton",
        "Motif Parang",
        "UNESCO Intangible Cultural Heritage",
      ],
      language: "id",
      rights: "CC BY-NC-SA 4.0",
      rightsURI: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      provider: "Museum Digital Nasional Indonesia",
      kontributor: 1,
      contributors: [
        { nim: "2301020079", nama: "Putu Andika Dharma Saputra" },
      ],
    },
  },
];

const REGIONS = [
  { value: "all",         label: "Semua Wilayah" },
  { value: "jawa-barat",  label: "Jawa Barat" },
  { value: "jawa-tengah", label: "Jawa Tengah" },
  { value: "yogyakarta",  label: "DI Yogyakarta" },
  { value: "sumatera",    label: "Sumatera" },
  { value: "kalimantan",  label: "Kalimantan" },
];

const COLOR_SWATCHES = [
  { name: "Merah",      hex: "#DC2626", pattern: "diagonal",  keywords: ["merah","coral","marun","mengkudu","getih","darah","tua"] },
  { name: "Biru",       hex: "#1E3A8A", pattern: "horizontal",keywords: ["biru","indigo","langit","laut"] },
  { name: "Coklat",     hex: "#92400E", pattern: "dots",      keywords: ["coklat","soga","tua","tanah","hutan","kayu"] },
  { name: "Hitam",      hex: "#1C1917", pattern: "crosshatch",keywords: ["hitam","gelap","malam","arang","jelaga","tinta","pekat"] },
  { name: "Kuning/Emas",hex: "#D97706", pattern: "chevron",   keywords: ["kuning","emas","gold","keemasan","antik"] },
  { name: "Hijau",      hex: "#15803D", pattern: "zigzag",    keywords: ["hijau","toska","daun","zamrud","segar","hutan"] },
  { name: "Putih/Krem", hex: "#FEF3C7", pattern: "stipple",   keywords: ["putih","krem","gading","mori","ivory","sutra","tulang","alami","bersih"] },
];

try {
  let localBatiks = JSON.parse(localStorage.getItem("global_batik_data"));
  if (!localBatiks) {
    localBatiks = BATIK_DATA;
    localStorage.setItem("global_batik_data", JSON.stringify(localBatiks));
  }
  
  const customBatiks = JSON.parse(localStorage.getItem("custom_batik_data") || "[]");
  if (Array.isArray(customBatiks) && customBatiks.length > 0) {
    customBatiks.forEach(c => {
      if (!localBatiks.find(b => b.id === c.id)) {
        localBatiks.push(c);
      }
    });
    localStorage.setItem("global_batik_data", JSON.stringify(localBatiks));
    localStorage.removeItem("custom_batik_data"); // Migrasi selesai
  }
  
  window.BATIK_DATA = localBatiks;
} catch (e) {
  console.warn("Gagal memuat batik dari memori", e);
  window.BATIK_DATA = BATIK_DATA;
}

window.REGIONS      = REGIONS;
window.COLOR_SWATCHES = COLOR_SWATCHES;