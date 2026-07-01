/**
 * gemini.js — Integrasi Gemini API Klien-Sisi
 * Menyimpan API Key di localStorage agar aman dan memanggil model AI langsung dari browser.
 * Museum Digital Nasional Indonesia
 */

const GeminiAPI = (() => {
  const KEY_STORAGE = "gemini_api_key";
  
  function getApiKey() {
    return localStorage.getItem(KEY_STORAGE) || "";
  }

  function setApiKey(key) {
    if (key) {
      localStorage.setItem(KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(KEY_STORAGE);
    }
    // Kirim event perubahan kunci
    window.dispatchEvent(new CustomEvent("geminiKeyChanged", { detail: { hasKey: !!key } }));
  }

  function hasKey() {
    return !!getApiKey();
  }

  /**
   * Memanggil Gemini API menggunakan Fetch
   * @param {string} prompt Prompt teks untuk AI
   * @param {string} [systemInstruction] Instruksi sistem penuntun peran AI
   * @param {boolean} [forceJson] Jika true, mewajibkan output berupa JSON valid
   * @returns {Promise<string>} Hasil teks respons AI
   */
  async function generateContent(prompt, systemInstruction = "", forceJson = false) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API Key Gemini belum dikonfigurasi. Silakan masukkan API Key di AI Center.");
    }

    // Menggunakan model gemini-1.5-flash karena ringan dan cepat untuk web
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (forceJson) {
      requestBody.generationConfig = {
        responseMimeType: "application/json"
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText || "Gagal menghubungi API";
      throw new Error(`Gemini API Error (${response.status}): ${message}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("Respons dari Gemini API kosong atau tidak valid.");
    }

    return responseText;
  }

  // Menyediakan UI input API Key sederhana di halaman
  function createApiKeyWidget(containerId, successCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const updateWidgetState = () => {
      const isConfigured = hasKey();
      const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
      const isAdmin = currentUser && currentUser.isAdmin;

      if (!isAdmin) {
        container.innerHTML = `
          <div class="api-key-widget glass-card">
            <div class="api-key-widget__header">
              <span class="api-key-widget__icon">⚠️</span>
              <div class="api-key-widget__title-group">
                <h4 class="api-key-widget__title">Akses Dibatasi (Admin Only)</h4>
                <p class="api-key-widget__subtitle">
                  Fitur ini memerlukan API Key Gemini. Hanya Administrator yang dapat mengkonfigurasi kunci API. Silakan login sebagai admin.
                </p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="api-key-widget glass-card">
          <div class="api-key-widget__header">
            <span class="api-key-widget__icon">${isConfigured ? "🔒" : "⚠️"}</span>
            <div class="api-key-widget__title-group">
              <h4 class="api-key-widget__title">${isConfigured ? "Kunci API Terkonfigurasi" : "Kunci API Gemini Diperlukan"}</h4>
              <p class="api-key-widget__subtitle">
                ${isConfigured 
                  ? "Fitur AI menggunakan API Key Gemini Anda yang disimpan secara lokal di browser Anda." 
                  : "Untuk fitur AI optimal (Curator & pencarian pintar), silakan masukkan Gemini API Key Anda."}
              </p>
            </div>
          </div>
          
          <div class="api-key-widget__form" style="margin-top: 15px; display: flex; gap: 10px; width:100%; flex-wrap: wrap;">
            <input 
              id="gemini-key-input" 
              type="password" 
              placeholder="AIzaSy..." 
              value="${isConfigured ? "••••••••••••••••••••••••••••" : ""}" 
              class="form-input" 
              style="flex: 1; min-width: 200px;" 
              ${isConfigured ? "disabled" : ""}
            />
            ${isConfigured 
              ? `<button id="btn-change-key" class="btn-ghost btn-small">Ganti Kunci</button>`
              : `<button id="btn-save-key" class="btn-primary btn-small">Simpan Kunci</button>`}
          </div>
          <p class="api-key-widget__hint" style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
            Dapatkan kunci gratis di <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio</a>.
          </p>
        </div>
      `;

      // Event listener
      const saveBtn = document.getElementById("btn-save-key");
      const changeBtn = document.getElementById("btn-change-key");
      const input = document.getElementById("gemini-key-input");

      if (saveBtn && input) {
        saveBtn.addEventListener("click", () => {
          const key = input.value.trim();
          if (!key) return;
          setApiKey(key);
          updateWidgetState();
          if (successCallback) successCallback(true);
        });
      }

      if (changeBtn) {
        changeBtn.addEventListener("click", () => {
          setApiKey("");
          updateWidgetState();
          if (successCallback) successCallback(false);
        });
      }
    };

    updateWidgetState();
    window.addEventListener("authStateChanged", updateWidgetState);
  }

  return {
    getApiKey,
    setApiKey,
    hasKey,
    generateContent,
    createApiKeyWidget
  };
})();

window.GeminiAPI = GeminiAPI;
