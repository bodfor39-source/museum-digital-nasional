/**
 * similarity.js — Algoritma penghitung kecocokan / kemiripan koleksi batik
 * Menghitung kemiripan berdasar bobot: asal daerah, dominan warna, motif, teknik, dan subjek.
 * Museum Digital Nasional Indonesia
 */

const Similarity = (() => {
  
  /**
   * Menghitung skor kemiripan antara dua motif batik
   * @param {Object} batikA Batik pertama
   * @param {Object} batikB Batik kedua
   * @returns {number} Nilai persentase kemiripan (0 - 100)
   */
  function computeScore(batikA, batikB) {
    if (batikA.id === batikB.id) return 100;

    let score = 0;
    const weights = {
      region: 20,
      technique: 15,
      colors: 25,
      subjects: 20,
      keywords: 20
    };

    // 1. Wilayah Asal (Region)
    if (batikA.region === batikB.region) {
      score += weights.region;
    } else if (batikA.asal.split(",")[0].trim() === batikB.asal.split(",")[0].trim()) {
      score += weights.region * 0.7; // Asal dekat
    }

    // 2. Teknik (CIDOC-CRM crm:P32_used_general_technique)
    const techA = (batikA.cidoc?.technique || "").toLowerCase();
    const techB = (batikB.cidoc?.technique || "").toLowerCase();
    if (techA === techB && techA !== "") {
      score += weights.technique;
    }

    // 3. Warna Utama (pencocokan warna terdekat berdasarkan hex)
    const colorsA = batikA.colors || [];
    const colorsB = batikB.colors || [];
    let colorMatches = 0;

    colorsA.forEach(cA => {
      const match = colorsB.find(cB => {
        // Cek nama warna atau kemiripan hex (sederhana)
        const nameMatch = cA.name.toLowerCase().includes(cB.name.toLowerCase()) || 
                          cB.name.toLowerCase().includes(cA.name.toLowerCase());
        return nameMatch;
      });
      if (match) colorMatches++;
    });

    if (colorsA.length > 0) {
      const colorRatio = colorMatches / Math.max(colorsA.length, colorsB.length);
      score += colorRatio * weights.colors;
    }

    // 4. Subjek CIDOC-CRM
    const subsA = batikA.cidoc?.subjects || [];
    const subsB = batikB.cidoc?.subjects || [];
    const intersection = subsA.filter(s => subsB.includes(s));
    const union = [...new Set([...subsA, ...subsB])];
    
    if (union.length > 0) {
      const jaccardIndex = intersection.length / union.length;
      score += jaccardIndex * weights.subjects;
    }

    // 5. Kesamaan Teks / Kata Kunci (Makna & Ciri khas)
    const textA = `${batikA.ciriKhasMotif} ${batikA.makna} ${batikA.deskripsi}`.toLowerCase();
    const textB = `${batikB.ciriKhasMotif} ${batikB.makna} ${batikB.deskripsi}`.toLowerCase();
    
    const keyTerms = ["keraton", "pesisir", "awan", "burung", "geometris", "flora", "alam", "daun", "hewan", "akulturasi", "tionghoa", "jawa", "simetris"];
    let textMatches = 0;
    
    keyTerms.forEach(term => {
      if (textA.includes(term) && textB.includes(term)) {
        textMatches++;
      }
    });

    const keywordRatio = textMatches / keyTerms.length;
    // minimal bobot dasar jika ada kecocokan
    score += Math.min(keywordRatio * 2.5, 1) * weights.keywords;

    return Math.min(Math.round(score), 99); // Batas maksimal kemiripan koleksi lain adalah 99%
  }

  /**
   * Mendapatkan koleksi yang serupa dengan batik target
   * @param {string} targetId ID batik target
   * @param {Array} [dataset] Dataset batik, fallback ke window.BATIK_DATA
   * @param {number} [limit] Jumlah maksimal batik yang dikembalikan (default 3)
   * @returns {Array} List batik serupa lengkap dengan skor kemiripan: { batik, score }
   */
  function getSimilarItems(targetId, dataset = null, limit = 3) {
    const data = dataset || window.BATIK_DATA || [];
    const target = data.find(item => item.id === targetId);
    
    if (!target) return [];

    return data
      .filter(item => item.id !== targetId)
      .map(item => {
        return {
          batik: item,
          score: computeScore(target, item)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  return {
    computeScore,
    getSimilarItems
  };
})();

window.Similarity = Similarity;
