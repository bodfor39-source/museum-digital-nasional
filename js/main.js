/**
 * main.js — Entry point & orchestrator
 * Menginisialisasi semua modul setelah DOM siap
 * Museum Digital Nasional Indonesia
 */

(function () {
  "use strict";

  function initAll() {
    // Inisialisasi modul-modul
    if (window.Nav) Nav.init();
    if (window.Modal) Modal.init();
    if (window.Auth) Auth.init();
    if (window.Admin) Admin.init();
    if (window.Explorer) Explorer.init();
    if (window.ColorBlind) ColorBlind.init();

    // Observer untuk section highlight di nav
    if (window.Nav) Nav.setupSectionObserver();

    // Animasi scroll reveal
    setupScrollReveal();

    // Hero video fallback
    setupHeroVideo();

    // Smooth anchor scroll dari tombol CTA
    setupHeroCTA();

    // Muat statistik
    renderStats();

    console.info("Museum Digital Nasional Indonesia — siap. 🏛️");
  }

  // Scroll reveal: elemen dengan class .reveal muncul saat masuk viewport
  function setupScrollReveal() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal--visible"));
      return;
    }

    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // Hero video: pastikan berjalan, atau sembunyikan jika gagal
  function setupHeroVideo() {
    const video = document.getElementById("hero-video");
    if (!video) return;

    // Pause video jika prefers-reduced-motion aktif
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }

    video.play().catch(() => {
      // Jika video gagal diputar, tampilkan fallback background
      const heroSection = document.getElementById("hero");
      if (heroSection) heroSection.classList.add("hero--no-video");
    });
  }

  // Tombol CTA di hero — scroll ke section koleksi
  function setupHeroCTA() {
    const ctaBtn = document.getElementById("hero-cta");
    if (!ctaBtn) return;

    ctaBtn.addEventListener("click", () => {
      const target = document.getElementById("koleksi");
      if (target && window.Nav) {
        Nav.scrollToSection(target);
      }
    });
  }

  // Hitung dan tampilkan statistik koleksi
  function renderStats() {
    const data = window.BATIK_DATA || [];
    const regions = new Set(data.map((m) => m.region));

    setText("stat-count", String(data.length));
    setText("stat-regions", String(regions.size));
    setText("stat-centuries", "8"); // Dari abad XIII sampai XX

    function setText(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  // Jalankan setelah DOM selesai dimuat
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
