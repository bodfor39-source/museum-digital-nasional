/**
 * curator.js — AI Curator Chatbot
 * Asisten virtual museum interaktif (Ki Kurator Nusantara) yang menjawab pertanyaan
 * seputar filosofi, makna, sejarah, dan perawatan batik.
 * Museum Digital Nasional Indonesia
 */

const Curator = (() => {
  let chatMessagesContainer = null;
  let chatInput = null;
  let chatSendBtn = null;
  let quickQuestionsContainer = null;
  let faqKnowledge = [];

  function init() {
    chatMessagesContainer = document.getElementById("curator-messages");
    chatInput = document.getElementById("curator-input");
    chatSendBtn = document.getElementById("curator-send-btn");
    quickQuestionsContainer = document.getElementById("curator-quick-questions");

    if (!chatMessagesContainer || !chatInput || !chatSendBtn) return;

    loadFaqKnowledge();
    bindEvents();
    renderWelcomeMessage();
  }

  async function loadFaqKnowledge() {
    try {
      const response = await fetch("model/knowledge.json");
      if (response.ok) {
        const data = await response.json();
        faqKnowledge = data.faq || [];
        renderQuickQuestions();
      }
    } catch (err) {
      console.warn("Gagal memuat basis pengetahuan offline:", err);
      // Fallback manual jika gagal fetch
      faqKnowledge = [
        { question: "Apa filosofi Batik Parang?", keywords: ["parang"] },
        { question: "Apa makna Batik Kawung?", keywords: ["kawung"] },
        { question: "Mengapa Mega Mendung terkenal?", keywords: ["mendung", "mega"] },
        { question: "Batik untuk acara wisuda?", keywords: ["wisuda"] }
      ];
      renderQuickQuestions();
    }
  }

  function bindEvents() {
    chatSendBtn.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  function renderWelcomeMessage() {
    chatMessagesContainer.innerHTML = "";
    addMessage(
      "Halo! Selamat datang di Museum Digital Batik Nusantara. Saya **Ki Kurator Nusantara**, asisten virtual Anda. " +
      "Saya siap menjelaskan filosofi, makna simbolis, sejarah motif batik, atau memberikan tips memadupadankan batik. " +
      "Ada yang ingin Anda tanyakan hari ini? 🏛️✨",
      "bot"
    );
  }

  function renderQuickQuestions() {
    if (!quickQuestionsContainer) return;
    quickQuestionsContainer.innerHTML = "";
    
    // Ambil 4 pertanyaan secara acak
    const selected = faqKnowledge.slice(0, 4);
    
    selected.forEach(faq => {
      const btn = document.createElement("button");
      btn.className = "quick-question-btn";
      btn.textContent = faq.question;
      btn.addEventListener("click", () => {
        chatInput.value = faq.question;
        handleSendMessage();
      });
      quickQuestionsContainer.appendChild(btn);
    });
  }

  async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Bersihkan input
    chatInput.value = "";
    
    // Tampilkan pesan user
    addMessage(text, "user");
    
    // Tampilkan indikator mengetik
    const typingIndicator = addTypingIndicator();
    
    try {
      const response = await askAI(text);
      removeTypingIndicator(typingIndicator);
      addMessage(response, "bot");
    } catch (err) {
      removeTypingIndicator(typingIndicator);
      addMessage("Aduh, mohon maaf. Ada sedikit gangguan koneksi saat saya mencoba mengingat data arsip museum. Silakan coba lagi.", "bot");
    }
  }

  function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `curator-message curator-message--${sender}`;
    
    // Konversi tulisan tebal markdown sederhana (**teks**) menjadi HTML strong
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

    msgDiv.innerHTML = `
      <div class="curator-message__avatar">${sender === "bot" ? "🏛️" : "👤"}</div>
      <div class="curator-message__content">
        <p class="curator-message__text">${formattedText}</p>
      </div>
    `;
    
    chatMessagesContainer.appendChild(msgDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  function addTypingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.className = "curator-message curator-message--bot curator-message--typing";
    indicatorDiv.innerHTML = `
      <div class="curator-message__avatar">🏛️</div>
      <div class="curator-message__content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatMessagesContainer.appendChild(indicatorDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    return indicatorDiv;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  async function askAI(question) {
    // 1. Coba panggil Gemini jika API key terpasang
    if (window.GeminiAPI && window.GeminiAPI.hasKey()) {
      try {
        const simplifiedBatikData = (window.BATIK_DATA || []).map(b => ({
          nama: b.nama,
          asal: b.asal,
          abad: b.abad,
          ciriKhas: b.ciriKhasMotif,
          makna: b.makna,
          deskripsi: b.deskripsi
        }));

        const systemPrompt = 
          "Kamu adalah asisten museum batik virtual bernama Ki Kurator Nusantara. " +
          "Tugasmu adalah menjawab pertanyaan pengunjung museum dengan santun, mendidik, bersahabat, dan sarat wawasan budaya Jawa/Nusantara. " +
          "Gunakan basis data koleksi museum berikut untuk menjawab: " + JSON.stringify(simplifiedBatikData) + "\n" +
          "Gunakan gaya bahasa Indonesia yang semi-formal, ramah, dan selipkan emoji yang relevan. " +
          "Jika ada pertanyaan yang tidak ada di data koleksi, kamu boleh menjawabnya dengan wawasan batik umummu, " +
          "tapi usahakan di akhir jawaban sarankan mereka melihat koleksi kita yang serupa.";

        return await window.GeminiAPI.generateContent(question, systemPrompt);
      } catch (err) {
        console.warn("Gagal menggunakan Gemini API di chatbot, beralih ke FAQ lokal...", err);
      }
    }

    // 2. Fallback Lokal (Pencarian Berbasis FAQ & Database)
    return getLocalResponse(question);
  }

  function getLocalResponse(question) {
    const qLower = question.toLowerCase();
    
    // A. Cari kecocokan di FAQ knowledge.json
    for (const faq of faqKnowledge) {
      const match = faq.keywords.some(kw => qLower.includes(kw));
      if (match && faq.answer) {
        return faq.answer;
      }
    }

    // B. Cari kecocokan di data batik utama
    const batiks = window.BATIK_DATA || [];
    for (const b of batiks) {
      if (qLower.includes(b.nama.toLowerCase())) {
        return `Tentu, saya bisa bercerita tentang **Batik ${b.nama}**. Batik ini berasal dari **${b.asal}** dan mulai berkembang sekitar **Abad ${b.abad}**. Filosofinya sangat mendalam: ${b.makna} Ciri khas visualnya adalah ${b.ciriKhasMotif}`;
      }
    }

    // C. Cek ucapan sapaan umum
    if (qLower.includes("halo") || qLower.includes("selamat") || qLower.includes("pagi") || qLower.includes("siang")) {
      return "Halo! Ada yang bisa Ki Kurator bantu jelaskan tentang batik hari ini? Anda bisa menanyakan makna motif Parang, Kawung, Mega Mendung, atau cara pencucian batik.";
    }

    // D. Tanggapan tidak ditemukan
    return "Pertanyaan yang sangat menarik! Sayangnya, arsip offline museum saya terbatas untuk menjawab detail tersebut. " +
           "Silakan **hubungkan Gemini API Key** Anda di bagian atas halaman AI Center agar saya dapat menjawab pertanyaan bebas apa pun dengan kecerdasan AI penuh! 💡";
  }

  return {
    init
  };
})();

window.Curator = Curator;
