/**
 * recommendation.js — AI Recommendation Engine
 * Memberikan rekomendasi batik Nusantara kustom berdasarkan survei pengguna.
 * Menggunakan Gemini API (Online) atau kalkulator bobot kecocokan lokal (Offline).
 * Museum Digital Nasional Indonesia
 */

const Recommendation = (() => {

  /**
   * Mengambil rekomendasi berdasarkan input survei pengguna
   * @param {Object} inputs { acara, budget, warna, motif, daerah, kategori }
   * @returns {Promise<Array>} List hasil rekomendasi: [{ id, score, reason }]
   */
  async function getRecommendations(inputs) {
    // Simpan hit statistik di dashboard
    trackRecommendationCount();

    if (window.GeminiAPI && window.GeminiAPI.hasKey()) {
      try {
        return await getRecommendationsWithGemini(inputs);
      } catch (err) {
        console.warn("Gagal mendapatkan rekomendasi via Gemini, beralih ke kalkulasi lokal...", err);
        return getRecommendationsLocally(inputs);
      }
    } else {
      return getRecommendationsLocally(inputs);
    }
  }

  // Rekomendasi via Gemini API
  async function getRecommendationsWithGemini(inputs) {
    const batikListSimplified = (window.BATIK_DATA || []).map(b => ({
      id: b.id,
      nama: b.nama,
      asal: b.asal,
      makna: b.makna,
      ciriKhas: b.ciriKhasMotif,
      colors: b.colors.map(c => c.name),
      technique: b.cidoc?.technique || "Batik",
      subjects: b.cidoc?.subjects || []
    }));

    const systemInstruction = 
      "Kamu adalah asisten perancang busana dan kurator batik profesional di Museum Digital Nasional Indonesia. " +
      "Tugasmu adalah menganalisis input kuesioner pengguna dan mencocokkannya dengan koleksi batik terbaik. " +
      "Pertimbangkan aspek kepantasan adat acara, budget pembelian (kain tulis lebih mahal dibanding cap/print), warna kesukaan, dan filosofi motif. " +
      "Kembalikan HANYA array JSON objek dengan format seperti berikut ini: " +
      "[{\"id\": \"id-batik\", \"score\": 95, \"reason\": \"Alasan profesional mengapa batik ini direkomendasikan untuk Anda.\"}] " +
      "Urutkan dari yang paling cocok (skor tertinggi). Jangan tambahkan pembungkus markdown block seperti ```json atau teks lain di luar array.";

    const prompt = 
      `Database Batik: ${JSON.stringify(batikListSimplified)}\n\n` +
      `Kuesioner Pengguna:\n` +
      `- Acara: ${inputs.acara} (misal: wisuda, pernikahan, rapat formal, santai)\n` +
      `- Budget: ${inputs.budget} (pilihan: low <500rb, medium 500rb-1.5jt, high >1.5jt)\n` +
      `- Warna Utama: ${inputs.warna}\n` +
      `- Jenis Motif: ${inputs.motif} (pilihan: geometris, flora, fauna, awan/ombak)\n` +
      `- Daerah Asal: ${inputs.daerah}\n` +
      `- Kategori: ${inputs.kategori} (pilihan: keraton, pesisir)\n\n` +
      `Berikan rekomendasi batik paling cocok dalam format JSON array.`;

    const rawResponse = await window.GeminiAPI.generateContent(prompt, systemInstruction, true);
    
    try {
      const cleanJsonStr = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const results = JSON.parse(cleanJsonStr);
      if (Array.isArray(results)) {
        return results;
      }
    } catch (e) {
      console.error("Gagal mengurai respons rekomendasi Gemini:", rawResponse, e);
    }

    return getRecommendationsLocally(inputs);
  }

  // Rekomendasi Lokal (Offline Fallback)
  function getRecommendationsLocally(inputs) {
    const data = window.BATIK_DATA || [];
    const results = [];

    data.forEach(batik => {
      let score = 50; // Skor dasar awal
      const reasons = [];

      // 1. Aspek Kategori (Keraton vs Pesisir)
      const isKeraton = ["kawung-mataram", "gurdo-solo", "parang-seling"].includes(batik.id);
      const isPesisir = ["mega-mendung", "merak-lasem", "ceplok-gayo", "tangkawang-ampiek"].includes(batik.id);
      
      if (inputs.kategori === "keraton" && isKeraton) {
        score += 15;
        reasons.push("Batik ini masuk dalam kategori Batik Keraton yang klasik");
      } else if (inputs.kategori === "pesisir" && isPesisir) {
        score += 15;
        reasons.push("Batik ini bertipe Batik Pesisir yang kasual dan adaptif");
      }

      // 2. Aspek Acara
      if (inputs.acara === "wisuda") {
        if (batik.id === "parang-seling" || batik.id === "gurdo-solo") {
          score += 25;
          reasons.push("Motifnya melambangkan kewibawaan dan kesuksesan yang sangat pas untuk momen wisuda");
        } else if (isKeraton) {
          score += 10;
        }
      } else if (inputs.acara === "pernikahan") {
        if (batik.id === "parang-seling" || batik.id === "kawung-mataram" || batik.id === "merak-lasem") {
          score += 20;
          reasons.push("Menyimbolkan kesucian dan keharmonisan rumah tangga yang cocok untuk pernikahan");
        }
      } else if (inputs.acara === "rapat formal") {
        if (isKeraton) {
          score += 15;
          reasons.push("Corak keraton yang berwibawa memberikan kesan profesional di acara formal");
        }
      } else if (inputs.acara === "santai") {
        if (isPesisir) {
          score += 20;
          reasons.push("Model corak pesisir yang dinamis cocok untuk acara non-formal");
        }
      }

      // 3. Aspek Budget
      const isTulis = (batik.cidoc?.technique || "").toLowerCase().includes("tulis");
      if (inputs.budget === "low") { // < 500rb
        if (!isTulis) { // Cap / cetak biasanya lebih terjangkau
          score += 20;
          reasons.push("Teknik pembuatan non-tulis (cap) sesuai dengan budget ekonomis Anda");
        } else {
          score -= 15; // Batik tulis asli biasanya mahal
        }
      } else if (inputs.budget === "medium") { // 500rb - 1.5jt
        score += 10;
      } else if (inputs.budget === "high") { // > 1.5jt
        if (isTulis) {
          score += 20;
          reasons.push("Merupakan batik tulis eksklusif dengan nilai investasi seni tinggi");
        }
      }

      // 4. Aspek Warna kesukaan
      if (inputs.warna !== "all") {
        const hasColor = batik.colors.some(c => 
          c.name.toLowerCase().includes(inputs.warna.toLowerCase())
        );
        if (hasColor) {
          score += 15;
          reasons.push(`Mengandung palet warna utama ${inputs.warna} yang Anda sukai`);
        }
      }

      // 5. Aspek Motif
      if (inputs.motif === "geometris" && (batik.id === "kawung-mataram" || batik.id === "ceplok-gayo")) {
        score += 20;
        reasons.push("Memiliki struktur visual geometris yang simetris dan rapi");
      } else if (inputs.motif === "flora" && (batik.id === "tangkawang-ampiek" || batik.id === "merak-lasem")) {
        score += 20;
        reasons.push("Desain flora alami yang memberikan kesan organik");
      } else if (inputs.motif === "fauna" && (batik.id === "gurdo-solo" || batik.id === "merak-lasem")) {
        score += 20;
        reasons.push("Mengangkat ornamen hewan mitologi/pesisir yang artistik");
      } else if (inputs.motif === "awan/ombak" && (batik.id === "mega-mendung" || batik.id === "parang-seling")) {
        score += 20;
        reasons.push("Menghadirkan lekuk ornamen awan megah atau ombak diagonal");
      }

      // 6. Aspek Wilayah
      if (inputs.daerah !== "all" && batik.region === inputs.daerah) {
        score += 15;
        reasons.push(`Merupakan warisan budaya asli daerah ${inputs.daerah.replace("-", " ")}`);
      }

      // Pastikan rentang skor valid (40 - 98)
      const finalScore = Math.max(40, Math.min(score, 98));
      
      const combinedReason = reasons.length > 0 
        ? reasons.slice(0, 3).join(", serta ") + "."
        : `Batik ${batik.nama} ini direkomendasikan berdasarkan relevansi filosofi hidup dan kegunaannya.`;

      results.push({
        id: batik.id,
        score: finalScore,
        reason: combinedReason
      });
    });

    // Urutkan rekomendasi dari skor kecocokan tertinggi
    return results.sort((a, b) => b.score - a.score);
  }

  function trackRecommendationCount() {
    try {
      const current = localStorage.getItem("dashboard_recommendation_count") || "0";
      localStorage.setItem("dashboard_recommendation_count", String(Number(current) + 1));
      
      // Simpan aktivitas log
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        type: "rekomendasi",
        time: new Date().toISOString(),
        description: "Melakukan konsultasi rekomendasi AI"
      });
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  return {
    getRecommendations
  };
})();

window.Recommendation = Recommendation;
