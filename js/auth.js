/**
 * auth.js — Manajemen login demo dan favorit pengguna
 * Data tersimpan lokal di browser (localStorage)
 * Museum Digital Nasional Indonesia
 */

// Memuat Library EmailJS Secara Dinamis agar tidak perlu mengubah semua HTML
(function loadEmailJS() {
  if (document.getElementById("emailjs-script")) return;
  const script = document.createElement("script");
  script.id = "emailjs-script";
  script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
  document.head.appendChild(script);
})();

const Auth = (() => {
    let loginButton = null;
  let loginModal = null;
  let loginCloseBtn = null;
  let loginForm = null;
  let logoutButton = null;
  let loginMessage = null;
  let favoritesFilterBtn = null;
  let adminPanelButton = null;
  let loginModeBtn = null;
  let registerModeBtn = null;
  let authSubmitBtn = null;
  let authHint = null;
  let currentUser = null;
  let userStore = [];
  let authMode = "login";
  let showFavoritesOnly = false;

  const STORAGE_KEY = "museum_user_session";
  const USER_STORE_KEY = "museum_users";
  const DEFAULT_ADMIN = {
    username: "admin",
    password: "admin123",
    favorites: [],
    isAdmin: true,
  };

  function init() {
    loginButton = document.getElementById("login-button");
    loginModal = document.getElementById("login-modal");
    loginCloseBtn = document.getElementById("login-close-btn");
    loginForm = document.getElementById("login-form");
    logoutButton = document.getElementById("logout-button");
    loginMessage = document.getElementById("login-message");
    favoritesFilterBtn = document.getElementById("favorites-filter-btn");
    adminPanelButton = document.getElementById("admin-panel-button");
    loginModeBtn = document.getElementById("login-mode-btn");
    registerModeBtn = document.getElementById("register-mode-btn");
    authSubmitBtn = document.getElementById("auth-submit-btn");
    authHint = document.getElementById("auth-hint");



    loadUserStore();
    loadSession();
    bindEvents();
    updateUI();
    dispatchAuthEvent();
  }

  function bindEvents() {
    if (loginButton) {
      loginButton.addEventListener("click", () => openLoginModal());
    }

    if (loginCloseBtn) {
      loginCloseBtn.addEventListener("click", () => closeLoginModal());
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && loginModal && !loginModal.hidden) {
        closeLoginModal();
      }
    });

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById("login-username");
        const passwordInput = document.getElementById("login-password");
        const username = usernameInput?.value.trim();
        const password = passwordInput?.value;

        if (!username || !password) {
          showMessage("Mohon isi nama pengguna dan kata sandi.");
          return;
        }

        if (authMode === "register") {
          registerUser(username, password);
          return;
        }

        signIn(username, password);
      });
    }

    if (loginModeBtn) {
      loginModeBtn.addEventListener("click", () => setAuthMode("login"));
    }

    if (registerModeBtn) {
      registerModeBtn.addEventListener("click", () => setAuthMode("register"));
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        signOut();
        closeLoginModal();
      });
    }

    if (favoritesFilterBtn) {
      favoritesFilterBtn.addEventListener("click", () => {
        if (!isLoggedIn()) {
          openLoginModal();
          return;
        }
        showFavoritesOnly = !showFavoritesOnly;
        updateFavoritesButton();
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { user: currentUser, showFavoritesOnly } }));
      });
    }
  }

  function loadSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.username) {
        const existing = findUser(parsed.username);
        currentUser = {
          username: parsed.username,
          favorites: Array.isArray(parsed.favorites)
            ? parsed.favorites
            : existing?.favorites || [],
          isAdmin: existing?.isAdmin || false,
        };
      }
    } catch (error) {
      currentUser = null;
    }
  }

  function saveSession() {
    try {
      if (!currentUser) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } catch (error) {
      console.warn("Gagal menyimpan sesi pengguna", error);
    }
  }

  function signIn(username, password) {
    const user = findUser(username);
    if (!user) {
      showMessage("Akun tidak ditemukan. Silakan daftar terlebih dahulu.");
      return;
    }
    if (user.password !== password) {
      showMessage("Nama pengguna atau kata sandi salah.");
      return;
    }
    currentUser = {
      username: user.username,
      favorites: Array.isArray(user.favorites) ? user.favorites : [],
      isAdmin: !!user.isAdmin,
    };
    saveSession();
    logActivity("auth", `Berhasil masuk (login)`);
    showMessage(`Berhasil masuk sebagai ${username}.`);
    updateUI();
    dispatchAuthEvent();
    setTimeout(closeLoginModal, 900);
  }

  function registerUser(username, password) {
    if (findUser(username)) {
      showMessage("Nama pengguna sudah digunakan. Gunakan nama lain.");
      return;
    }
    
    const emailInput = document.getElementById("login-email");
    const email = emailInput ? emailInput.value.trim() : "";
    
    // Bypass instan jika tidak ada email
    if (!email) {
      userStore.push({ username, password, email: "", favorites: [], isAdmin: false });
      saveUserStore();
      logActivity("auth", `Akun baru terdaftar (tanpa Gmail): @${username}`);
      showMessage(`Akun ${username} berhasil dibuat. Masuk...`);
      setTimeout(() => signIn(username, password), 600);
      return;
    }

    if (!email.endsWith("@gmail.com")) {
      showMessage("Format salah: Gunakan akhiran @gmail.com atau kosongkan saja.");
      return;
    }

    // Integrasi EmailJS Asli (Membutuhkan konfigurasi)
    const EMAILJS_PUBLIC_KEY = "5qfBhOCYwo17vqz4f";
    const EMAILJS_SERVICE = "service_krkyr7u";
    const EMAILJS_TEMPLATE = "template_1f851cr";

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Fallback jika belum dikonfigurasi (Senyap Tanpa Alert)
    if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY_HERE") {
      console.log(`[PEMBERITAHUAN SISTEM] EmailJS belum dikonfigurasi. Menggunakan auto-bypass OTP (Simulasi Senyap). OTP = ${randomOtp}`);
      userStore.push({ username, password, email, favorites: [], isAdmin: false });
      saveUserStore();
      logActivity("auth", `Akun baru terdaftar (Auto-Bypass): @${username}`);
      showMessage(`Akun ${username} berhasil dibuat. Masuk...`);
      setTimeout(() => signIn(username, password), 600);
      return;
    }

    // Jika EmailJS sudah dikonfigurasi, gunakan jaringan nyata untuk mengirim:
    if (typeof emailjs !== "undefined") {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      showMessage("Sedang mengirimkan email OTP...");
      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: email,
        to_name: username,
        otp_code: randomOtp
      }).then(() => {
        const otp = window.prompt(`Kode verifikasi NYATA telah berhasil dikirim ke ${email}. Masukkan 4 angka OTP:`);
        if (otp !== randomOtp) {
          showMessage("Kode OTP salah atau dibatalkan.");
          return;
        }
        userStore.push({ username, password, email, favorites: [], isAdmin: false });
        saveUserStore();
        logActivity("auth", `Akun baru terdaftar: @${username}`);
        showMessage(`Akun ${username} berhasil dibuat. Masuk...`);
        setTimeout(() => signIn(username, password), 600);
      }).catch(err => {
        console.error("Gagal mengirim email:", err);
        let errText = "Kegagalan jaringan pengiriman email.";
        if (err && err.text) errText = err.text;
        showMessage("Gagal: " + errText + " (Cek konsol/Template ID)");
      });
    } else {
      showMessage("Sistem EmailJS sedang memuat. Coba lagi dalam 2 detik.");
    }
  }

  function signOut() {
    logActivity("auth", `Keluar dari akun (logout)`);
    currentUser = null;
    showFavoritesOnly = false;
    saveSession();
    showMessage("Anda telah keluar.");
    updateUI();
    dispatchAuthEvent();
  }

  function openLoginModal() {
    if (!loginModal) return;
    
    // Inject Email Field dynamically if it doesn't exist
    if (!document.getElementById("login-email-group")) {
      const formLabelGroup = document.createElement("label");
      formLabelGroup.className = "login-form__label";
      formLabelGroup.id = "login-email-group";
      formLabelGroup.style.display = "none"; // Sembunyikan secara default
      formLabelGroup.innerHTML = `Email (Gmail)<input id="login-email" name="email" type="email" placeholder="contoh@gmail.com" autocomplete="email" />`;
      if (loginForm) {
        loginForm.insertBefore(formLabelGroup, loginForm.children[1]); // Letakkan di bawah Username
      }
    }

    loginModal.hidden = false;
    loginModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("body--menu-open");

    if (isLoggedIn()) {
      showMessage(`Anda masuk sebagai ${currentUser.username}. Gunakan tombol Keluar untuk keluar dari sesi.`);
      loginForm.hidden = true;
    } else {
      showMessage("");
      loginForm.hidden = false;
      setAuthMode(authMode);
      document.getElementById("login-username")?.focus();
    }
  }

  function closeLoginModal() {
    if (!loginModal) return;
    loginModal.hidden = true;
    loginModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body--menu-open");
    loginButton?.focus();
  }

  function updateUI() {
    if (loginButton) {
      loginButton.textContent = isLoggedIn() ? `Halo, ${currentUser.username}` : "Masuk";
      loginButton.setAttribute(
        "aria-label",
        isLoggedIn() ? `Akun ${currentUser.username}` : "Masuk atau profil pengguna"
      );
    }

    if (loginForm) {
      loginForm.hidden = isLoggedIn();
    }

    if (logoutButton) {
      logoutButton.hidden = !isLoggedIn();
    }

    if (favoritesFilterBtn) {
      favoritesFilterBtn.hidden = !isLoggedIn();
      updateFavoritesButton();
    }

    if (adminPanelButton) {
      adminPanelButton.hidden = !isLoggedIn() || !currentUser?.isAdmin;
    }
  }

  function updateFavoritesButton() {
    if (!favoritesFilterBtn) return;
    const active = isLoggedIn() && showFavoritesOnly;
    favoritesFilterBtn.textContent = active ? "Tampilkan Semua" : "Favorit Saya";
    favoritesFilterBtn.setAttribute("aria-pressed", String(active));
    favoritesFilterBtn.classList.toggle("btn-ghost--active", active);
  }

  function dispatchAuthEvent() {
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { user: currentUser, showFavoritesOnly } }));
    window.dispatchEvent(new CustomEvent("favoritesChanged", { detail: { favorites: getFavoriteIds() } }));
  }

  function showMessage(message) {
    if (!loginMessage) return;
    loginMessage.textContent = message;
  }

  function loadUserStore() {
    try {
      const storedUsers = localStorage.getItem(USER_STORE_KEY);
      userStore = storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
      userStore = [];
    }

    const hasAdmin = userStore.some((user) => user.username === DEFAULT_ADMIN.username && user.isAdmin);
    if (!hasAdmin) {
      userStore.unshift(DEFAULT_ADMIN);
      saveUserStore();
    }
  }

  function saveUserStore() {
    try {
      localStorage.setItem(USER_STORE_KEY, JSON.stringify(userStore));
    } catch (error) {
      console.warn("Gagal menyimpan daftar pengguna", error);
    }
  }

  function findUser(username) {
    return userStore.find((user) => user.username.toLowerCase() === username.toLowerCase());
  }

  function setAuthMode(mode) {
    authMode = mode;
    const emailGroup = document.getElementById("login-email-group");

    if (mode === "register") {
      loginModeBtn?.classList.remove("login-mode-btn--active");
      registerModeBtn?.classList.add("login-mode-btn--active");
      if (authSubmitBtn) authSubmitBtn.textContent = "Daftar";
      if (authHint) authHint.textContent = "Masukkan nama pengguna baru, kata sandi, dan Gmail.";
      if (emailGroup) emailGroup.style.display = "block"; // Tampilkan Gmail
    } else {
      loginModeBtn?.classList.add("login-mode-btn--active");
      registerModeBtn?.classList.remove("login-mode-btn--active");
      if (authSubmitBtn) authSubmitBtn.textContent = "Masuk";
      if (authHint) authHint.textContent = "Jika belum punya akun, daftar dulu.";
      if (emailGroup) emailGroup.style.display = "none"; // Sembunyikan Gmail
    }
  }

  function getFavoriteIds() {
    if (!isLoggedIn()) return [];
    return currentUser.favorites || [];
  }

  function isFavorite(motifId) {
    return getFavoriteIds().includes(motifId);
  }

  function toggleFavorite(motifId) {
    if (!isLoggedIn()) return false;
    const favorites = new Set(getFavoriteIds());
    if (favorites.has(motifId)) {
      favorites.delete(motifId);
    } else {
      favorites.add(motifId);
    }
    currentUser.favorites = [...favorites];
    saveSession();
    dispatchAuthEvent();
    return favorites.has(motifId);
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  function logActivity(type, description) {
    try {
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        id: "act_" + Date.now(),
        type: type, // "kuis", "rekomendasi", "pencarian", "navigasi", "auth"
        description: description,
        time: new Date().toISOString()
      });
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 100)));
    } catch (error) {
      console.warn("Gagal menyimpan log aktivitas", error);
    }
  }

  return {
    init,
    openLoginModal,
    isLoggedIn,
    getCurrentUser,
    getFavoriteIds,
    isFavorite,
    toggleFavorite,
    logActivity
  };
})();

window.Auth = Auth;
