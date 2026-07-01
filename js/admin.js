/**
 * admin.js — Panel admin dan manajemen penambahan motif batik
 * Menyimpan data tambahan di localStorage
 * Museum Digital Nasional Indonesia
 */

const Admin = (() => {
  const STORAGE_KEY = "museum_batik_additions";
  let adminPanelButton = null;
  let adminPanel = null;
  let adminPanelClose = null;
  let adminForm = null;
  let adminMessage = null;
  let adminTemplateSelect = null;
  let adminRegionSelect = null;
  let adminSubmitBtn = null;
  let imageUrlInput = null;
  let imageFileInput = null;
  let sampleFileInput = null;
  let sampleFileStatus = null;
  let sampleList = null;
  let imagePreview = null;
  let previewPlaceholder = null;
  let currentPreviewSource = null;
  let pendingSampleSources = [];
  let selectedExistingMotifId = "";

  function init() {
    adminPanelButton = document.getElementById("admin-panel-button");
    adminPanel = document.getElementById("admin-panel");
    adminPanelClose = document.getElementById("admin-panel-close");
    adminForm = document.getElementById("admin-form");
    adminMessage = document.getElementById("admin-message");
    adminTemplateSelect = document.getElementById("admin-template");
    adminRegionSelect = document.getElementById("admin-region");
    adminSubmitBtn = document.getElementById("admin-submit-btn");
    imageUrlInput = document.getElementById("admin-image-url");
    imageFileInput = document.getElementById("admin-image-file");
    sampleFileInput = document.getElementById("admin-sample-files");
    sampleFileStatus = document.getElementById("admin-sample-file-status");
    sampleList = document.getElementById("admin-sample-list");
    imagePreview = document.getElementById("admin-image-preview");
    previewPlaceholder = document.getElementById("admin-image-placeholder");

    if (!adminPanelButton || !adminPanel || !adminForm) return;

    bindEvents();
    populateRegionOptions();
    loadSavedMotifs();
    populateMotifOptions();
    updateAdminButtonState(window.Auth?.getCurrentUser());

    if (window.Auth) {
      window.addEventListener("authStateChanged", (event) => {
        updateAdminButtonState(event.detail?.user);
      });
    }
  }

  function bindEvents() {
    adminPanelButton.addEventListener("click", openAdminPanel);
    adminPanelClose.addEventListener("click", closeAdminPanel);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && adminPanel && !adminPanel.hidden) {
        closeAdminPanel();
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target === adminPanel) {
        closeAdminPanel();
      }
    });

    if (adminForm) {
      adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveAdminMotif();
      });
    }

    if (adminTemplateSelect) {
      adminTemplateSelect.addEventListener("change", handleTemplateChange);
    }

    if (imageFileInput) {
      imageFileInput.addEventListener("change", handleImageFileSelect);
    }

    if (sampleFileInput) {
      sampleFileInput.addEventListener("change", handleSampleFileSelect);
    }

    const samplesInput = document.getElementById("admin-samples");
    if (samplesInput) {
      samplesInput.addEventListener("input", renderSampleList);
    }

    if (imageUrlInput) {
      imageUrlInput.addEventListener("change", handleImageUrlChange);
      imageUrlInput.addEventListener("blur", handleImageUrlChange);
    }

    const adminDeleteBtn = document.getElementById("admin-delete-btn");
    if (adminDeleteBtn) {
      adminDeleteBtn.addEventListener("click", () => {
        if (selectedExistingMotifId) {
          deleteMotif(selectedExistingMotifId);
        }
      });
    }
  }

  function populateRegionOptions() {
    if (!adminRegionSelect || !window.REGIONS) return;
    adminRegionSelect.innerHTML = "";
    window.REGIONS.forEach((region) => {
      const option = document.createElement("option");
      option.value = region.value;
      option.textContent = region.label;
      adminRegionSelect.appendChild(option);
    });
  }

  function populateMotifOptions() {
    if (!adminTemplateSelect || !window.BATIK_DATA) return;
    const currentValue = adminTemplateSelect.value;
    adminTemplateSelect.innerHTML = '<option value="">Tambah motif baru</option>';

    [...window.BATIK_DATA]
      .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"))
      .forEach((motif) => {
        const option = document.createElement("option");
        option.value = motif.id;
        option.textContent = motif.nama;
        adminTemplateSelect.appendChild(option);
      });

    if (currentValue && window.BATIK_DATA.some((motif) => motif.id === currentValue)) {
      adminTemplateSelect.value = currentValue;
    }
  }

  function loadSavedMotifs() {
    if (!window.BATIK_DATA) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const extraMotifs = JSON.parse(stored);
      if (!Array.isArray(extraMotifs)) return;
      extraMotifs.forEach((motif) => {
        const existingIndex = window.BATIK_DATA.findIndex((item) => item.id === motif.id);
        if (existingIndex >= 0) {
          window.BATIK_DATA[existingIndex] = motif;
        } else {
          window.BATIK_DATA.push(motif);
        }
      });
    } catch (error) {
      console.warn("Gagal memuat motif tambahan admin", error);
    }
  }

  function saveMotif(motif) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const extraMotifs = stored ? JSON.parse(stored) : [];
      const filtered = Array.isArray(extraMotifs) ? extraMotifs.filter((item) => item.id !== motif.id) : [];
      filtered.unshift(motif);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn("Gagal menyimpan motif tambahan", error);
    }
  }

  function deleteMotif(motifId) {
    if (!confirm("Admin: Anda yakin ingin menghapus motif ini beserta semua datanya secara permanen?")) return;
    
    // Hapus dari localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const extraMotifs = JSON.parse(stored);
        if (Array.isArray(extraMotifs)) {
          const filtered = extraMotifs.filter((item) => item.id !== motifId);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.warn("Gagal menghapus motif dari localStorage", error);
    }

    // Hapus dari BATIK_DATA in memory
    const existingIndex = window.BATIK_DATA.findIndex((item) => item.id === motifId);
    if (existingIndex >= 0) {
      window.BATIK_DATA.splice(existingIndex, 1);
    }

    resetAdminForm({ keepTemplate: false });
    populateMotifOptions();
    updateSubmitMode();
    renderAdminMessage("Motif berhasil dihapus dari koleksi.", "success");

    if (window.Explorer) {
      window.Explorer.applyFilters();
    }
  }

  function openAdminPanel() {
    if (!adminPanel || !window.Auth?.isLoggedIn() || !window.Auth.getCurrentUser()?.isAdmin) return;
    adminPanel.hidden = false;
    adminPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("body--menu-open");
    adminPanel.querySelector("[role=dialog]")?.focus();
  }

  function closeAdminPanel() {
    if (!adminPanel) return;
    adminPanel.hidden = true;
    adminPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body--menu-open");
    adminPanelButton?.focus();
  }

  function updateAdminButtonState(user) {
    if (!adminPanelButton) return;
    adminPanelButton.hidden = !user?.isAdmin;
  }

  function saveAdminMotif() {
    const name = document.getElementById("admin-name")?.value.trim();
    const origin = document.getElementById("admin-origin")?.value.trim();
    const century = document.getElementById("admin-century")?.value.trim();
    const region = document.getElementById("admin-region")?.value;

    const imageUrl = (document.getElementById("admin-image-url")?.value || "").trim();
    const feature = document.getElementById("admin-feature")?.value.trim();
    const meaning = document.getElementById("admin-meaning")?.value.trim();
    const description = document.getElementById("admin-description")?.value.trim();
    const colorInput = (document.getElementById("admin-colors")?.value || "").trim();

    // Foto terkait (sampel/galeri) — admin bisa masukkan beberapa URL/paths sekaligus.
    // Pisahkan dengan koma.
    // Untuk kebutuhan kamu: bila admin memilih motif “batik yang sudah ada”,
    // maka field ini akan otomatis terisi dari motif yang ada (kecuali admin mengganti).
    const samplesInput = (document.getElementById("admin-samples")?.value || "").trim();
    const sampleSources = samplesInput
      ? samplesInput
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
    const combinedSampleSources = uniqueSources([...sampleSources, ...pendingSampleSources]);

    const subjects = (document.getElementById("admin-subjects")?.value || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const accession = (document.getElementById("admin-accession")?.value || "").trim();

    if (!name || !origin || !century || !region || !feature || !meaning || !description || !colorInput) {
      renderAdminMessage("Mohon isi semua kolom wajib kecuali URL foto atau unggah foto.", "error");
      return;
    }

    // Jika admin unggah foto, itu akan dipakai otomatis (menggantikan URL bila diisi).
    const imageSource = currentPreviewSource || imageUrl || "img/placeholder.jpg";
    const existingMotif = selectedExistingMotifId
      ? window.BATIK_DATA.find((item) => item.id === selectedExistingMotifId)
      : null;
    const motifId = existingMotif?.id || generateSlug(name);
    const colors = parseColorList(colorInput, existingMotif?.colors);
    const subjectTags = subjects.length > 0 ? subjects : ["Tekstil", "Batik"];

    const motif = {
      id: existingMotif ? motifId : ensureUniqueId(motifId),
      nama: name,
      asal: origin,
      abad: century,

      // Ini yang menentukan "masuk ke bagian mana batiknya" di koleksi.
      region: region,

      image: imageSource,
      emoji: existingMotif?.emoji || "🎨",
      // Jika admin isi “foto terkait”, gunakan itu.
      // Kalau tidak ada, fallback pakai image utama.
      samples:
        combinedSampleSources.length > 0
          ? combinedSampleSources
          : imageSource
            ? [imageSource]
            : [],

      // Konsisten dengan explorer.js (yang mencari motif.ciriKhasMotif)
      ciriKhasMotif: feature,
      ciriKhas: feature,

      makna: meaning,
      deskripsi: description,
      colors: colors,

      cidoc: {
        objectType: existingMotif?.cidoc?.objectType || "Kain Batik",
        medium: existingMotif?.cidoc?.medium || "Kain mori, malam (lilin batik), pewarna alam atau sintetis",
        technique: existingMotif?.cidoc?.technique || "Batik",
        dimensions: existingMotif?.cidoc?.dimensions || "-",
        production: {
          period: century,
          place: origin,
          actor: existingMotif?.cidoc?.production?.actor || "Admin Museum Digital",
          actorType: existingMotif?.cidoc?.production?.actorType || "Admin digital",
        },
        currentLocation: existingMotif?.cidoc?.currentLocation || "Museum Digital Nasional Indonesia",
        accessionNumber:
          accession ||
          existingMotif?.cidoc?.accessionNumber ||
          `MDN-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
        subjects: subjectTags,
        language: existingMotif?.cidoc?.language || "id",
        rights: existingMotif?.cidoc?.rights || "CC BY-NC-SA 4.0",
        rightsURI: existingMotif?.cidoc?.rightsURI || "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        provider: existingMotif?.cidoc?.provider || "Museum Digital Nasional Indonesia",
        kontributor: existingMotif?.cidoc?.kontributor || 1,
        contributors: existingMotif?.cidoc?.contributors || [{ nim: "admin", nama: "Admin Museum Digital" }],
      },
    };

    const existingIndex = window.BATIK_DATA.findIndex((item) => item.id === motif.id);
    if (existingIndex >= 0) {
      window.BATIK_DATA[existingIndex] = motif;
    } else {
      window.BATIK_DATA.push(motif);
    }

    saveMotif(motif);
    populateMotifOptions();
    if (window.Explorer) {
      // Pastikan grid langsung refresh dengan filter yang sedang aktif.
      window.Explorer.applyFilters();
    }

    resetAdminForm();
    renderAdminMessage(
      existingMotif
        ? `Motif "${name}" berhasil diperbarui.`
        : `Motif "${name}" berhasil ditambahkan ke koleksi.`,
      "success"
    );
  }

  function handleTemplateChange() {
    selectedExistingMotifId = adminTemplateSelect?.value || "";
    const motif = selectedExistingMotifId
      ? window.BATIK_DATA.find((item) => item.id === selectedExistingMotifId)
      : null;

    if (!motif) {
      resetAdminForm({ keepTemplate: true });
      updateSubmitMode();
      renderAdminMessage("Mode tambah motif baru. Isi data batik secara manual.", "info");
      return;
    }

    fillFormFromMotif(motif);
    updateSubmitMode();
    renderAdminMessage(`Data "${motif.nama}" sudah terisi otomatis. Ganti foto jika perlu, lalu simpan.`, "info");
  }

  function fillFormFromMotif(motif) {
    setValue("admin-name", motif.nama);
    setValue("admin-origin", motif.asal);
    setValue("admin-century", motif.abad);
    setValue("admin-region", motif.region);
    setValue("admin-image-url", motif.image);
    setValue("admin-samples", Array.isArray(motif.samples) ? motif.samples.join(", ") : "");
    setValue("admin-feature", motif.ciriKhasMotif || motif.ciriKhas || "");
    setValue("admin-meaning", motif.makna);
    setValue("admin-description", motif.deskripsi);
    setValue("admin-colors", Array.isArray(motif.colors) ? motif.colors.map((color) => color.name).join(", ") : "");
    setValue("admin-subjects", Array.isArray(motif.cidoc?.subjects) ? motif.cidoc.subjects.join(", ") : "");
    setValue("admin-accession", motif.cidoc?.accessionNumber || "");

    if (imageFileInput) imageFileInput.value = "";
    if (sampleFileInput) sampleFileInput.value = "";
    pendingSampleSources = [];
    updateSampleFileStatus();
    renderSampleList();
    currentPreviewSource = motif.image || null;
    if (currentPreviewSource) {
      showPreviewImage(currentPreviewSource);
    } else {
      hidePreviewImage();
    }
  }

  function setValue(id, value = "") {
    const field = document.getElementById(id);
    if (field) field.value = value || "";
  }

  function updateSubmitMode() {
    if (adminSubmitBtn) {
      adminSubmitBtn.textContent = selectedExistingMotifId ? "Simpan Perubahan" : "Tambah Motif";
    }
    const adminDeleteBtn = document.getElementById("admin-delete-btn");
    if (adminDeleteBtn) {
      adminDeleteBtn.style.display = selectedExistingMotifId ? "block" : "none";
    }
  }

  function generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  }

  function ensureUniqueId(baseId) {
    let id = baseId;
    let counter = 1;
    while (window.BATIK_DATA.some((item) => item.id === id)) {
      id = `${baseId}-${counter}`;
      counter += 1;
    }
    return id;
  }

  function parseColorList(input, existingColors = []) {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((colorName) => {
        const existingColor = existingColors.find(
          (color) => color.name.toLowerCase() === colorName.toLowerCase()
        );
        const matched = window.COLOR_SWATCHES?.find(
          (swatch) => {
            const normalizedColor = colorName.toLowerCase();
            return (
              swatch.name.toLowerCase() === normalizedColor ||
              swatch.keywords.some((keyword) => normalizedColor.includes(keyword.toLowerCase()))
            );
          }
        );
        return {
          name: colorName,
          hex: existingColor?.hex || matched?.hex || "#999999",
        };
      });
  }

  function handleImageFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentPreviewSource = reader.result;
      showPreviewImage(currentPreviewSource);
    };
    reader.readAsDataURL(file);
  }

  function handleSampleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    pendingSampleSources = [];

    if (files.length === 0) {
      updateSampleFileStatus();
      return;
    }

    Promise.all(files.map(readFileAsDataUrl))
      .then((sources) => {
        pendingSampleSources = sources.filter(Boolean);
        updateSampleFileStatus();
        renderSampleList();
      })
      .catch(() => {
        pendingSampleSources = [];
        updateSampleFileStatus("Gagal membaca foto terkait. Coba pilih ulang file.");
        renderSampleList();
      });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updateSampleFileStatus(message) {
    if (!sampleFileStatus) return;
    if (message) {
      sampleFileStatus.textContent = message;
      return;
    }
    sampleFileStatus.textContent =
      pendingSampleSources.length > 0
        ? `${pendingSampleSources.length} foto terkait siap ditambahkan saat disimpan.`
        : "Belum ada foto terkait baru dipilih.";
  }

  function renderSampleList() {
    if (!sampleList) return;
    const savedSources = getSampleInputSources();
    const pendingSources = pendingSampleSources.map((src, index) => ({
      src,
      label: `Foto baru ${index + 1}`,
      type: "pending",
      index,
    }));
    const items = [
      ...savedSources.map((src, index) => ({
        src,
        label: src,
        type: "saved",
        index,
      })),
      ...pendingSources,
    ];

    if (items.length === 0) {
      sampleList.innerHTML = '<p class="admin-sample-list__empty">Belum ada foto terkait.</p>';
      return;
    }

    sampleList.innerHTML = items
      .map((item) => `
        <div class="admin-sample-item">
          <span class="admin-sample-item__text" title="${escapeHtml(item.src)}">${escapeHtml(item.label)}</span>
          <button class="admin-sample-item__delete" type="button" data-sample-type="${item.type}" data-sample-index="${item.index}">
            Hapus
          </button>
        </div>
      `)
      .join("");

    sampleList.querySelectorAll("[data-sample-type]").forEach((button) => {
      button.addEventListener("click", handleSampleDelete);
    });
  }

  function handleSampleDelete(event) {
    const button = event.currentTarget;
    const type = button.dataset.sampleType;
    const index = Number(button.dataset.sampleIndex);

    if (type === "saved") {
      const sources = getSampleInputSources();
      sources.splice(index, 1);
      setValue("admin-samples", sources.join(", "));
    }

    if (type === "pending") {
      pendingSampleSources.splice(index, 1);
      if (sampleFileInput && pendingSampleSources.length === 0) {
        sampleFileInput.value = "";
      }
      updateSampleFileStatus();
    }

    renderSampleList();
  }

  function getSampleInputSources() {
    const input = (document.getElementById("admin-samples")?.value || "").trim();
    return input
      ? input
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uniqueSources(sources) {
    return [...new Set(sources.filter(Boolean))];
  }

  function handleImageUrlChange() {
    if (imageFileInput?.files?.length) return;
    const url = imageUrlInput?.value.trim();
    if (!url) {
      currentPreviewSource = null;
      hidePreviewImage();
      return;
    }
    currentPreviewSource = url;
    showPreviewImage(url);
  }

  function showPreviewImage(src) {
    if (!imagePreview || !previewPlaceholder) return;
    imagePreview.src = src;
    imagePreview.hidden = false;
    previewPlaceholder.hidden = true;
  }

  function hidePreviewImage() {
    if (!imagePreview || !previewPlaceholder) return;
    imagePreview.src = "";
    imagePreview.hidden = true;
    previewPlaceholder.hidden = false;
  }

  function renderAdminMessage(text, type = "info") {
    if (!adminMessage) return;
    adminMessage.textContent = text;
    adminMessage.className = `admin-message admin-message--${type}`;
  }

  function resetAdminForm(options = {}) {
    const previousTemplate = adminTemplateSelect?.value || "";
    adminForm.reset();
    if (options.keepTemplate && adminTemplateSelect) {
      adminTemplateSelect.value = previousTemplate;
    } else {
      selectedExistingMotifId = "";
    }
    if (sampleFileInput) sampleFileInput.value = "";
    pendingSampleSources = [];
    updateSampleFileStatus();
    renderSampleList();
    currentPreviewSource = null;
    hidePreviewImage();
    updateSubmitMode();
  }

  return { init };
})();

window.Admin = Admin;
