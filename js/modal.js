/**
 * modal.js — Modal detail motif batik
 * Tab: Detail | Metadata CIDOC-CRM | Galeri
 * Museum Digital Nasional Indonesia
 */

const Modal = (() => {
  let modalEl = null;
  let modalOverlay = null;
  let lastFocusedEl = null;

  function init() {
    modalEl      = document.getElementById("motif-modal");
    modalOverlay = document.getElementById("modal-overlay");

    if (!modalEl) {
      createModalDOM();
      modalEl      = document.getElementById("motif-modal");
      modalOverlay = document.getElementById("modal-overlay");
    }
    bindEvents();
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  function createModalDOM() {
    const overlay = document.createElement("div");
    overlay.id        = "modal-overlay";
    overlay.className = "modal-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const modal = document.createElement("div");
    modal.id        = "motif-modal";
    modal.className = "motif-modal";
    modal.setAttribute("role",            "dialog");
    modal.setAttribute("aria-modal",      "true");
    modal.setAttribute("aria-labelledby", "modal-title");

    modal.innerHTML = `
      <div class="modal-inner">
        <button class="modal-close" id="modal-close-btn" aria-label="Tutup detail motif">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div class="modal-layout">

          <!-- ── Kolom kiri ──────────────────────────────── -->
          <div class="modal-image-col">
            <div class="modal-image-wrap">
              <img id="modal-main-img" src="" alt="" loading="lazy" />
              <div id="modal-image-placeholder" class="modal-image-placeholder" aria-hidden="true">
                <span class="modal-image-placeholder-icon">📷</span>
                <span class="modal-image-placeholder-text">Foto sementara</span>
              </div>
            </div>
            <div class="modal-palette">
              <h3 class="modal-palette-title">Palet Warna</h3>
              <div id="modal-colors" class="modal-colors" role="list"></div>
            </div>
          </div>

          <!-- ── Kolom kanan ─────────────────────────────── -->
          <div class="modal-content-col">

            <!-- Header info -->
            <div class="modal-meta">
              <span id="modal-region-badge" class="modal-badge"></span>
              <span id="modal-century"      class="modal-century"></span>
            </div>
            <h2 id="modal-title" class="modal-title"></h2>
            <p  id="modal-asal"  class="modal-asal"></p>

            <!-- Tab bar -->
            <div class="modal-tabs" role="tablist" aria-label="Navigasi konten motif">
              <button class="modal-tab modal-tab--active" role="tab" aria-selected="true"  data-tab="detail">Detail</button>
              <button class="modal-tab"                   role="tab" aria-selected="false" data-tab="metadata">Metadata</button>
              <button class="modal-tab"                   role="tab" aria-selected="false" data-tab="galeri">Galeri</button>
            </div>

            <!-- Panel: Detail -->
            <div class="modal-tab-panel" data-panel="detail">
              <div class="modal-section">
                <h3 class="modal-section-title"><span class="modal-section-icon" aria-hidden="true">◈</span>Ciri Khas Motif</h3>
                <p id="modal-ciri" class="modal-text"></p>
              </div>
              <div class="modal-section">
                <h3 class="modal-section-title"><span class="modal-section-icon" aria-hidden="true">◉</span>Makna Filosofis</h3>
                <p id="modal-makna" class="modal-text"></p>
              </div>
              <div class="modal-section">
                <h3 class="modal-section-title"><span class="modal-section-icon" aria-hidden="true">◎</span>Deskripsi</h3>
                <p id="modal-deskripsi" class="modal-text"></p>
              </div>
            <div id="modal-detail-gallery-section" class="modal-section">
              <h3 class="modal-section-title"><span class="modal-section-icon" aria-hidden="true">◌</span>Foto Terkait</h3>
              <div id="modal-detail-gallery" class="modal-gallery modal-gallery--inline" role="list" aria-label="Foto-foto terkait motif"></div>
            </div>
              <table class="cidoc-table" aria-label="Metadata CIDOC-CRM objek">
                <tbody>
                  <tr><th scope="row">Nomor Inventaris</th><td id="meta-accession">—</td></tr>
                  <tr><th scope="row">Tipe Objek</th>      <td id="meta-type">—</td></tr>
                  <tr><th scope="row">Medium / Bahan</th>  <td id="meta-medium">—</td></tr>
                  <tr><th scope="row">Teknik Pembuatan</th><td id="meta-technique">—</td></tr>
                  <tr><th scope="row">Dimensi</th>         <td id="meta-dimensions">—</td></tr>
                  <tr><th scope="row">Periode Produksi</th><td id="meta-period">—</td></tr>
                  <tr><th scope="row">Tempat Produksi</th> <td id="meta-place">—</td></tr>
                  <tr><th scope="row">Pembuat / Pengrajin</th><td id="meta-actor">—</td></tr>
                  <tr><th scope="row">Lokasi Koleksi</th>  <td id="meta-location">—</td></tr>
                  <tr><th scope="row">Bahasa</th>          <td id="meta-language">—</td></tr>
                  <tr><th scope="row">Penyedia Data</th>   <td id="meta-provider">—</td></tr>
                  <tr><th scope="row">Subjek / Tag</th>    <td id="meta-subjects">—</td></tr>
                  <tr><th scope="row">Hak Cipta</th>       <td id="meta-rights">—</td></tr>
                  <tr><th scope="row">Peneliti / Kontributor</th><td id="meta-contributors">—</td></tr>
                </tbody>
              </table>
              <p class="cidoc-note">
                Metadata menggunakan standar
                <a href="https://www.cidoc-crm.org/" target="_blank" rel="noopener">CIDOC-CRM</a>
                dan <a href="https://dublincore.org/" target="_blank" rel="noopener">Dublin Core</a>.
              </p>
            </div>

            <!-- Panel: Galeri -->
            <div class="modal-tab-panel modal-tab-panel--hidden" data-panel="galeri">
              <div id="modal-gallery" class="modal-gallery" role="list" aria-label="Foto-foto sampel motif"></div>
              <p id="modal-gallery-empty" class="modal-gallery-empty" style="display:none">
                Belum ada foto sampel tersedia untuk motif ini.
              </p>
              <span id="modal-contributor-badge" class="modal-contributor-badge"></span>
            </div>

          </div><!-- /modal-content-col -->
        </div><!-- /modal-layout -->
      </div><!-- /modal-inner -->
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ── Events ───────────────────────────────────────────────────────────────
  function bindEvents() {
    // Tutup modal
    document.addEventListener("click", (e) => {
      if (e.target.closest("#modal-close-btn")) close();
    });

    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) close();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
    });

    // Tab switching
    document.addEventListener("click", (e) => {
      const tab = e.target.closest(".modal-tab");
      if (!tab) return;
      const target = tab.dataset.tab;

      document.querySelectorAll(".modal-tab").forEach((t) => {
        t.classList.remove("modal-tab--active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("modal-tab--active");
      tab.setAttribute("aria-selected", "true");

      document.querySelectorAll(".modal-tab-panel").forEach((p) => {
        p.classList.toggle("modal-tab-panel--hidden", p.dataset.panel !== target);
      });
    });
  }

  // ── Open / Close ─────────────────────────────────────────────────────────
  function open(motifId) {
    const motif = window.BATIK_DATA?.find((m) => m.id === motifId);
    if (!motif || !modalOverlay || !modalEl) return;

    lastFocusedEl = document.activeElement;
    populateModal(motif);

    modalOverlay.classList.add("modal-overlay--open");
    modalEl.classList.add("motif-modal--open");
    modalOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("body--modal-open");

    requestAnimationFrame(() => {
      document.getElementById("modal-close-btn")?.focus();
      setupFocusTrap();
    });

    modalEl.querySelector(".modal-inner")?.scrollTo(0, 0);
  }

  function close() {
    if (!modalOverlay || !modalEl) return;
    modalOverlay.classList.remove("modal-overlay--open");
    modalEl.classList.remove("motif-modal--open");
    modalOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body--modal-open");
    lastFocusedEl?.focus();
    lastFocusedEl = null;
  }

  function isOpen() {
    return modalEl?.classList.contains("motif-modal--open") || false;
  }

  // ── Populate ─────────────────────────────────────────────────────────────
  function populateModal(motif) {
    const c = motif.cidoc || {};

    // Gambar
    const mainImg      = document.getElementById("modal-main-img");
    const mainImgWrap  = document.querySelector(".modal-image-wrap");
    if (mainImg) {
      mainImg.src   = motif.image || "";
      mainImg.alt   = `Motif batik ${motif.nama} dari ${motif.asal}`;
      mainImg.style.display = "block";
      mainImg.onerror = function () {
        this.style.display = "none";
        if (mainImgWrap) mainImgWrap.classList.add("image-fallback-active");
      };
      mainImg.onload = function () {
        this.style.display = "block";
        if (mainImgWrap) mainImgWrap.classList.remove("image-fallback-active");
      };
    }
    if (mainImgWrap) {
      mainImgWrap.classList.toggle("image-fallback-active", !motif.image);
    }

    // Header
    setText("modal-title",   motif.nama);
    setText("modal-asal",    motif.asal);
    setText("modal-century", `Abad ke-${motif.abad}`);

    const regionBadge = document.getElementById("modal-region-badge");
    if (regionBadge) {
      regionBadge.textContent =
        window.REGIONS?.find((r) => r.value === motif.region)?.label || motif.region;
    }

    // Panel detail
    setText("modal-ciri",      motif.ciriKhas || motif.ciriKhasMotif || "—");
    setText("modal-makna",     motif.makna    || "—");
    setText("modal-deskripsi", motif.deskripsi|| "—");

    // Palet warna
    const colorsContainer = document.getElementById("modal-colors");
    if (colorsContainer && motif.colors) {
      colorsContainer.innerHTML = motif.colors.map((col) => `
        <div class="color-swatch-item" role="listitem">
          <div class="color-swatch-circle" style="background-color:${col.hex};" title="${col.name}: ${col.hex}"></div>
          <div class="color-swatch-info">
            <span class="color-swatch-name">${col.name}</span>
            <code class="color-swatch-hex">${col.hex}</code>
          </div>
        </div>`).join("");
    }

    // Panel galeri
    const gallerySources = getGallerySources(motif);
    const gallery = document.getElementById("modal-gallery");
    if (gallery) {
      gallery.innerHTML = gallerySources.map((src, i) => `
        <div class="modal-gallery-item" role="listitem">
          <img src="${src}" alt="Sampel ${i + 1} motif ${motif.nama}" loading="lazy"
               onerror="this.parentElement.style.display='none'" />
        </div>`).join("");
    }
    const detailGallerySection = document.getElementById("modal-detail-gallery-section");
    if (detailGallerySection) {
      detailGallerySection.hidden = gallerySources.length === 0;
    }
    const detailGallery = document.getElementById("modal-detail-gallery");
    if (detailGallery) {
      detailGallery.innerHTML = gallerySources.map((src, i) => `
        <div class="modal-gallery-item" role="listitem">
          <img src="${src}" alt="Foto terkait ${i + 1} motif ${motif.nama}" loading="lazy"
               onerror="this.parentElement.style.display='none'" />
        </div>`).join("");
    }
    const galleryEmpty = document.getElementById("modal-gallery-empty");
    if (galleryEmpty) {
      galleryEmpty.style.display = gallerySources.length === 0 ? "block" : "none";
    }
    const badge = document.getElementById("modal-contributor-badge");
    if (badge) badge.textContent = c.kontributor ? `${c.kontributor} kontributor` : "";

    // Panel metadata CIDOC-CRM
    setMetaText("meta-accession",  c.accessionNumber);
    setMetaText("meta-type",       c.objectType);
    setMetaText("meta-medium",     c.medium);
    setMetaText("meta-technique",  c.technique);
    setMetaText("meta-dimensions", c.dimensions);
    setMetaText("meta-period",     c.production?.period);
    setMetaText("meta-place",      c.production?.place);
    setMetaText("meta-actor",      c.production?.actor);
    setMetaText("meta-location",   c.currentLocation);
    setMetaText("meta-language",   c.language === "id" ? "Bahasa Indonesia" : (c.language || "—"));
    setMetaText("meta-provider",   c.provider);
    setMetaText("meta-subjects",   (c.subjects || []).join(" · "));

    // Hak cipta sebagai link
    const rightsEl = document.getElementById("meta-rights");
    if (rightsEl) {
      rightsEl.innerHTML = c.rightsURI
        ? `<a href="${c.rightsURI}" target="_blank" rel="noopener" class="rights-link">${c.rights || "Lihat lisensi"}</a>`
        : (c.rights || "—");
    }

    // Daftar kontributor
    const contribEl = document.getElementById("meta-contributors");
    if (contribEl) {
      if (c.contributors && c.contributors.length > 0) {
        contribEl.innerHTML = c.contributors
          .map((k) => `<span class="contrib-item">${k.nama} <code>${k.nim}</code></span>`)
          .join("");
      } else {
        contribEl.textContent = "—";
      }
    }

    // Reset ke tab pertama
    document.querySelectorAll(".modal-tab").forEach((t, i) => {
      t.classList.toggle("modal-tab--active", i === 0);
      t.setAttribute("aria-selected", i === 0 ? "true" : "false");
    });
    document.querySelectorAll(".modal-tab-panel").forEach((p, i) => {
      p.classList.toggle("modal-tab-panel--hidden", i !== 0);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getGallerySources(motif) {
    if (!Array.isArray(motif.samples)) return [];
    return motif.samples.filter(Boolean).slice(0, 8);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setMetaText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || "—";
  }

  function setupFocusTrap() {
    if (!modalEl) return;
    const sel = `a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])`;
    const els = Array.from(modalEl.querySelectorAll(sel));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    const trap = (e) => {
      if (e.key !== "Tab") return;
      if (!isOpen()) { document.removeEventListener("keydown", trap); return; }
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener("keydown", trap);
  }

  return { init, open, close, isOpen };
})();

window.Modal = Modal;
