/**
 * auth.js — Manajemen login, registrasi, pemulihan sandi, kelola Gmail, dan favorit
 * Museum Digital Nasional Indonesia
 */

// Muat EmailJS
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

  // State OTP
  let pendingOtp = null;
  let recoveryOtp = null;
  let recoveryUsername = null;

  const STORAGE_KEY = "museum_user_session";
  const USER_STORE_KEY = "museum_users";
  const EMAILJS_PUBLIC_KEY = "5qfBhOCYwo17vqz4f";
  const EMAILJS_SERVICE = "service_krkyr7u";
  const EMAILJS_TEMPLATE = "template_1f851cr";

  const DEFAULT_ADMIN = {
    username: "admin",
    password: "admin123",
    email: "",
    favorites: [],
    isAdmin: true,
  };

  // ===================================================
  // INIT
  // ===================================================
  async function init() {
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

    // Tunggu Firebase preload selesai (maks ~3 detik) agar data terbaru tersedia
    if (window._dbReady) {
      try { await Promise.race([window._dbReady, new Promise(r => setTimeout(r, 3000))]); }
      catch {}
    }

    loadUserStore();
    loadSession();
    bindEvents();
    updateUI();
    dispatchAuthEvent();
    injectRecoveryModal();
    injectGmailModal();
  }

  // ===================================================
  // EMAILJS HELPER — tunggu library termuat
  // ===================================================
  function waitForEmailJS(callback, attempt) {
    attempt = attempt || 0;
    if (typeof emailjs !== "undefined") {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      callback();
    } else if (attempt < 10) {
      setTimeout(() => waitForEmailJS(callback, attempt + 1), 500);
    } else {
      callback(new Error("EmailJS tidak termuat. Periksa koneksi internet Anda."));
    }
  }

  function sendEmail(toEmail, toName, otpCode, onSuccess, onError) {
    waitForEmailJS((err) => {
      if (err) { onError(err); return; }
      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: toEmail,
        to_name: toName,
        otp_code: otpCode
      }).then(onSuccess).catch(onError);
    });
  }

  // ===================================================
  // RECOVERY MODAL
  // ===================================================
  function injectRecoveryModal() {
    if (document.getElementById("recovery-modal")) return;
    const overlay = document.createElement("div");
    overlay.id = "recovery-modal";
    overlay.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:400;
      display:none; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); padding:1rem;
    `;
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#0d1526,#162140);border:1px solid rgba(201,168,76,0.35);border-radius:20px;padding:2rem;width:min(430px,calc(100vw - 2rem));max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.55);position:relative;">
        <button id="recovery-close-btn" style="position:absolute;top:0.9rem;right:1rem;background:transparent;border:none;font-size:1.7rem;color:rgba(249,240,224,0.45);cursor:pointer;" aria-label="Tutup">&times;</button>
        <div style="text-align:center;margin-bottom:1.5rem;">
          <div style="font-size:2.2rem;margin-bottom:0.4rem;">🔑</div>
          <h3 style="color:#d4b45a;font-size:1.2rem;margin-bottom:0.4rem;">Lupa Kata Sandi?</h3>
          <p style="color:rgba(249,240,224,0.55);font-size:0.85rem;line-height:1.5;">
            Hanya untuk akun yang <strong style="color:rgba(249,240,224,0.85);">sudah terdaftar</strong> dengan Gmail.<br>
            <span style="font-size:0.8rem;">Belum punya akun? Klik <strong style="color:#d4b45a;">Daftar Sekarang</strong> di bawah.</span>
          </p>
        </div>

        <!-- Step 1 -->
        <div id="rec-step-1">
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Nama Pengguna
            <input id="rec-input-user" type="text" placeholder="contoh: mkydlucy"
              style="padding:0.85rem 1rem;border:1px solid rgba(201,168,76,0.35);border-radius:10px;background:rgba(255,255,255,0.05);color:white;font-size:1rem;outline:none;"/>
          </label>
          <button id="rec-btn-check" style="width:100%;padding:0.9rem;border:none;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#d4b45a);color:#0a0e1a;font-weight:700;font-size:0.95rem;cursor:pointer;margin-bottom:0.75rem;">
            🔍 Periksa Akun Saya
          </button>
          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:0.75rem;text-align:center;">
            <p style="font-size:0.8rem;color:rgba(249,240,224,0.35);margin-bottom:0.4rem;">Belum punya akun?</p>
            <button id="rec-goto-register" style="background:transparent;border:1px solid rgba(201,168,76,0.4);border-radius:8px;color:#d4b45a;font-size:0.85rem;font-weight:600;padding:0.55rem 1.5rem;cursor:pointer;width:100%;">✨ Daftar Sekarang</button>
          </div>
        </div>

        <!-- Step 2 OTP -->
        <div id="rec-step-2" hidden>
          <p id="rec-otp-info" style="font-size:0.85rem;color:#4ade80;margin-bottom:1rem;text-align:center;background:rgba(34,197,94,0.08);padding:0.6rem;border-radius:8px;border:1px solid rgba(34,197,94,0.2);"></p>
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Kode OTP (4 Digit)
            <input id="rec-input-otp" type="text" maxlength="4" placeholder="· · · ·"
              style="padding:0.9rem;border:1px solid rgba(201,168,76,0.4);border-radius:10px;background:rgba(255,255,255,0.06);color:white;font-size:2rem;letter-spacing:1rem;text-align:center;outline:none;"/>
          </label>
          <p style="font-size:0.78rem;color:rgba(249,240,224,0.4);margin-bottom:0.75rem;text-align:center;">💡 Cek folder <strong>Spam</strong> jika tidak masuk dalam 1 menit</p>
          <button id="rec-btn-verify" style="width:100%;padding:0.9rem;border:none;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#d4b45a);color:#0a0e1a;font-weight:700;font-size:0.95rem;cursor:pointer;margin-bottom:0.6rem;">Verifikasi Kode</button>
          <button id="rec-btn-resend" style="width:100%;padding:0.65rem;border:1px solid rgba(201,168,76,0.3);border-radius:10px;background:transparent;color:rgba(249,240,224,0.55);font-size:0.82rem;cursor:pointer;">Kirim Ulang Kode</button>
        </div>

        <!-- Step 3 New Password -->
        <div id="rec-step-3" hidden>
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Kata Sandi Baru
            <input id="rec-input-newpass" type="password" placeholder="Minimal 6 karakter"
              style="padding:0.85rem 1rem;border:1px solid rgba(201,168,76,0.35);border-radius:10px;background:rgba(255,255,255,0.05);color:white;font-size:1rem;outline:none;"/>
          </label>
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Konfirmasi Kata Sandi
            <input id="rec-input-confirm" type="password" placeholder="Ulangi kata sandi baru"
              style="padding:0.85rem 1rem;border:1px solid rgba(201,168,76,0.35);border-radius:10px;background:rgba(255,255,255,0.05);color:white;font-size:1rem;outline:none;"/>
          </label>
          <button id="rec-btn-save" style="width:100%;padding:0.9rem;border:none;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:700;font-size:0.95rem;cursor:pointer;">✅ Simpan Kata Sandi Baru</button>
        </div>

        <p id="rec-message" style="margin-top:0.85rem;min-height:1.2rem;font-size:0.87rem;font-weight:600;text-align:center;line-height:1.5;color:#fbbf24;"></p>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("recovery-close-btn").onclick = closeRecoveryModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRecoveryModal(); });
    document.getElementById("rec-btn-check").onclick = handleRecStep1;
    document.getElementById("rec-btn-verify").onclick = handleRecStep2;
    document.getElementById("rec-btn-resend").onclick = handleRecResend;
    document.getElementById("rec-btn-save").onclick = handleRecStep3;
    document.getElementById("rec-goto-register").onclick = () => {
      closeRecoveryModal();
      setTimeout(() => { openLoginModal(); setAuthMode("register"); }, 150);
    };
  }

  function openRecoveryModal() {
    injectRecoveryModal();
    recoveryOtp = null; recoveryUsername = null;
    const m = document.getElementById("recovery-modal");
    if (!m) return;
    document.getElementById("rec-step-1").hidden = false;
    document.getElementById("rec-step-2").hidden = true;
    document.getElementById("rec-step-3").hidden = true;
    document.getElementById("rec-message").textContent = "";
    const inp = document.getElementById("rec-input-user");
    if (inp) inp.value = "";
    m.style.display = "flex";
    closeLoginModal();
    setTimeout(() => inp?.focus(), 100);
  }

  function closeRecoveryModal() {
    const m = document.getElementById("recovery-modal");
    if (m) m.style.display = "none";
  }

  function setRecMsg(msg, color) {
    const el = document.getElementById("rec-message");
    if (el) { el.innerHTML = msg; el.style.color = color || "#fbbf24"; }
  }

  function handleRecStep1() {
    const username = document.getElementById("rec-input-user")?.value.trim();
    if (!username) { setRecMsg("Masukkan nama pengguna terlebih dahulu."); return; }

    const user = findUser(username);
    if (!user) {
      setRecMsg(`<span style="color:#f59e0b;">Nama pengguna "<strong>${username}</strong>" belum terdaftar.</span><br><span style="font-size:0.8rem;color:rgba(249,240,224,0.45);font-weight:400;">Belum punya akun? Klik tombol Daftar Sekarang di bawah.</span>`);
      return;
    }

    const hasGmail = user.email && user.email.endsWith("@gmail.com");
    if (!hasGmail) {
      // Tampilkan opsi kirim permintaan ke admin
      const msgEl = document.getElementById("rec-message");
      if (msgEl) {
        msgEl.innerHTML = `
          <div style="padding:10px 12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;text-align:left;">
            <p style="color:#f59e0b;font-weight:700;margin:0 0 6px;font-size:0.9rem;">⚠️ Akun ini tidak terhubung ke Gmail</p>
            <p style="font-size:0.8rem;color:rgba(249,240,224,0.6);margin:0 0 10px;font-weight:400;">Pemulihan otomatis memerlukan Gmail. Anda bisa mengirim permintaan reset sandi ke Admin — Admin akan melihat permintaan ini dan menetapkan sandi baru untuk Anda.</p>
            <button id="btn-req-admin-reset" style="width:100%;padding:8px;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:8px;color:#0a0e1a;font-weight:700;font-size:0.85rem;cursor:pointer;">📨 Kirim Permintaan Reset ke Admin</button>
          </div>
        `;
        msgEl.style.color = "inherit";
        setTimeout(() => {
          document.getElementById("btn-req-admin-reset")?.addEventListener("click", () => sendResetRequest(username));
        }, 50);
      }
      return;
    }

    recoveryUsername = username;
    const btn = document.getElementById("rec-btn-check");
    if (btn) { btn.textContent = "⏳ Mengirim ke " + user.email + "..."; btn.disabled = true; }
    recoveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    sendEmail(user.email, username, recoveryOtp, () => {
      if (btn) { btn.textContent = "🔍 Periksa Akun Saya"; btn.disabled = false; }
      document.getElementById("rec-step-1").hidden = true;
      document.getElementById("rec-step-2").hidden = false;
      const info = document.getElementById("rec-otp-info");
      if (info) info.textContent = `✅ Kode OTP berhasil dikirim ke ${user.email} — Periksa kotak masuk atau folder Spam.`;
      setRecMsg("");
      document.getElementById("rec-input-otp")?.focus();
    }, (err) => {
      if (btn) { btn.textContent = "🔍 Periksa Akun Saya"; btn.disabled = false; }
      console.error("OTP error:", err);
      setRecMsg(`❌ Gagal kirim email ke <strong>${user.email}</strong>.<br><span style="font-size:0.8rem;font-weight:400;">Pastikan Template EmailJS memiliki kolom "To Email" = <code>{{to_email}}</code></span>`, "#e74c3c");
    });
  }

  // Kirim permintaan reset sandi ke admin (untuk akun tanpa Gmail)
  function sendResetRequest(username) {
    const requests = JSON.parse(localStorage.getItem("museum_reset_requests") || "[]");
    const alreadyPending = requests.find(r => r.username === username && r.status === "pending");
    if (alreadyPending) {
      setRecMsg("✅ Permintaan sudah dikirim sebelumnya. Tunggu Admin memproses.", "#22c55e");
      return;
    }
    requests.unshift({ id: "req_" + Date.now(), username, status: "pending", requestedAt: new Date().toISOString() });
    localStorage.setItem("museum_reset_requests", JSON.stringify(requests));
    if (window.DB) DB.write("reset_requests", requests);
    logActivity("auth", `Meminta reset sandi untuk @${username} via admin`);
    setRecMsg("✅ Permintaan berhasil dikirim ke Admin! Admin akan menetapkan sandi baru untuk Anda. Silakan cek kembali nanti.", "#22c55e");
    const btn = document.getElementById("btn-req-admin-reset");
    if (btn) { btn.disabled = true; btn.textContent = "✅ Permintaan Terkirim"; }
    setTimeout(closeRecoveryModal, 3000);
  }

  function handleRecResend() {
    if (!recoveryUsername) return;
    const user = findUser(recoveryUsername);
    if (!user?.email) return;
    recoveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setRecMsg("⏳ Mengirim ulang...");
    sendEmail(user.email, recoveryUsername, recoveryOtp, () => {
      const info = document.getElementById("rec-otp-info");
      if (info) info.textContent = `✅ Kode baru dikirim ke ${user.email}`;
      setRecMsg("");
    }, () => setRecMsg("❌ Gagal kirim ulang.", "#e74c3c"));
  }

  function handleRecStep2() {
    const val = document.getElementById("rec-input-otp")?.value.trim();
    if (!val) { setRecMsg("Masukkan kode OTP."); return; }
    if (val !== recoveryOtp) { setRecMsg("❌ Kode OTP salah. Periksa kembali email Anda.", "#e74c3c"); return; }
    document.getElementById("rec-step-2").hidden = true;
    document.getElementById("rec-step-3").hidden = false;
    setRecMsg("✅ Identitas terverifikasi! Buat kata sandi baru.", "#22c55e");
    document.getElementById("rec-input-newpass")?.focus();
  }

  function handleRecStep3() {
    const np = document.getElementById("rec-input-newpass")?.value;
    const cp = document.getElementById("rec-input-confirm")?.value;
    if (!np || np.length < 6) { setRecMsg("Kata sandi minimal 6 karakter.", "#e74c3c"); return; }
    if (np !== cp) { setRecMsg("❌ Kata sandi tidak cocok.", "#e74c3c"); return; }
    if (!recoveryUsername) { setRecMsg("Sesi berakhir. Mulai ulang."); return; }
    loadUserStore();
    const idx = userStore.findIndex(u => u.username.toLowerCase() === recoveryUsername.toLowerCase());
    if (idx === -1) { setRecMsg("❌ Akun tidak ditemukan."); return; }
    userStore[idx].password = np;
    saveUserStore();
    logActivity("auth", `Kata sandi dipulihkan untuk @${recoveryUsername}`);
    setRecMsg("🎉 Kata sandi berhasil diperbarui! Mengarahkan ke login...", "#22c55e");
    setTimeout(() => { closeRecoveryModal(); openLoginModal(); }, 2000);
  }

  // ===================================================
  // GMAIL MANAGEMENT MODAL
  // ===================================================
  function injectGmailModal() {
    if (document.getElementById("gmail-modal")) return;
    const overlay = document.createElement("div");
    overlay.id = "gmail-modal";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:400;
      display:none;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);padding:1rem;
    `;
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#0d1526,#162140);border:1px solid rgba(201,168,76,0.35);border-radius:20px;padding:2rem;width:min(420px,calc(100vw - 2rem));position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.5);">
        <button id="gmail-close-btn" style="position:absolute;top:0.9rem;right:1rem;background:transparent;border:none;font-size:1.7rem;color:rgba(249,240,224,0.45);cursor:pointer;" aria-label="Tutup">&times;</button>
        <div style="text-align:center;margin-bottom:1.5rem;">
          <div style="font-size:2rem;margin-bottom:0.4rem;">📧</div>
          <h3 id="gmail-modal-title" style="color:#d4b45a;font-size:1.1rem;margin-bottom:0.3rem;">Kelola Gmail</h3>
          <p id="gmail-modal-subtitle" style="color:rgba(249,240,224,0.55);font-size:0.85rem;"></p>
        </div>

        <!-- Step 1: Input Gmail -->
        <div id="gmail-step-1">
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Alamat Gmail Baru
            <input id="gmail-input-email" type="email" placeholder="contoh@gmail.com"
              style="padding:0.85rem 1rem;border:1px solid rgba(201,168,76,0.35);border-radius:10px;background:rgba(255,255,255,0.05);color:white;font-size:1rem;outline:none;"/>
          </label>
          <button id="gmail-btn-send" style="width:100%;padding:0.9rem;border:none;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#d4b45a);color:#0a0e1a;font-weight:700;font-size:0.95rem;cursor:pointer;">
            📤 Kirim Kode Verifikasi
          </button>
        </div>

        <!-- Step 2: OTP -->
        <div id="gmail-step-2" hidden>
          <p id="gmail-otp-info" style="font-size:0.84rem;color:#4ade80;margin-bottom:1rem;text-align:center;background:rgba(34,197,94,0.08);padding:0.6rem;border-radius:8px;border:1px solid rgba(34,197,94,0.2);"></p>
          <label style="display:grid;gap:0.4rem;font-size:0.88rem;color:rgba(249,240,224,0.8);font-weight:600;margin-bottom:0.85rem;">
            Kode OTP (4 Digit)
            <input id="gmail-input-otp" type="text" maxlength="4" placeholder="· · · ·"
              style="padding:0.9rem;border:1px solid rgba(201,168,76,0.4);border-radius:10px;background:rgba(255,255,255,0.06);color:white;font-size:2rem;letter-spacing:1rem;text-align:center;outline:none;"/>
          </label>
          <p style="font-size:0.78rem;color:rgba(249,240,224,0.4);margin-bottom:0.75rem;text-align:center;">💡 Cek folder <strong>Spam</strong> jika tidak masuk</p>
          <button id="gmail-btn-verify" style="width:100%;padding:0.9rem;border:none;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:700;font-size:0.95rem;cursor:pointer;">✅ Verifikasi & Simpan Gmail</button>
        </div>

        <p id="gmail-message" style="margin-top:0.85rem;min-height:1.2rem;font-size:0.87rem;font-weight:600;text-align:center;color:#fbbf24;"></p>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("gmail-close-btn").onclick = closeGmailModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeGmailModal(); });
    document.getElementById("gmail-btn-send").onclick = handleGmailStep1;
    document.getElementById("gmail-btn-verify").onclick = handleGmailStep2;
  }

  let gmailPendingOtp = null;
  let gmailPendingEmail = null;

  function openGmailModal() {
    injectGmailModal();
    gmailPendingOtp = null; gmailPendingEmail = null;
    const user = currentUser;
    const hasGmail = user?.email && user.email.endsWith("@gmail.com");
    const m = document.getElementById("gmail-modal");
    if (!m) return;

    document.getElementById("gmail-step-1").hidden = false;
    document.getElementById("gmail-step-2").hidden = true;
    document.getElementById("gmail-message").textContent = "";
    document.getElementById("gmail-input-email").value = "";
    document.getElementById("gmail-modal-title").textContent = hasGmail ? "Ganti Gmail" : "Tambahkan Gmail";
    document.getElementById("gmail-modal-subtitle").innerHTML = hasGmail
      ? `Gmail terdaftar: <strong style="color:#d4b45a;">${user.email}</strong><br><span style="font-size:0.8rem;">OTP akan dikirim ke Gmail baru untuk verifikasi.</span>`
      : `Tambahkan Gmail untuk membuka fitur penuh:<br>✅ Kirim saran · ✅ Pemulihan kata sandi · ✅ Badge Terverifikasi`;

    m.style.display = "flex";
    setTimeout(() => document.getElementById("gmail-input-email")?.focus(), 100);
  }

  function closeGmailModal() {
    const m = document.getElementById("gmail-modal");
    if (m) m.style.display = "none";
  }

  function setGmailMsg(msg, color) {
    const el = document.getElementById("gmail-message");
    if (el) { el.innerHTML = msg; el.style.color = color || "#fbbf24"; }
  }

  function handleGmailStep1() {
    const email = document.getElementById("gmail-input-email")?.value.trim();
    if (!email) { setGmailMsg("Masukkan alamat Gmail."); return; }
    if (!email.endsWith("@gmail.com")) { setGmailMsg("❌ Harus menggunakan alamat @gmail.com.", "#e74c3c"); return; }

    // Cek tidak dipakai akun lain
    const existing = userStore.find(u => u.email === email && u.username !== currentUser?.username);
    if (existing) { setGmailMsg("❌ Gmail ini sudah digunakan oleh akun lain.", "#e74c3c"); return; }

    const btn = document.getElementById("gmail-btn-send");
    if (btn) { btn.textContent = `⏳ Mengirim ke ${email}...`; btn.disabled = true; }
    gmailPendingOtp = Math.floor(1000 + Math.random() * 9000).toString();
    gmailPendingEmail = email;

    sendEmail(email, currentUser?.username || "Pengguna", gmailPendingOtp, () => {
      if (btn) { btn.textContent = "📤 Kirim Kode Verifikasi"; btn.disabled = false; }
      document.getElementById("gmail-step-1").hidden = true;
      document.getElementById("gmail-step-2").hidden = false;
      const info = document.getElementById("gmail-otp-info");
      if (info) info.textContent = `✅ Kode OTP dikirim ke ${email}`;
      setGmailMsg("");
      document.getElementById("gmail-input-otp")?.focus();
    }, (err) => {
      if (btn) { btn.textContent = "📤 Kirim Kode Verifikasi"; btn.disabled = false; }
      console.error("Gmail OTP error:", err);
      setGmailMsg(`❌ Gagal mengirim ke <strong>${email}</strong>. Pastikan template EmailJS memiliki kolom To Email = <code>{{to_email}}</code>`, "#e74c3c");
    });
  }

  function handleGmailStep2() {
    const inputOtp = document.getElementById("gmail-input-otp")?.value.trim();
    if (!inputOtp) { setGmailMsg("Masukkan kode OTP."); return; }
    if (inputOtp !== gmailPendingOtp) { setGmailMsg("❌ Kode OTP salah.", "#e74c3c"); return; }
    if (!currentUser || !gmailPendingEmail) { setGmailMsg("Sesi berakhir."); return; }

    // Simpan Gmail ke userStore
    loadUserStore();
    const idx = userStore.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) {
      userStore[idx].email = gmailPendingEmail;
      saveUserStore();
    }
    currentUser.email = gmailPendingEmail;
    saveSession();
    logActivity("auth", `Memperbarui Gmail akun: ${gmailPendingEmail}`);
    setGmailMsg("🎉 Gmail berhasil disimpan!", "#22c55e");
    setTimeout(() => {
      closeGmailModal();
      dispatchAuthEvent(); // refresh dashboard
    }, 1500);
  }

  // ===================================================
  // UTILITY: cek akses Gmail
  // ===================================================
  function hasGmailAccess() {
    if (!currentUser) return false;
    const u = findUser(currentUser.username);
    return !!(u?.email && u.email.endsWith("@gmail.com"));
  }

  // ===================================================
  // EVENTS
  // ===================================================
  function bindEvents() {
    if (loginButton) loginButton.addEventListener("click", openLoginModal);
    if (loginCloseBtn) loginCloseBtn.addEventListener("click", closeLoginModal);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (loginModal && !loginModal.hidden) closeLoginModal();
      const rm = document.getElementById("recovery-modal");
      if (rm && rm.style.display !== "none") closeRecoveryModal();
      const gm = document.getElementById("gmail-modal");
      if (gm && gm.style.display !== "none") closeGmailModal();
    });

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username")?.value.trim();
        const password = document.getElementById("login-password")?.value;
        if (!username || !password) { showMessage("Mohon isi nama pengguna dan kata sandi."); return; }
        if (authMode === "register") { registerUser(username, password); return; }
        signIn(username, password);
      });
    }

    if (loginModeBtn) loginModeBtn.addEventListener("click", () => setAuthMode("login"));
    if (registerModeBtn) registerModeBtn.addEventListener("click", () => setAuthMode("register"));
    if (logoutButton) logoutButton.addEventListener("click", () => { signOut(); closeLoginModal(); });

    if (favoritesFilterBtn) {
      favoritesFilterBtn.addEventListener("click", () => {
        if (!isLoggedIn()) { openLoginModal(); return; }
        showFavoritesOnly = !showFavoritesOnly;
        updateFavoritesButton();
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { user: currentUser, showFavoritesOnly } }));
      });
    }
  }

  // ===================================================
  // AUTH
  // ===================================================
  function loadSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.username) {
        const existing = findUser(parsed.username);
        currentUser = {
          username: parsed.username,
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites : existing?.favorites || [],
          isAdmin: existing?.isAdmin || false,
          email: existing?.email || ""
        };
      }
    } catch { currentUser = null; }
  }

  function saveSession() {
    try {
      if (!currentUser) { localStorage.removeItem(STORAGE_KEY); return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } catch (e) { console.warn("Gagal simpan sesi", e); }
  }

  function signIn(username, password) {
    const user = findUser(username);
    if (!user) { showMessage("Akun tidak ditemukan."); return; }
    if (user.password !== password) { showMessage("Kata sandi salah."); return; }
    currentUser = { username: user.username, favorites: user.favorites || [], isAdmin: !!user.isAdmin, email: user.email || "" };
    saveSession();
    logActivity("auth", `Masuk ke akun`);
    showMessage(`✅ Selamat datang, ${username}!`);
    updateUI();
    dispatchAuthEvent();
    setTimeout(closeLoginModal, 900);
  }

  function registerUser(username, password) {
    if (findUser(username)) { showMessage("Nama pengguna sudah digunakan."); return; }
    const emailInput = document.getElementById("login-email");
    const email = emailInput ? emailInput.value.trim() : "";

    // Tanpa Gmail — daftar langsung
    if (!email) {
      userStore.push({ username, password, email: "", favorites: [], isAdmin: false });
      saveUserStore();
      logActivity("auth", `Akun baru terdaftar (tanpa Gmail): @${username}`);
      showMessage(`Akun ${username} berhasil dibuat.`);
      setTimeout(() => signIn(username, password), 600);
      return;
    }
    if (!email.endsWith("@gmail.com")) { showMessage("Format Gmail tidak valid. Gunakan @gmail.com atau kosongkan."); return; }

    // Dengan Gmail — perlu OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const btn = document.getElementById("auth-submit-btn");
    if (btn) { btn.disabled = true; btn.textContent = `⏳ Mengirim ke ${email}...`; }
    showMessage(`Mengirim kode verifikasi ke ${email}...`);

    sendEmail(email, username, otp, () => {
      if (btn) { btn.disabled = false; btn.textContent = "Daftar"; }
      showMessage(`✅ OTP dikirim ke ${email}. Masukkan kode di bawah:`);
      injectOtpField(username, password, email, otp);
    }, (err) => {
      if (btn) { btn.disabled = false; btn.textContent = "Daftar"; }
      console.error("Register OTP error:", err);
      showMessage(`❌ Gagal kirim ke ${email}. Pastikan template EmailJS memakai {{to_email}}.`);
    });
  }

  function injectOtpField(username, password, email, expectedOtp) {
    document.getElementById("otp-verify-group")?.remove();
    const grp = document.createElement("div");
    grp.id = "otp-verify-group";
    grp.style.cssText = "display:grid;gap:0.75rem;margin-top:0.5rem;";
    grp.innerHTML = `
      <label class="login-form__label">
        Kode OTP (4 Digit dari ${email})
        <input id="otp-input-field" type="text" maxlength="4" placeholder="· · · ·"
          style="letter-spacing:0.8rem;text-align:center;font-size:1.3rem;font-weight:bold;"/>
      </label>
      <p style="font-size:0.78rem;color:#666;margin-top:-0.5rem;">💡 Cek folder <strong>Spam</strong> jika tidak masuk</p>
      <button id="otp-verify-btn" type="button" class="btn-primary btn-full">Verifikasi & Selesaikan Pendaftaran</button>
    `;
    if (loginForm) loginForm.appendChild(grp);
    document.getElementById("otp-input-field")?.focus();
    document.getElementById("otp-verify-btn").addEventListener("click", () => {
      const input = document.getElementById("otp-input-field")?.value.trim();
      if (input !== expectedOtp) { showMessage("❌ Kode OTP salah."); return; }
      grp.remove();
      userStore.push({ username, password, email, favorites: [], isAdmin: false });
      saveUserStore();
      logActivity("auth", `Akun terdaftar dengan Gmail: @${username}`);
      showMessage(`✅ Akun ${username} berhasil dibuat!`);
      setTimeout(() => signIn(username, password), 600);
    });
  }

  function signOut() {
    logActivity("auth", `Keluar dari akun`);
    currentUser = null;
    showFavoritesOnly = false;
    saveSession();
    showMessage("Anda telah keluar.");
    updateUI();
    dispatchAuthEvent();
  }

  // ===================================================
  // LOGIN MODAL
  // ===================================================
  function openLoginModal() {
    if (!loginModal) return;
    document.getElementById("otp-verify-group")?.remove();

    if (!document.getElementById("login-email-group")) {
      const lbl = document.createElement("label");
      lbl.className = "login-form__label";
      lbl.id = "login-email-group";
      lbl.style.display = "none";
      lbl.innerHTML = `Gmail (Opsional — untuk akses penuh)<input id="login-email" name="email" type="email" placeholder="contoh@gmail.com" autocomplete="email"/>`;
      if (loginForm) loginForm.insertBefore(lbl, loginForm.children[1]);
    }

    if (!document.getElementById("forgot-password-link")) {
      const fp = document.createElement("button");
      fp.id = "forgot-password-link";
      fp.type = "button";
      fp.textContent = "Lupa Kata Sandi?";
      fp.style.cssText = "background:none;border:none;padding:0;color:#c9a84c;font-size:0.83rem;font-weight:600;cursor:pointer;text-decoration:underline;text-align:right;width:100%;margin-top:-0.25rem;margin-bottom:0.25rem;display:block;";
      fp.addEventListener("click", openRecoveryModal);
      const sub = document.getElementById("auth-submit-btn");
      if (sub && loginForm) loginForm.insertBefore(fp, sub);
    }

    loginModal.hidden = false;
    loginModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("body--menu-open");

    if (isLoggedIn()) {
      showMessage(`Anda masuk sebagai ${currentUser.username}. Klik Keluar untuk keluar.`);
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
      loginButton.setAttribute("aria-label", isLoggedIn() ? `Akun ${currentUser.username}` : "Masuk");
    }
    if (loginForm) loginForm.hidden = isLoggedIn();
    if (logoutButton) logoutButton.hidden = !isLoggedIn();
    if (favoritesFilterBtn) { favoritesFilterBtn.hidden = !isLoggedIn(); updateFavoritesButton(); }
    if (adminPanelButton) adminPanelButton.hidden = !isLoggedIn() || !currentUser?.isAdmin;
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

  function showMessage(msg) {
    if (loginMessage) loginMessage.textContent = msg;
  }

  function loadUserStore() {
    try {
      const s = localStorage.getItem(USER_STORE_KEY);
      userStore = s ? JSON.parse(s) : [];
      if (!Array.isArray(userStore)) userStore = [];
    } catch { userStore = []; }
    ensureDefaultAdmin();
    // Note: Data sudah di-preload dari Firebase oleh firebase.js sebelum init() dipanggil.
    // Background refresh ringan untuk memastikan data terbaru setelah login
    if (window.DB && navigator.onLine) {
      DB.read("users").then(fbUsers => {
        if (!fbUsers || !Array.isArray(fbUsers)) return;
        userStore = fbUsers;
        ensureDefaultAdmin();
        if (currentUser) {
          const fresh = findUser(currentUser.username);
          if (fresh) {
            currentUser.email     = fresh.email     ?? currentUser.email;
            currentUser.favorites = fresh.favorites ?? currentUser.favorites;
            saveSession();
            updateUI();
          }
        }
      }).catch(() => {});
    }
  }

  function ensureDefaultAdmin() {
    if (!userStore.some(u => u.username === DEFAULT_ADMIN.username && u.isAdmin)) {
      userStore.unshift(DEFAULT_ADMIN);
      saveUserStore();
    }
  }

  function saveUserStore() {
    try { localStorage.setItem(USER_STORE_KEY, JSON.stringify(userStore)); }
    catch (e) { console.warn("Gagal simpan userStore lokal", e); }
    // Push ke Firebase (background)
    if (window.DB) DB.write("users", userStore);
  }

  function findUser(username) {
    return userStore.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  function setAuthMode(mode) {
    authMode = mode;
    const emailGroup = document.getElementById("login-email-group");
    const forgotLink = document.getElementById("forgot-password-link");
    if (mode === "register") {
      loginModeBtn?.classList.remove("login-mode-btn--active");
      registerModeBtn?.classList.add("login-mode-btn--active");
      if (authSubmitBtn) authSubmitBtn.textContent = "Daftar";
      if (authHint) authHint.textContent = "Gmail bersifat opsional — tapi diperlukan untuk saran & pemulihan akun.";
      if (emailGroup) emailGroup.style.display = "block";
      if (forgotLink) forgotLink.style.display = "none";
    } else {
      loginModeBtn?.classList.add("login-mode-btn--active");
      registerModeBtn?.classList.remove("login-mode-btn--active");
      if (authSubmitBtn) authSubmitBtn.textContent = "Masuk";
      if (authHint) authHint.textContent = "Jika belum punya akun, klik Daftar.";
      if (emailGroup) emailGroup.style.display = "none";
      if (forgotLink) forgotLink.style.display = "block";
    }
  }

  // ===================================================
  // FAVORITES & HELPERS
  // ===================================================
  function getFavoriteIds() { return isLoggedIn() ? (currentUser.favorites || []) : []; }
  function isFavorite(id) { return getFavoriteIds().includes(id); }

  function toggleFavorite(id) {
    if (!isLoggedIn()) return false;
    const favs = new Set(getFavoriteIds());
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    currentUser.favorites = [...favs];
    saveSession();
    dispatchAuthEvent();
    return favs.has(id);
  }

  function getCurrentUser() { return currentUser; }
  function isLoggedIn() { return !!currentUser; }

  function logActivity(type, description) {
    try {
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      const user = currentUser ? `[@${currentUser.username}] ` : "";
      const entry = { id: "act_" + Date.now(), type, description: user + description, username: currentUser?.username || "sistem", time: new Date().toISOString() };
      logs.unshift(entry);
      const trimmed = logs.slice(0, 200);
      localStorage.setItem("dashboard_activities", JSON.stringify(trimmed));
      // Sync ke Firebase (background)
      if (window.DB) DB.write("activities", trimmed);
    } catch (e) { console.warn("Gagal log aktivitas", e); }
  }

  return {
    init,
    openLoginModal,
    openRecoveryModal,
    openGmailModal,
    openAdminGmailModal: openGmailModal,
    isLoggedIn,
    getCurrentUser,
    getFavoriteIds,
    isFavorite,
    toggleFavorite,
    hasGmailAccess,
    logActivity
  };
})();

window.Auth = Auth;
