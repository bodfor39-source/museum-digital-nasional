/**
 * explorer.js — Grid koleksi, pencarian, filter wilayah & warna
 * Europeana-style cards dengan metadata CIDOC
 * Museum Digital Nasional Indonesia
 */

const Explorer = (() => {
  let searchInput, regionSelect, colorSwatchContainer, resultsCounter, gridContainer;
  let activeRegion = "all";
  let activeColors = new Set();
  let searchQuery  = "";
  let debounceTimer = null;
  let favoriteIds = new Set();
  let showFavoritesOnly = false;

  function init() {
    searchInput          = document.getElementById("search-input");
    regionSelect         = document.getElementById("region-filter");
    colorSwatchContainer = document.getElementById("color-swatches");
    resultsCounter       = document.getElementById("results-count");
    gridContainer        = document.getElementById("batik-grid");

    if (!gridContainer) return;

    if (window.Auth) {
      favoriteIds = new Set(window.Auth.getFavoriteIds());
      window.addEventListener("authStateChanged", handleAuthStateChanged);
    }

    buildRegionFilter();
    buildColorSwatches();
    bindEvents();
    renderGrid(window.BATIK_DATA || []);
  }

  function buildRegionFilter() {
    if (!regionSelect || !window.REGIONS) return;
    regionSelect.innerHTML = "";
    window.REGIONS.forEach((r) => {
      const opt = document.createElement("option");
      opt.value       = r.value;
      opt.textContent = r.label;
      regionSelect.appendChild(opt);
    });
  }

  function buildColorSwatches() {
    if (!colorSwatchContainer || !window.COLOR_SWATCHES) return;
    colorSwatchContainer.innerHTML = "";
    window.COLOR_SWATCHES.forEach((swatch) => {
      const btn = document.createElement("button");
      btn.className = "color-filter-btn";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("title",       `Filter warna: ${swatch.name}`);
      btn.setAttribute("aria-label",  `Filter warna ${swatch.name}`);
      btn.dataset.swatchKeywords = swatch.keywords.join(",");
      btn.dataset.swatchName     = swatch.name;

      btn.innerHTML = `
        ${buildPatternSVG(swatch.hex, swatch.pattern)}
        <span class="color-filter-label">${swatch.name}</span>
      `;
      btn.addEventListener("click", () => toggleColorFilter(swatch, btn));
      colorSwatchContainer.appendChild(btn);
    });
  }

  function buildPatternSVG(hex, patternType) {
    const id = `pat-${Math.random().toString(36).slice(2, 7)}`;
    const patterns = {
      diagonal:   `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="3" x2="6" y2="3" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/></pattern>`,
      horizontal: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6"><line x1="0" y1="3" x2="6" y2="3" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/></pattern>`,
      dots:       `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6"><circle cx="3" cy="3" r="1.5" fill="rgba(0,0,0,0.3)"/></pattern>`,
      crosshatch: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6"><line x1="0" y1="0" x2="6" y2="6" stroke="rgba(255,255,255,0.4)" stroke-width="1"/><line x1="6" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.4)" stroke-width="1"/></pattern>`,
      chevron:    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><polyline points="0,4 4,0 8,4" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/></pattern>`,
      zigzag:     `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="4"><polyline points="0,4 4,0 8,4" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/></pattern>`,
      stipple:    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.3)"/><circle cx="6" cy="6" r="1" fill="rgba(0,0,0,0.3)"/></pattern>`,
    };
    const patDef = patterns[patternType] || patterns.dots;
    return `<svg class="color-filter-swatch" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><defs>${patDef}</defs><rect width="40" height="40" fill="${hex}" rx="6"/><rect width="40" height="40" fill="url(#${id})" rx="6"/></svg>`;
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = searchInput.value.trim().toLowerCase();
          applyFilters();
        }, 200);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { searchInput.value = ""; searchQuery = ""; applyFilters(); }
      });
    }
    if (regionSelect) {
      regionSelect.addEventListener("change", () => {
        activeRegion = regionSelect.value;
        applyFilters();
      });
    }
  }

  function toggleColorFilter(swatch, btn) {
    if (activeColors.has(swatch.name)) {
      activeColors.delete(swatch.name);
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("color-filter-btn--active");
    } else {
      activeColors.add(swatch.name);
      btn.setAttribute("aria-pressed", "true");
      btn.classList.add("color-filter-btn--active");
    }
    applyFilters();
  }

  function applyFilters() {
    const data     = window.BATIK_DATA || [];
    const filtered = data.filter((motif) => {
      const matchSearch =
        !searchQuery ||
        motif.nama.toLowerCase().includes(searchQuery) ||
        motif.asal.toLowerCase().includes(searchQuery) ||
        motif.makna.toLowerCase().includes(searchQuery) ||
        motif.ciriKhas.toLowerCase().includes(searchQuery) ||
        motif.deskripsi.toLowerCase().includes(searchQuery) ||
        motif.ciriKhasMotif.toLowerCase().includes(searchQuery) ||
        (motif.cidoc?.subjects || []).some(s => s.toLowerCase().includes(searchQuery)) ||
        (motif.cidoc?.technique || "").toLowerCase().includes(searchQuery);

      const matchRegion = activeRegion === "all" || motif.region === activeRegion;

      let matchColor = true;
      if (activeColors.size > 0) {
        matchColor = [...activeColors].some((colorName) => {
          const swatch = window.COLOR_SWATCHES?.find((s) => s.name === colorName);
          if (!swatch) return false;
          return motif.colors.some((mc) =>
            swatch.keywords.some((kw) => mc.name.toLowerCase().includes(kw))
          );
        });
      }

      const matchFavorites = !showFavoritesOnly || (window.Auth && window.Auth.isLoggedIn() && favoriteIds.has(motif.id));
      return matchSearch && matchRegion && matchColor && matchFavorites;
    });

    renderGrid(filtered);
    updateResultsCount(filtered.length, data.length);
  }

  function updateResultsCount(filtered, total) {
    if (!resultsCounter) return;
    if (showFavoritesOnly && window.Auth && window.Auth.isLoggedIn()) {
      resultsCounter.textContent = filtered === 0
        ? "Tidak ada favorit yang cocok dengan filter saat ini"
        : `${filtered} motif favorit dari ${total} koleksi`;
    } else {
      resultsCounter.textContent =
        filtered === total
          ? `${total} motif dalam koleksi`
          : `${filtered} dari ${total} motif`;
    }
    resultsCounter.setAttribute("aria-live", "polite");
  }

  function renderGrid(motifList) {
    if (!gridContainer) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (motifList.length === 0) {
      gridContainer.innerHTML = `
        <div class="grid-empty" role="status" aria-live="polite">
          <div class="grid-empty-icon" aria-hidden="true">🔍</div>
          <p class="grid-empty-title">Motif tidak ditemukan</p>
          <p class="grid-empty-desc">Coba ubah kata kunci pencarian atau hapus beberapa filter.</p>
          <button class="btn-reset-filter" onclick="Explorer.resetFilters()">Hapus Semua Filter</button>
        </div>`;
      return;
    }

    gridContainer.innerHTML = motifList
      .map((m, i) => createCardHTML(m, i, reducedMotion))
      .join("");

    gridContainer.querySelectorAll(".batik-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.motifId;
        if (id && window.Modal) window.Modal.open(id);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
      });

      const favBtn = card.querySelector(".batik-card__favorite");
      if (favBtn) {
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          const motifId = favBtn.dataset.motifId;
          if (!motifId || !window.Auth) return;
          if (!window.Auth.isLoggedIn()) {
            window.Auth.openLoginModal();
            return;
          }
          const isFav = window.Auth.toggleFavorite(motifId);
          favBtn.classList.toggle("batik-card__favorite--active", isFav);
          favBtn.setAttribute("aria-pressed", String(isFav));
          favBtn.setAttribute("aria-label", isFav ? "Hapus dari favorit" : "Tambah ke favorit");
          favBtn.setAttribute("title", isFav ? "Hapus dari favorit" : "Tambah ke favorit");
        });
        favBtn.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault(); favBtn.click();
          }
        });
      }
    });
  }

  function createCardHTML(motif, index, reducedMotion) {
    const delay      = reducedMotion ? 0 : Math.min(index * 60, 600);
    const c          = motif.cidoc || {};
    const technique  = c.technique || "Batik";
    const accession  = c.accessionNumber || "";
    const century    = motif.abad ? `Abad ${motif.abad}` : "";
    const subjectTags = (c.subjects || []).slice(0, 2)
      .map(s => `<span class="card-tag">${s}</span>`).join("");
    const isFavorite = favoriteIds.has(motif.id);
    const favoriteLabel = isFavorite ? "Hapus dari favorit" : "Tambah ke favorit";

    return `
      <article
        class="batik-card"
        data-motif-id="${motif.id}"
        tabindex="0"
        role="button"
        aria-label="Lihat detail ${motif.nama} dari ${motif.asal}"
        style="animation-delay:${delay}ms"
      >
        <div class="batik-card__image-wrap">
          <button
            class="batik-card__favorite ${isFavorite ? "batik-card__favorite--active" : ""}"
            type="button"
            aria-pressed="${isFavorite}"
            aria-label="${favoriteLabel}"
            title="${favoriteLabel}"
            data-motif-id="${motif.id}"
          >
            <span aria-hidden="true">${isFavorite ? "♥" : "♡"}</span>
          </button>
          <img
            src="${motif.image}"
            alt="Motif batik ${motif.nama}"
            loading="lazy"
            class="batik-card__image"
            onerror="this.style.display='none';this.parentElement.classList.add('image-fallback-active');"
            onload="this.parentElement.classList.remove('image-fallback-active');"
          />
          <div class="batik-card__placeholder" aria-hidden="true">
            <span class="batik-card__placeholder-icon">📷</span>
            <span class="batik-card__placeholder-text">Foto sementara</span>
          </div>
          <div class="batik-card__type-badge">${technique}</div>
        </div>
        <div class="batik-card__body">
          <h3 class="batik-card__name">${motif.nama}</h3>
          <p class="batik-card__origin">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${motif.asal}
          </p>
          <p class="batik-card__snippet">${motif.ciriKhasMotif || ""}</p>
          <div class="batik-card__meta-row">
            ${century    ? `<span class="batik-card__century">${century}</span>` : ""}
            ${accession  ? `<span class="batik-card__accession">${accession}</span>` : ""}
          </div>
          <div class="batik-card__tags">${subjectTags}</div>
          <div class="batik-card__colors" aria-label="Warna utama motif" role="list">
            ${motif.colors.slice(0, 4).map(col =>
              `<span class="batik-card__color-dot" style="background-color:${col.hex}" title="${col.name}" role="listitem" aria-label="${col.name}"></span>`
            ).join("")}
          </div>
          <div class="batik-card__footer">
            <span class="batik-card__view-btn">Lihat Detail →</span>
          </div>
        </div>
      </article>`;
  }

  function resetFilters() {
    searchQuery = ""; activeRegion = "all"; activeColors.clear();
    if (searchInput)  searchInput.value  = "";
    if (regionSelect) regionSelect.value = "all";
    document.querySelectorAll(".color-filter-btn").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("color-filter-btn--active");
    });
    showFavoritesOnly = false;
    const data = window.BATIK_DATA || [];
    renderGrid(data);
    updateResultsCount(data.length, data.length);
  }

  function handleAuthStateChanged(event) {
    favoriteIds = new Set(event.detail?.user?.favorites || []);
    showFavoritesOnly = !!event.detail?.showFavoritesOnly;
    applyFilters();
  }

  return { init, resetFilters, applyFilters };
})();

window.Explorer = Explorer;