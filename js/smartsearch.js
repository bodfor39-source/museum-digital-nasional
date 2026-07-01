/**
 * smartsearch.js — AI Smart Search Engine
 * Menerjemahkan bahasa alami pengguna ke hasil pencarian batik paling relevan.
 * Menggunakan Gemini API (Online) atau fallback pencocokan sinonim semantik lokal (Offline).
 * Museum Digital Nasional Indonesia
 */

const SmartSearch = (() => {

  // Sinonim & pemetaan kata kunci lokal untuk pencarian semantik offline
  const LOCAL_SEMANTIC_MAP = {
    warna: {
      "biru": ["indigo", "langit", "muda", "mega mendung"],
      "merah": ["darah", "ayam", "marun", "lasem", "gayo"],
      "cokelat": ["soga", "kayu", "sogan", "keraton", "tua"],
      "hitam": ["pekat", "malam", "jelaga", "tinta", "gayo"],
      "kuning": ["emas", "gading", "krem"],
      "putih": ["krem", "gading", "mori", "ivory"]
    },
    konteks: {
      "resmi": ["keraton", "formal", "rapat", "pernikahan", "wisuda", "parang", "gurdo", "kawung"],
      "formal": ["keraton", "resmi", "pernikahan", "wisuda", "parang", "gurdo", "kawung"],
      "santai": ["pesisir", "kasual", "pantai", "modern", "mega mendung", "lasem", "gayo", "ampiek"],
      "pemimpin": ["kepemimpinan", "wibawa", "raja", "kekuasaan", "gurdo", "parang", "wisuda"],
      "sabar": ["tenang", "marah", "dingin", "mega mendung"],
      "suci": ["kemurnian", "keadilan", "kawung"],
      "alam": ["flora", "daun", "pohon", "ampiek", "tengkawang", "lasem", "merak"],
      "burung": ["merak", "garuda", "gurdo", "lasem", "fauna"]
    }
  };

  /**
   * Menjalankan pencarian cerdas berbasis AI
   * @param {string} query Pertanyaan pencarian bahasa alami dari pengguna
   * @returns {Promise<Array>} List hasil pencarian: [{ id, score, reason }]
   */
  async function search(query) {
    if (!query || query.trim() === "") return [];
    
    // Log jumlah pencarian untuk dashboard
    trackSearchCount();

    if (window.GeminiAPI && window.GeminiAPI.hasKey()) {
      try {
        return await searchWithGemini(query);
      } catch (err) {
        console.warn("Gagal menggunakan Gemini API, beralih ke pencarian lokal semantik...", err);
        return searchLocally(query);
      }
    } else {
      return searchLocally(query);
    }
  }

  // Pencarian Menggunakan Gemini API
  async function searchWithGemini(query) {
    const batikListSimplified = (window.BATIK_DATA || []).map(b => ({
      id: b.id,
      nama: b.nama,
      asal: b.asal,
      ciriKhas: b.ciriKhasMotif,
      makna: b.makna,
      colors: b.colors.map(c => c.name)
    }));

    const systemInstruction = 
      "Kamu adalah mesin pencarian AI cerdas untuk galeri batik Nusantara. Tugasmu adalah menganalisis query pencarian bahasa alami pengguna " +
      "dan mengembalikan daftar motif batik yang paling relevan dari database JSON yang disediakan. " +
      "Kembalikan HANYA array JSON objek dengan format seperti ini: " +
      "[{\"id\": \"id-batik\", \"score\": 95, \"reason\": \"Alasan mengapa batik ini sangat cocok dengan query Anda.\"}] " +
      "Urutkan dari skor tertinggi ke terendah. Batasi hanya batik dengan skor kecocokan di atas 40. " +
      "Jangan tambahkan markdown block seperti ```json atau penjelasan teks apapun di luar array JSON tersebut. Harus valid JSON.";

    const prompt = 
      `Database Batik: ${JSON.stringify(batikListSimplified)}\n\n` +
      `Query Pengguna: "${query}"\n\n` +
      `Berikan hasil pencarian yang paling relevan dalam format JSON array.`;

    const rawResponse = await window.GeminiAPI.generateContent(prompt, systemInstruction, true);
    
    // Parse hasil JSON
    try {
      // Bersihkan kemungkinan output markdown block jika model mengabaikan instruksi
      const cleanJsonStr = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const results = JSON.parse(cleanJsonStr);
      if (Array.isArray(results)) {
        return results;
      }
    } catch (e) {
      console.error("Gagal mengurai respons JSON AI Smart Search:", rawResponse, e);
    }

    return searchLocally(query); // Fallback jika parsing gagal
  }

  // Pencarian Semantik Lokal (Offline Fallback)
  function searchLocally(query) {
    const normalizedQuery = query.toLowerCase();
    const data = window.BATIK_DATA || [];
    const results = [];

    data.forEach(batik => {
      let score = 0;
      const reasons = [];

      // 1. Pencocokan langsung pada nama atau daerah asal
      if (batik.nama.toLowerCase().includes(normalizedQuery)) {
        score += 60;
        reasons.push(`Nama batik mengandung kata '${query}'`);
      }
      if (batik.asal.toLowerCase().includes(normalizedQuery)) {
        score += 50;
        reasons.push(`Berasal dari daerah '${batik.asal}'`);
      }

      // 2. Pencocokan warna semantik
      Object.keys(LOCAL_SEMANTIC_MAP.warna).forEach(colorName => {
        if (normalizedQuery.includes(colorName)) {
          const keywords = LOCAL_SEMANTIC_MAP.warna[colorName];
          // Cek apakah batik mengandung warna ini
          const colorMatch = batik.colors.some(c => 
            c.name.toLowerCase().includes(colorName) || 
            keywords.some(kw => c.name.toLowerCase().includes(kw))
          );
          if (colorMatch) {
            score += 35;
            reasons.push(`Memiliki nuansa warna ${colorName}`);
          }
        }
      });

      // 3. Pencocokan konteks acara & filosofi
      Object.keys(LOCAL_SEMANTIC_MAP.konteks).forEach(contextName => {
        if (normalizedQuery.includes(contextName)) {
          const targets = LOCAL_SEMANTIC_MAP.konteks[contextName];
          if (targets.includes(batik.id) || targets.some(t => batik.makna.toLowerCase().includes(t) || batik.ciriKhas.toLowerCase().includes(t))) {
            score += 40;
            reasons.push(`Cocok untuk konteks ${contextName} berdasarkan makna filosofisnya`);
          }
        }
      });

      // 4. Pencarian kata kunci umum
      const textBlock = `${batik.ciriKhasMotif} ${batik.makna} ${batik.deskripsi} ${(batik.cidoc?.subjects || []).join(" ")}`.toLowerCase();
      const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
      let keywordHits = 0;

      words.forEach(word => {
        if (textBlock.includes(word)) {
          keywordHits++;
          score += 15;
        }
      });

      if (keywordHits > 0) {
        reasons.push(`Mengandung kata kunci relevan tentang motif/maknanya`);
      }

      // Gabungkan alasan
      if (score > 0) {
        const finalReason = reasons.length > 0 
          ? reasons.slice(0, 2).join(" dan ") + "." 
          : "Batik ini memiliki kesamaan deskripsi dengan kata kunci Anda.";
        
        results.push({
          id: batik.id,
          score: Math.min(score, 98), // Maksimal 98% untuk pencarian lokal
          reason: finalReason
        });
      }
    });

    // Urutkan berdasarkan skor tertinggi
    return results.sort((a, b) => b.score - a.score);
  }

  function trackSearchCount() {
    try {
      const current = localStorage.getItem("dashboard_search_count") || "0";
      localStorage.setItem("dashboard_search_count", String(Number(current) + 1));
      
      // Simpan aktivitas log
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        type: "pencarian",
        time: new Date().toISOString(),
        description: "Melakukan pencarian cerdas"
      });
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  return {
    search
  };
})();

window.SmartSearch = SmartSearch;
