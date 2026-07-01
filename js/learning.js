/**
 * learning.js — AI Learning & Audio Guide Module
 * Mengelola kartu edukasi batik, fun facts generator, dan narator audio otomatis.
 * Museum Digital Nasional Indonesia
 */

const Learning = (() => {
  let selectBatik = null;
  let learningContentArea = null;
  let btnSpeak = null;
  let btnStopSpeak = null;
  let synth = null;
  let utterance = null;
  let isSpeaking = false;

  function init() {
    selectBatik = document.getElementById("learning-batik-select");
    learningContentArea = document.getElementById("learning-content-area");
    btnSpeak = document.getElementById("btn-audio-speak");
    btnStopSpeak = document.getElementById("btn-audio-stop");
    synth = window.speechSynthesis;

    if (!selectBatik || !learningContentArea) return;

    populateBatikSelect();
    bindEvents();
    
    // Muat batik pertama secara default
    if (window.BATIK_DATA && window.BATIK_DATA.length > 0) {
      loadBatikLearning(window.BATIK_DATA[0].id);
    }
  }

  function populateBatikSelect() {
    selectBatik.innerHTML = "";
    (window.BATIK_DATA || []).forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `${b.emoji} Batik ${b.nama} (${b.asal.split(",")[0]})`;
      selectBatik.appendChild(opt);
    });
  }

  function bindEvents() {
    selectBatik.addEventListener("change", () => {
      stopSpeaking();
      loadBatikLearning(selectBatik.value);
    });

    if (btnSpeak) {
      btnSpeak.addEventListener("click", startSpeaking);
    }
    if (btnStopSpeak) {
      btnStopSpeak.addEventListener("click", stopSpeaking);
    }

    // Pastikan jika berpindah halaman, suara mati
    window.addEventListener("beforeunload", stopSpeaking);
  }

  async function loadBatikLearning(batikId) {
    const batik = window.BATIK_DATA?.find(b => b.id === batikId);
    if (!batik) return;

    // Log ke dashboard bahwa user mempelajari batik ini
    trackBatikView(batikId);

    // Tampilkan skeleton loading
    renderSkeleton();

    // Dapatkan data fun fact tambahan dari Gemini jika memungkinkan
    let funFactsHtml = `<li><strong>Warisan Budaya:</strong> Motif ini telah terdaftar resmi dalam inventarisasi budaya nasional.</li>`;
    if (window.GeminiAPI && window.GeminiAPI.hasKey()) {
      try {
        const query = `Berikan 2 fakta menarik yang unik dan jarang diketahui tentang batik ${batik.nama} asal ${batik.asal} dalam bentuk list HTML <li>. Singkat, padat, menarik.`;
        const response = await window.GeminiAPI.generateContent(query);
        funFactsHtml = response.replace(/<\/?[^>]+(>|$)/g, (match) => {
          return ["<li>", "</li>", "<strong>", "</strong>", "<em>", "</em>"].includes(match.toLowerCase()) ? match : "";
        });
      } catch (err) {
        console.warn("Gagal mendapatkan fun facts dari Gemini API, menggunakan data bawaan...");
        funFactsHtml = getFallbackFunFacts(batik.id);
      }
    } else {
      funFactsHtml = getFallbackFunFacts(batik.id);
    }

    renderBatikLearningContent(batik, funFactsHtml);
  }

  function renderSkeleton() {
    learningContentArea.innerHTML = `
      <div class="learning-skeleton">
        <div class="skeleton-line" style="width: 40%; height: 30px;"></div>
        <div class="skeleton-line" style="width: 100%; height: 150px; margin-top: 15px;"></div>
        <div class="skeleton-line" style="width: 80%; height: 20px; margin-top: 15px;"></div>
        <div class="skeleton-line" style="width: 60%; height: 20px; margin-top: 10px;"></div>
      </div>
    `;
  }

  function renderBatikLearningContent(batik, funFactsHtml) {
    const c = batik.cidoc || {};
    
    learningContentArea.innerHTML = `
      <div class="learning-layout">
        <div class="learning-visual-card glass-card">
          <img src="${batik.image}" alt="Batik ${batik.nama}" class="learning-image" />
          <div class="learning-badge-row">
            <span class="learning-badge-region">${batik.asal}</span>
            <span class="learning-badge-century">Abad ${batik.abad}</span>
          </div>
          <div class="learning-audio-panel">
            <button id="btn-audio-speak" class="btn-primary btn-small">
              <span class="btn-icon">🔊</span> Dengarkan Panduan Audio
            </button>
            <button id="btn-audio-stop" class="btn-ghost btn-small" disabled>
              <span class="btn-icon">⏹️</span> Hentikan
            </button>
          </div>
        </div>

        <div class="learning-details-card glass-card">
          <h2 class="learning-title">${batik.emoji} Batik ${batik.nama}</h2>
          <p class="learning-summary">${batik.deskripsi}</p>
          
          <hr class="learning-divider" />
          
          <div class="learning-section">
            <h4 class="learning-sec-title">🌀 Makna & Simbolisme</h4>
            <p>${batik.makna}</p>
          </div>

          <div class="learning-section">
            <h4 class="learning-sec-title">✨ Ciri Khas Visual</h4>
            <p>${batik.ciriKhas || batik.ciriKhasMotif}</p>
          </div>

          <div class="learning-section">
            <h4 class="learning-sec-title">💡 Fun Fact / Informasi Menarik</h4>
            <ul class="learning-facts-list">
              ${funFactsHtml}
            </ul>
          </div>

          <div class="learning-section">
            <h4 class="learning-sec-title">🧼 Tips Perawatan Tradisional</h4>
            <p>${getCareInstructions(batik.cidoc?.technique)}</p>
          </div>
        </div>
      </div>
    `;

    // Re-bind tombol audio guide yang baru dirender
    btnSpeak = document.getElementById("btn-audio-speak");
    btnStopSpeak = document.getElementById("btn-audio-stop");
    
    if (btnSpeak) btnSpeak.addEventListener("click", startSpeaking);
    if (btnStopSpeak) btnStopSpeak.addEventListener("click", stopSpeaking);
  }

  function getCareInstructions(technique = "") {
    const isTulis = technique.toLowerCase().includes("tulis");
    if (isTulis) {
      return "Karena batik ini dibuat dengan teknik batik tulis menggunakan lilin malam alami, pastikan mencuci dengan buah lerak atau sabun bayi. Jangan kucek terlalu keras, jemur di tempat teduh (jangan terkena matahari langsung), dan setrika dari sisi bagian dalam saja.";
    }
    return "Batik cap/kombinasi dapat dicuci manual menggunakan deterjen lembut. Hindari pemutih pakaian, jemur di tempat teduh, dan setrika dengan suhu sedang agar serat kain tetap awet.";
  }

  function getFallbackFunFacts(id) {
    const facts = {
      "mega-mendung": `
        <li><strong>Simbolisme Awan:</strong> Bentuk awan Mega Mendung yang mendatar melambangkan dunia atas yang bersifat transenden dan ketuhanan.</li>
        <li><strong>Pengaruh Kerajaan:</strong> Motif awan ini kental dipengaruhi oleh bentuk awan Tiongkok, melambangkan kisah cinta putri Ong Tien dari dinasti Ming dengan Sunan Gunung Jati.</li>
      `,
      "kawung-mataram": `
        <li><strong>Batik Larangan:</strong> Pada masa Kesultanan Yogyakarta dan Surakarta, motif Kawung merupakan 'batik larangan' yang hanya boleh dipakai keluarga raja.</li>
        <li><strong>Filosofi Pohon Aren:</strong> Terinspirasi dari pohon aren (enau) dari daun hingga akar yang semuanya berguna untuk kehidupan, mengajarkan manusia agar selalu bermanfaat bagi sesama.</li>
      `,
      "gurdo-solo": `
        <li><strong>Burung Garuda:</strong> Melambangkan kendaraan Dewa Wisnu dalam mitologi Hindu, yaitu burung Garuda yang perkasa pembawa tirta amerta (air suci kehidupan).</li>
        <li><strong>Status Sosial:</strong> Simbol kepemimpinan yang tegas dan mengayomi, menjadikannya busana utama para adipati dan raja di masa lalu.</li>
      `
    };

    return facts[id] || `
      <li><strong>Identitas Budaya:</strong> Motif batik ini memiliki filosofi lokal kuat yang diwariskan secara lisan turun-temurun oleh leluhur.</li>
      <li><strong>Nilai Ekologis:</strong> Pemilihan warna soga alami diambil dari getah kayu tingi, tegeran, dan jambal yang ramah lingkungan.</li>
    `;
  }

  // Audio Guide Web Speech API
  function startSpeaking() {
    if (!synth) {
      alert("Browser Anda tidak mendukung fitur teks-ke-suara.");
      return;
    }

    const title = document.querySelector(".learning-title")?.textContent || "";
    const summary = document.querySelector(".learning-summary")?.textContent || "";
    const makna = document.querySelector(".learning-section p")?.textContent || "";
    
    const textToSpeak = `Panduan audio Museum Digital. ${title}. ${summary}. Mengenai makna filosofisnya: ${makna}`;

    if (isSpeaking) {
      synth.cancel();
    }

    utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "id-ID"; // Set bahasa Indonesia
    utterance.rate = 0.95; // Sedikit lebih lambat agar jelas

    utterance.onstart = () => {
      isSpeaking = true;
      if (btnSpeak) {
        btnSpeak.innerHTML = `<span class="btn-icon">⏳</span> Menyuarakan...`;
        btnSpeak.disabled = true;
      }
      if (btnStopSpeak) btnStopSpeak.disabled = false;
    };

    utterance.onend = () => {
      isSpeaking = false;
      resetAudioButtons();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      resetAudioButtons();
    };

    synth.speak(utterance);
  }

  function stopSpeaking() {
    if (synth && isSpeaking) {
      synth.cancel();
      isSpeaking = false;
      resetAudioButtons();
    }
  }

  function resetAudioButtons() {
    if (btnSpeak) {
      btnSpeak.innerHTML = `<span class="btn-icon">🔊</span> Dengarkan Panduan Audio`;
      btnSpeak.disabled = false;
    }
    if (btnStopSpeak) btnStopSpeak.disabled = true;
  }

  function trackBatikView(batikId) {
    try {
      const counts = JSON.parse(localStorage.getItem("dashboard_batik_views") || "{}");
      counts[batikId] = (counts[batikId] || 0) + 1;
      localStorage.setItem("dashboard_batik_views", JSON.stringify(counts));

      // Simpan aktivitas log
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        type: "edukasi",
        time: new Date().toISOString(),
        description: `Mempelajari detail Batik ${batikId.replace("-", " ")}`
      });
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  return {
    init,
    loadBatikLearning
  };
})();

window.Learning = Learning;
