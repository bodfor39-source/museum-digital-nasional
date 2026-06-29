/**
 * colorblind.js — Mode simulasi buta warna
 * Menggunakan SVG feColorMatrix filter untuk simulasi:
 * - Protanopia (buta merah)
 * - Deuteranopia (buta hijau)
 * - Tritanopia (buta biru)
 * Museum Digital Nasional Indonesia
 */

const ColorBlind = (() => {
  let currentMode = "normal";
  let svgFilter = null;
  let toggleBtn = null;
  let modeLabel = null;
  let accessibilityToggle = null;
  let popupElement = null;
  let popupCloseBtn = null;
  let modeDescription = null;

  // SVG feColorMatrix values untuk setiap mode buta warna
  // Sumber: Coblis Color Blindness Simulator matrices
  const MATRICES = {
    normal: null,
    protanopia: [
      // Buta merah: merah terlihat seperti hijau/gelap
      "0.567, 0.433, 0,     0, 0",
      "0.558, 0.442, 0,     0, 0",
      "0,     0.242, 0.758, 0, 0",
      "0,     0,     0,     1, 0",
    ].join(" "),
    deuteranopia: [
      // Buta hijau: hijau terlihat seperti merah
      "0.625, 0.375, 0,   0, 0",
      "0.7,   0.3,   0,   0, 0",
      "0,     0.3,   0.7, 0, 0",
      "0,     0,     0,   1, 0",
    ].join(" "),
    tritanopia: [
      // Buta biru: biru terlihat seperti hijau
      "0.95, 0.05,  0,     0, 0",
      "0,    0.433, 0.567, 0, 0",
      "0,    0.475, 0.525, 0, 0",
      "0,    0,     0,     1, 0",
    ].join(" "),
  };

  const MODE_LABELS = {
    normal: "Normal",
    protanopia: "Protanopia",
    deuteranopia: "Deuteranopia",
    tritanopia: "Tritanopia",
  };

  function init() {
    createSVGFilter();
    buildUI();
    restoreSavedMode();
  }

  // Sisipkan SVG filter tersembunyi ke dalam DOM
  function createSVGFilter() {
    const existing = document.getElementById("cb-svg-filter");
    if (existing) { svgFilter = existing; return; }

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "cb-svg-filter");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";

    const defs = document.createElementNS(svgNS, "defs");
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "colorblind-filter");
    filter.setAttribute("color-interpolation-filters", "linearRGB");

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("id", "cb-matrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0");

    filter.appendChild(feColorMatrix);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.insertBefore(svg, document.body.firstChild);
    svgFilter = feColorMatrix;
  }

  // Buat UI panel toggle mode buta warna
  function buildUI() {
    accessibilityToggle = document.getElementById("accessibility-toggle");
    popupElement = document.getElementById("colorblind-popup");
    popupCloseBtn = document.getElementById("colorblind-popup-close");
    modeDescription = document.getElementById("cb-description");

    const panels = [popupElement].filter(Boolean);
    panels.forEach((panel) => bindPanelEvents(panel));
    bindPopupEvents();
  }

  function bindPopupEvents() {
    if (accessibilityToggle) {
      accessibilityToggle.addEventListener("click", () => togglePopup());
    }
    if (popupCloseBtn) {
      popupCloseBtn.addEventListener("click", () => closePopup());
    }
    document.addEventListener("click", (e) => {
      if (isPopupOpen() && popupElement && !popupElement.contains(e.target) && !accessibilityToggle.contains(e.target)) {
        closePopup();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isPopupOpen()) closePopup();
    });
  }

  function bindPanelEvents(panel) {
    const buttons = panel.querySelectorAll("[data-cb-mode]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-cb-mode");
        setMode(mode);
      });
    });
  }

  function togglePopup(forceOpen) {
    if (!popupElement) return;
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : popupElement.hidden;
    popupElement.hidden = !shouldOpen;
    popupElement.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    document.body.classList.toggle("body--cb-open", shouldOpen);
    if (accessibilityToggle) {
      accessibilityToggle.setAttribute("aria-expanded", String(shouldOpen));
    }
    if (shouldOpen) {
      const firstButton = popupElement.querySelector("[data-cb-mode]");
      firstButton?.focus();
    }
  }

  function closePopup() {
    togglePopup(false);
  }

  function isPopupOpen() {
    return !!popupElement && !popupElement.hidden;
  }

  function setMode(mode) {
    if (!MATRICES.hasOwnProperty(mode)) return;
    currentMode = mode;

    // Terapkan atau hapus CSS filter pada <html>
    const htmlEl = document.documentElement;

    if (mode === "normal") {
      htmlEl.style.filter = "";
      if (svgFilter) {
        svgFilter.setAttribute(
          "values",
          "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
        );
      }
    } else {
      htmlEl.style.filter = "url(#colorblind-filter)";
      if (svgFilter && MATRICES[mode]) {
        svgFilter.setAttribute("values", MATRICES[mode]);
      }
    }

    // Update tombol aktif
    const allBtns = document.querySelectorAll("[data-cb-mode]");
    allBtns.forEach((btn) => {
      const isActive = btn.getAttribute("data-cb-mode") === mode;
      btn.classList.toggle("cb-btn--active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    // Update label status
    const statusEl = document.getElementById("cb-status");
    if (statusEl) {
      statusEl.textContent = mode === "normal"
        ? "Mode tampilan: Normal"
        : `Mode simulasi: ${MODE_LABELS[mode]}`;
    }

    const descriptionEl = document.getElementById("cb-description");
    if (descriptionEl) {
      descriptionEl.textContent = DESCRIPTION_LABELS[mode];
    }

    // Simpan ke localStorage
    try {
      localStorage.setItem("museum_cb_mode", mode);
    } catch (_) {}

    // Dispatch event untuk komponen lain
    window.dispatchEvent(new CustomEvent("colorblindModeChanged", { detail: { mode } }));
  }

  const DESCRIPTION_LABELS = {
    normal: "Tampilan normal tanpa simulasi buta warna.",
    protanopia: "Simulasi Protanopia: merah tampil lebih gelap dan hijau lebih dominan.",
    deuteranopia: "Simulasi Deuteranopia: hijau tampil lebih gelap dan merah lebih dominan.",
    tritanopia: "Simulasi Tritanopia: biru tampil lebih gelap dan kuning lebih dominan.",
  };

  function restoreSavedMode() {
    try {
      const saved = localStorage.getItem("museum_cb_mode");
      if (saved && MATRICES.hasOwnProperty(saved)) {
        setMode(saved);
      }
    } catch (_) {}
  }

  function getCurrentMode() {
    return currentMode;
  }

  return { init, setMode, getCurrentMode, MODE_LABELS };
})();

window.ColorBlind = ColorBlind;
