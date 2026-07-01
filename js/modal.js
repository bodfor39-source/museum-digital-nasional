/**
 * modal.js — Modal detail motif batik
 * Tab: Detail | Metadata CIDOC-CRM | Galeri
 * Museum Digital Nasional Indonesia
 */

const Modal = (() => {
  let modalEl = null;
  let modalOverlay = null;
  let lastFocusedEl = null;
  let currentMotifId = null;

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
              <button class="modal-tab"                   role="tab" aria-selected="false" data-tab="forum">Forum Saran</button>
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
            <div id="modal-similar-section" class="modal-section">
              <h3 class="modal-section-title"><span class="modal-section-icon" aria-hidden="true">💎</span>Koleksi Serupa (AI Recommendation)</h3>
              <div id="modal-similar-list" class="modal-similar-list" role="list" aria-label="Koleksi motif serupa"></div>
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

            <!-- Panel: Forum -->
            <div class="modal-tab-panel modal-tab-panel--hidden" data-panel="forum">
              <div class="forum-container">
                <div id="forum-comments-list" class="forum-comments-list" aria-live="polite"></div>
                
                <div id="forum-auth-prompt" class="forum-auth-prompt" style="display:none; text-align:center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 15px;">
                  <p style="margin-bottom: 10px;">Silakan masuk (login) untuk ikut memberikan saran atau kesan.</p>
                  <button id="btn-forum-login" class="btn-primary btn-small">Masuk / Daftar</button>
                </div>
                
                <form id="forum-comment-form" class="forum-comment-form" style="display:none; margin-top: 20px; display:flex; flex-direction:column; gap:10px;">
                  <textarea id="forum-comment-text" class="form-input" placeholder="Tulis saran atau kesan Anda..." required rows="3" style="resize:vertical;"></textarea>
                  <button type="submit" class="btn-primary" style="align-self:flex-end;">Kirim Saran</button>
                </form>
              </div>
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

    // Forum event bindings
    const forumForm = document.getElementById("forum-comment-form");
    if (forumForm) {
      forumForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const textInput = document.getElementById("forum-comment-text");
        const text = textInput.value.trim();
        if (!text || !currentMotifId) return;
        
        const currentUser = window.Auth?.getCurrentUser();
        if (!currentUser) return;
        
        const comments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
        comments.push({
          id: "cmt_" + Date.now() + "_" + Math.floor(Math.random()*1000),
          batikId: currentMotifId,
          username: currentUser.username,
          text: text,
          date: new Date().toISOString()
        });
        localStorage.setItem("museum_comments", JSON.stringify(comments));
        
        textInput.value = "";
        renderForum();
      });
    }

    const btnForumLogin = document.getElementById("btn-forum-login");
    if (btnForumLogin) {
      btnForumLogin.addEventListener("click", () => {
        const loginBtn = document.getElementById("login-button");
        if (loginBtn) loginBtn.click();
      });
    }

    // Dengarkan perubahan login untuk merender ulang forum jika modal terbuka
    window.addEventListener("authStateChanged", () => {
      if (isOpen() && currentMotifId) {
        renderForum();
      }
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

    currentMotifId = motifId;
    lastFocusedEl = document.activeElement;
    populateModal(motif);
    renderForum();

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
    currentMotifId = null;
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

    // Render Koleksi Serupa (Similar Collection)
    const similarContainer = document.getElementById("modal-similar-list");
    if (similarContainer && window.Similarity) {
      const similarItems = window.Similarity.getSimilarItems(motif.id);
      similarContainer.innerHTML = similarItems.map(item => `
        <button class="similar-item-card" type="button" data-id="${item.batik.id}" aria-label="Lihat batik serupa ${item.batik.nama}">
          <img src="${item.batik.image}" alt="Batik ${item.batik.nama}" class="similar-item-card__img" />
          <div class="similar-item-card__info">
            <p class="similar-item-card__name">${item.batik.nama}</p>
            <span class="similar-item-card__match">${item.score}% mirip</span>
          </div>
        </button>
      `).join("");

      similarContainer.querySelectorAll(".similar-item-card").forEach(card => {
        card.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetId = card.dataset.id;
          if (targetId) {
            open(targetId);
          }
        });
      });
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

  // ── Forum / Comments ─────────────────────────────────────────────────────
  function renderForum() {
    const listContainer = document.getElementById("forum-comments-list");
    const authPrompt = document.getElementById("forum-auth-prompt");
    const commentForm = document.getElementById("forum-comment-form");
    
    if (!listContainer || !currentMotifId) return;

    const currentUser = window.Auth?.getCurrentUser();
    const isAdmin = currentUser?.isAdmin;
    
    if (currentUser) {
      authPrompt.style.display = "none";
      commentForm.style.display = "flex";
    } else {
      authPrompt.style.display = "block";
      commentForm.style.display = "none";
    }

    const allComments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    const motifComments = allComments.filter(c => c.batikId === currentMotifId);

    if (motifComments.length === 0) {
      listContainer.innerHTML = '<p style="color:var(--navy-300); font-style:italic;">Belum ada saran atau diskusi untuk koleksi ini. Jadilah yang pertama!</p>';
    } else {
      listContainer.innerHTML = motifComments.map(c => `
        <div class="forum-comment" style="padding: 12px; background: rgba(0,0,0,0.03); border-radius: 8px; margin-bottom: 10px; border-left: 4px solid var(--gold-500); position: relative;">
          <strong style="color: var(--navy-800); display:block; margin-bottom:4px;">${c.username}</strong>
          <p style="margin: 0; font-size: 0.95rem;">${c.text}</p>
          <span style="font-size: 0.75rem; color: var(--navy-400); display:block; margin-top:6px;">
            ${new Date(c.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
          </span>
          ${isAdmin ? `<button class="btn-delete-comment" data-id="${c.id}" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: #dc3545; cursor: pointer; font-size: 1.1rem;" title="Hapus Saran (Admin)">🗑️</button>` : ""}
        </div>
      `).join('');

      // Bind delete events for admin
      if (isAdmin) {
        listContainer.querySelectorAll('.btn-delete-comment').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const commentId = e.target.dataset.id;
            deleteComment(commentId);
          });
        });
      }
    }
  }

  function deleteComment(id) {
    if (!confirm("Admin: Anda yakin ingin menghapus saran ini?")) return;
    let allComments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    allComments = allComments.filter(c => c.id !== id);
    localStorage.setItem("museum_comments", JSON.stringify(allComments));
    renderForum();
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
