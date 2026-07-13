/**
 * dashboard.js — AI Dashboard & Analytics
 * Mengumpulkan log interaksi dan merender visual grafik SVG aktivitas.
 * Museum Digital Nasional Indonesia
 */

const Dashboard = (() => {
  let statCollection = null;
  let statSearches = null;
  let statRecommendations = null;
  let statQuizzes = null;
  let popularMotifEl = null;
  let popularRegionEl = null;
  let visitorCountEl = null;
  let activityChartContainer = null;
  let activityLogsList = null;
  let radarInterval = null;
  let radarLastLogCount = 0;

  function init() {
    statCollection = document.getElementById("dash-stat-collection");
    statSearches = document.getElementById("dash-stat-searches");
    statRecommendations = document.getElementById("dash-stat-recommendations");
    statQuizzes = document.getElementById("dash-stat-quizzes");
    popularMotifEl = document.getElementById("dash-popular-motif");
    popularRegionEl = document.getElementById("dash-popular-region");
    visitorCountEl = document.getElementById("dash-visitor-count");
    activityChartContainer = document.getElementById("dash-activity-chart");
    activityLogsList = document.getElementById("dash-activity-logs");

    const currentUser = window.Auth?.getCurrentUser();
    const promptEl = document.getElementById("dashboard-auth-prompt");
    const adminEl = document.getElementById("admin-dashboard-view");
    const userEl = document.getElementById("user-dashboard-view");

    if (!currentUser) {
      if (promptEl) promptEl.style.display = "block";
      if (adminEl) adminEl.style.display = "none";
      if (userEl) userEl.style.display = "none";
      return;
    }

    if (promptEl) promptEl.style.display = "none";
    
    // Render Duel Arena
    window.DuelSys?.renderArena();
    window.PvPSys?.renderArena();

    if (currentUser.isAdmin) {
      if (adminEl) adminEl.style.display = "block";
      if (userEl) userEl.style.display = "none";

      // ── Sinkronisasi Firebase sebelum render ──────────────────────────
      if (window.DB) {
        Promise.all([
          DB.pull("batik_data",        "global_batik_data",        []),
          DB.pull("comments",          "museum_comments",           []),
          DB.pull("quiz_leaderboard",  "quiz_leaderboard",         []),
          DB.pull("reset_requests",    "museum_reset_requests",    []),
          DB.pull("activities",        "dashboard_activities",      []),
        ]).then(() => {
          // Perbarui window.BATIK_DATA setelah sync
          const synced = JSON.parse(localStorage.getItem("global_batik_data") || "[]");
          if (synced.length) window.BATIK_DATA = synced;
        }).catch(() => {});
      }

      initVisitorStats();
      renderStats();
      renderActivityChart();
      renderRecentLogs();
      renderAdminUsers(); // Render account monitor
      bindAdminEvents();  // Pasang event untuk Admin Add Batik
      startRadarHeartbeat(); // Radar Live
      renderAdminGmailCard(); // Status Gmail admin
      renderResetRequests(); // Permintaan reset sandi
      renderPendingSuggestions();
    } else {
      stopRadarHeartbeat();
      if (adminEl) adminEl.style.display = "none";
      if (userEl) userEl.style.display = "block";
      // Sync quiz leaderboard untuk user biasa juga
      if (window.DB) DB.pull("quiz_leaderboard", "quiz_leaderboard", []).catch(() => {});
      renderUserDashboard(currentUser);
    }
  }

  function initVisitorStats() {
    try {
      if (!localStorage.getItem("dashboard_visitors")) {
        // Set awal angka pengunjung
        localStorage.setItem("dashboard_visitors", String(Math.floor(Math.random() * 200) + 180));
      } else {
        // Tambah pengunjung kecil-kecilan tiap reload halaman untuk simulasi
        const cur = Number(localStorage.getItem("dashboard_visitors"));
        localStorage.setItem("dashboard_visitors", String(cur + Math.floor(Math.random() * 3) + 1));
      }
    } catch (_) {}
  }

  function renderStats() {
    const data = window.BATIK_DATA || [];
    
    if (statCollection) statCollection.textContent = String(data.length);
    if (statSearches) statSearches.textContent = localStorage.getItem("dashboard_search_count") || "0";
    if (statRecommendations) statRecommendations.textContent = localStorage.getItem("dashboard_recommendation_count") || "0";
    if (statQuizzes) statQuizzes.textContent = localStorage.getItem("dashboard_quiz_completed") || "0";
    if (visitorCountEl) visitorCountEl.textContent = localStorage.getItem("dashboard_visitors") || "0";

    // Cari motif terpopuler berdasarkan data_view di localStorage
    try {
      const views = JSON.parse(localStorage.getItem("dashboard_batik_views") || "{}");
      let maxViews = -1;
      let popularBatikId = "";
      
      Object.keys(views).forEach(id => {
        if (views[id] > maxViews) {
          maxViews = views[id];
          popularBatikId = id;
        }
      });

      const popBatik = data.find(b => b.id === popularBatikId);
      if (popBatik && popularMotifEl) {
        popularMotifEl.textContent = `${popBatik.emoji} Batik ${popBatik.nama} (${maxViews}x dilihat)`;
      } else if (popularMotifEl) {
        popularMotifEl.textContent = "Belum ada (Pelajari Koleksi)";
      }

      // Cari daerah terpopuler
      const regionCount = {};
      Object.keys(views).forEach(id => {
        const b = data.find(item => item.id === id);
        if (b) {
          regionCount[b.asal.split(",")[0].trim()] = (regionCount[b.asal.split(",")[0].trim()] || 0) + views[id];
        }
      });

      let maxRegViews = -1;
      let popularRegion = "";
      Object.keys(regionCount).forEach(reg => {
        if (regionCount[reg] > maxRegViews) {
          maxRegViews = regionCount[reg];
          popularRegion = reg;
        }
      });

      if (popularRegion && popularRegionEl) {
        popularRegionEl.textContent = `${popularRegion}`;
      } else if (popularRegionEl) {
        popularRegionEl.textContent = "Belum ada data";
      }

    } catch (e) {
      console.warn("Gagal menghitung statistik popularitas batik", e);
    }
  }

  // Merender Grafik aktivitas interaktif berbasis SVG murni
  function renderActivityChart() {
    if (!activityChartContainer) return;

    // Ambil log aktivitas 7 hari terakhir (atau simulasi jika log kosong)
    const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
    
    // Hitung jumlah aktivitas per hari murni dari log nyata
    const chartData = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalisasi ke awal hari
    
    if (logs.length > 0) {
      logs.forEach(log => {
        const logDate = new Date(log.time);
        logDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - logDate);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          chartData[6 - diffDays]++;
        }
      });
    }

    const width = 600;
    const height = 200;
    const padding = 30;

    // Hitung koordinat grafik
    const points = chartData.map((val, idx) => {
      const x = padding + (idx * (width - 2 * padding) / (chartData.length - 1));
      // Normalisasi nilai val
      const maxVal = Math.max(...chartData, 10);
      const y = height - padding - (val * (height - 2 * padding) / maxVal);
      return { x, y };
    });

    // Buat kode path SVG untuk grafik garis
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Buat kode path SVG untuk area gradasi di bawah garis
    let areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    activityChartContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" style="width: 100%; height: 100%;">
        <defs>
          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--gold-500)" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="var(--gold-500)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        
        <!-- Gridlines horizontal -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />

        <!-- Area di bawah garis -->
        <path d="${areaD}" fill="url(#chart-grad)" />

        <!-- Garis data utama -->
        <path d="${pathD}" fill="none" stroke="var(--gold-400)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Titik-titik data -->
        ${points.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--navy-900)" stroke="var(--gold-300)" stroke-width="2.5" />
          <text x="${p.x}" y="${p.y - 12}" fill="var(--gold-100)" font-size="10" font-weight="bold" text-anchor="middle">${chartData[i]}</text>
        `).join("")}

        <!-- Label sumbu X -->
        ${points.map((p, i) => `
          <text x="${p.x}" y="${height - 10}" fill="var(--text-light-muted)" font-size="10" text-anchor="middle">${labels[i]}</text>
        `).join("")}
      </svg>
    `;
  }

  function renderRecentLogs() {
    if (!activityLogsList) return;

    const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
    
    if (logs.length === 0) {
      activityLogsList.innerHTML = `<li class="activity-log-item text-center text-muted">Belum ada riwayat aktivitas AI. Silakan jelajahi AI Center!</li>`;
      return;
    }

    // Ambil maksimal 5 log terakhir
    activityLogsList.innerHTML = logs.slice(0, 5).map(log => {
      const date = new Date(log.time);
      const timeStr = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      
      let badgeColor = "var(--gold-500)";
      if (log.type === "kuis") badgeColor = "#22C55E";
      if (log.type === "rekomendasi") badgeColor = "#3B82F6";
      if (log.type === "pencarian") badgeColor = "#A855F7";

      return `
        <li class="activity-log-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${badgeColor};"></span>
            <span>${log.description}</span>
          </div>
          <span style="font-size: 12px; color: var(--text-light-muted);">${timeStr}</span>
        </li>
      `;
    }).join("");
  }

  function logActivity(type, description) {
    try {
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        id: "act_" + Date.now(),
        type: type, // "kuis", "rekomendasi", "pencarian"
        description: description,
        time: new Date().toISOString()
      });
      // Batasi maksimal 50 log agar tidak berat
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 50)));
    } catch (error) {
      console.warn("Gagal menyimpan log aktivitas", error);
    }
  }

  function renderAdminUsers() {
    const listEl = document.getElementById("dash-admin-users-list");
    if (!listEl) return;

    listEl.innerHTML = "";
    const users = JSON.parse(localStorage.getItem("museum_users") || "[]");
    const allComments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    const allQuizLogs = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]");

    if (users.length === 0) {
      listEl.innerHTML = '<tr><td colspan="5" style="padding:15px; text-align:center; color:var(--text-light-muted);">Belum ada akun terdaftar</td></tr>';
      return;
    }

    users.forEach(u => {
      const userComments = allComments.filter(c => c.username === u.username).length;
      const userQuizzes = (window.Auth?.getCurrentUser()?.username === u.username) ? allQuizLogs.length : 0;

      const roleStr = u.isAdmin
        ? '<span style="background:#e74c3c; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem;">Admin</span>'
        : '<span style="background:var(--gold-400); color:var(--navy-900); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">User</span>';

      const hasGmail = u.email && u.email.endsWith("@gmail.com");

      // Kolom status email
      const emailStr = hasGmail
        ? `<span style="color:#22c55e; font-size:0.8rem; font-weight:600;">✅ ${u.email}</span>`
        : `<span style="color:#f59e0b; font-size:0.8rem; font-weight:600;">⚠️ Tanpa Gmail</span>`;

      // Kolom aksi: berbeda antara akun Gmail vs non-Gmail
      let aksiHtml = "";
      if (!u.isAdmin) {
        if (!hasGmail) {
          // Non-Gmail: bisa dihapus bebas oleh admin
          aksiHtml = `<button onclick="window.Dashboard.adminDeleteUser('${u.username}')" style="padding:4px 10px; font-size:0.75rem; background:#e74c3c; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">🗑️ Hapus Langsung</button>`;
        } else if (u.deletionRequested) {
          // Gmail tapi sudah minta hapus: admin bisa setujui
          aksiHtml = `<button onclick="window.Dashboard.adminDeleteUser('${u.username}')" style="padding:4px 10px; font-size:0.75rem; background:#e74c3c; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">✅ Setujui Hapus</button>`;
        } else {
          // Gmail, belum minta hapus
          aksiHtml = `<span style="font-size:0.75rem; color:rgba(249,240,224,0.4); font-style:italic;">Menunggu permintaan pengguna</span>`;
        }
      }

      const safeUsername = encodeURIComponent(u.username);
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
      tr.innerHTML = `
        <td style="padding: 10px 12px; font-weight:500; color:var(--gold-300);">
          <button onclick="window.Dashboard.openInspectModal('${u.username}')" style="background:none; border:none; color:var(--gold-400); cursor:pointer; font-weight:700; font-size:0.9rem; text-decoration:underline;">@${u.username}</button>
        </td>
        <td style="padding: 10px 12px;">${roleStr}</td>
        <td style="padding: 10px 12px;">${emailStr}</td>
        <td style="padding: 10px 12px; color:rgba(249,240,224,0.6); font-size:0.82rem;">${userComments} Saran | ${userQuizzes} Kuis</td>
        <td style="padding: 10px 12px;">${aksiHtml}</td>
      `;
      listEl.appendChild(tr);
    });
  }

  function adminDeleteUser(targetUsername) {
    if (!confirm(`Peringatan: Hapus permanen akun "${targetUsername}"? Tindakan ini tidak bisa dibatalkan!`)) return;
    let users = JSON.parse(localStorage.getItem("museum_users") || "[]");
    users = users.filter(x => x.username !== targetUsername);
    localStorage.setItem("museum_users", JSON.stringify(users));
    window.Auth?.logActivity("admin", `Menghapus akun pengguna: @${targetUsername}`);
    renderAdminUsers(); // refresh tabel langsung
    renderRecentLogs();
  }

  // ===== RADAR LIVE HEARTBEAT =====
  function startRadarHeartbeat() {
    const radarFeed = document.getElementById("admin-radar-feed");
    if (!radarFeed) return;

    // Inisialisasi awal
    renderRadarFeed();
    radarLastLogCount = JSON.parse(localStorage.getItem("dashboard_activities") || "[]").length;

    // Bersihkan interval lama jika ada
    if (radarInterval) clearInterval(radarInterval);

    radarInterval = setInterval(() => {
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      if (logs.length !== radarLastLogCount) {
        radarLastLogCount = logs.length;
        renderRadarFeed();
      } else {
        // Blip ping tetap aktif meski tidak ada log baru
        updateRadarPing();
      }
    }, 2000);
  }

  function stopRadarHeartbeat() {
    if (radarInterval) { clearInterval(radarInterval); radarInterval = null; }
  }

  function renderRadarFeed() {
    const radarFeed = document.getElementById("admin-radar-feed");
    if (!radarFeed) return;

    const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" });

    // Warna berdasarkan tipe aktivitas
    const typeColors = {
      auth: "#2ecc71",
      kuis: "#3b82f6",
      pencarian: "#a855f7",
      rekomendasi: "#f59e0b",
      admin: "#e74c3c",
      navigasi: "#22d3ee",
      user: "#fb923c",
      default: "#a8b2d1"
    };

    let html = `<div style="color:#4ade80; font-size:0.75rem; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;">[SISTEM] Radar terhubung — ${timeStr} — ${logs.length} aktivitas tercatat</div>`;

    if (logs.length === 0) {
      html += `<div style="color:#4CAF50;">Menunggu aktivitas pengguna...</div>`;
    } else {
      // Tampilkan 30 log terbaru
      logs.slice(0, 30).forEach(log => {
        const logTime = new Date(log.time);
        const logTimeStr = logTime.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
        const color = typeColors[log.type] || typeColors.default;
        const badge = log.type ? log.type.toUpperCase() : "LOG";
        html += `
          <div style="padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); display:flex; gap:8px; align-items:flex-start;">
            <span style="color:rgba(168,178,209,0.5); min-width:70px; font-size:0.75rem;">${logTimeStr}</span>
            <span style="color:${color}; font-size:0.7rem; font-weight:700; min-width:80px; background:rgba(${color.replace('#','')},0.1); padding:1px 5px; border-radius:3px; text-align:center;">[${badge}]</span>
            <span style="color:#c8d0e0; font-size:0.8rem; flex:1;">${log.description}</span>
          </div>
        `;
      });
    }

    radarFeed.innerHTML = html;
    // Auto-scroll ke atas (log terbaru)
    radarFeed.scrollTop = 0;
  }

  function updateRadarPing() {
    // Hanya update timestamp ping tanpa re-render penuh
    const firstLine = document.querySelector("#admin-radar-feed > div:first-child");
    if (!firstLine) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
    const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
    firstLine.innerHTML = `[SISTEM] Radar terhubung — ${timeStr} — ${logs.length} aktivitas tercatat`;
  }

  function renderUserDashboard(user) {
    const quizLogsEl = document.getElementById("user-dash-quiz-logs");
    const dashQuizzesEl = document.getElementById("user-dash-quizzes");
    const dashScoreEl = document.getElementById("user-dash-score");
    const dashCommentsEl = document.getElementById("user-dash-comments");
    const dashUserName = document.getElementById("dash-user-name");

    // 0. Update Profile Info
    if (dashUserName) {
      dashUserName.textContent = "Halo, " + (user.username || "Pengguna");
    }

    // 0.5 Update PvP Stats
    const pvpPointsEl = document.getElementById("user-dash-pvp-points");
    const pvpWinsEl = document.getElementById("user-dash-pvp-wins");
    if (pvpPointsEl && pvpWinsEl) {
      const pvpLb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
      const pvpEntry = pvpLb.find(e => e.username === user.username);
      if (pvpEntry) {
        pvpPointsEl.textContent = pvpEntry.points || 0;
        pvpWinsEl.textContent = pvpEntry.wins || 0;
      } else {
        pvpPointsEl.textContent = "100"; // Starting points if not initialized
        pvpWinsEl.textContent = "0";
      }
    }

    // === Gmail Tier Info ===
    const gmailInfoEl = document.getElementById("dash-gmail-info");
    if (gmailInfoEl) {
      const freshUser = JSON.parse(localStorage.getItem("museum_users") || "[]").find(u => u.username === user.username);
      const hasGmail = freshUser?.email && freshUser.email.endsWith("@gmail.com");
      if (hasGmail) {
        gmailInfoEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:1.5rem;">⭐</div>
              <div>
                <div style="font-size:0.88rem;font-weight:700;color:#22c55e;">Anggota Terverifikasi</div>
                <div style="font-size:0.78rem;color:rgba(0,0,0,0.5);">${freshUser.email}</div>
              </div>
            </div>
            <button onclick="window.Auth?.openGmailModal()" style="padding:6px 14px;font-size:0.8rem;background:transparent;border:1px solid rgba(201,168,76,0.5);border-radius:8px;cursor:pointer;color:var(--gold-500);font-weight:600;">✏️ Ganti Gmail</button>
          </div>
        `;
      } else {
        gmailInfoEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:1.5rem;">👤</div>
              <div>
                <div style="font-size:0.88rem;font-weight:700;color:var(--navy-700);">Tamu Terdaftar</div>
                <div style="font-size:0.78rem;color:rgba(0,0,0,0.5);">Tambahkan Gmail untuk fitur penuh</div>
              </div>
            </div>
            <button onclick="window.Auth?.openGmailModal()" style="padding:6px 14px;font-size:0.8rem;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:8px;cursor:pointer;color:#0a0e1a;font-weight:700;">📧 Tambahkan Gmail</button>
          </div>
          <div style="margin-top:0.75rem;padding:0.6rem 0.85rem;background:rgba(245,158,11,0.08);border-radius:8px;border-left:3px solid #f59e0b;">
            <p style="font-size:0.8rem;color:rgba(0,0,0,0.6);margin:0;">⚠️ <strong>Akses Terbatas:</strong> Tanpa Gmail, Anda tidak bisa mengirim saran/komentar dan tidak bisa memulihkan kata sandi secara otomatis.</p>
          </div>
        `;
      }
    }

    const reqDelBtn = document.getElementById("btn-request-delete");
    const statusEl = document.getElementById("dash-user-status");
    if (reqDelBtn) {
      if (user.deletionRequested) {
        reqDelBtn.style.display = "none";
        if (statusEl) statusEl.innerHTML = `Status Akun: <strong style="color:#e74c3c;">Menunggu Penghapusan (Menunggu Admin)</strong>`;
      } else {
        reqDelBtn.style.display = "block";
        if (statusEl) statusEl.innerHTML = `Status Akun: <strong>Pengunjung Terdaftar</strong>`;
        reqDelBtn.onclick = () => {
          if (confirm("Anda yakin ingin mengajukan penghapusan akun? Admin akan meninjau permintaan ini.")) {
            let users = JSON.parse(localStorage.getItem("museum_users") || "[]");
            let idx = users.findIndex(u => u.username === user.username);
            if (idx !== -1) {
              users[idx].deletionRequested = true;
              localStorage.setItem("museum_users", JSON.stringify(users));
              window.Auth?.logActivity("user", `Mengajukan penghapusan akun personal`);
              alert("Permintaan penghapusan telah dikirim ke Admin.");
              window.Dashboard.init(); // refresh dashboard
            }
          }
        };
      }
    }

    // 1. Get Quiz Scores
    const quizScores = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]");
    
    if (dashQuizzesEl) dashQuizzesEl.textContent = quizScores.length.toString();
    
    if (dashScoreEl) {
      if (quizScores.length > 0) {
        const total = quizScores.reduce((sum, q) => sum + q.score, 0);
        dashScoreEl.textContent = Math.round(total / quizScores.length).toString();
      } else {
        dashScoreEl.textContent = "0";
      }
    }

    if (quizLogsEl) {
      quizLogsEl.innerHTML = "";
      if (quizScores.length === 0) {
        quizLogsEl.innerHTML = '<li style="color:var(--navy-300); font-style:italic; padding: 15px;">Belum ada riwayat kuis.</li>';
      } else {
        quizScores.slice(0, 10).forEach(log => {
          const li = document.createElement("li");
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.marginBottom = "15px";
          li.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
          li.style.paddingBottom = "15px";
          
          let emoji = "🥉";
          if (log.score >= 80) emoji = "🥇";
          else if (log.score >= 60) emoji = "🥈";
          else if (log.score === 0) emoji = "❌";

          const logDate = new Date(log.date);

          li.innerHTML = `
            <div class="log-emoji" style="font-size: 24px; margin-right: 15px;">${emoji}</div>
            <div class="log-content">
              <p class="log-desc" style="margin:0; font-weight: 500;">Skor: ${log.score}/100</p>
              <p class="log-time" style="margin:0; font-size: 0.85rem; color: var(--navy-400);">${logDate.toLocaleDateString('id-ID')} ${logDate.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
          `;
          quizLogsEl.appendChild(li);
        });
      }
    }

    // 2. Get Forum Comments for user
    const allComments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    const userComments = allComments.filter(c => c.username === user.username);
    if (dashCommentsEl) dashCommentsEl.textContent = userComments.length.toString();

    // 3. Get User Favorites
    const dashFavoritesEl = document.getElementById("user-dash-favorites");
    if (dashFavoritesEl) {
      dashFavoritesEl.innerHTML = "";
      const favorites = user.favorites || [];
      if (favorites.length === 0) {
        dashFavoritesEl.innerHTML = '<li style="color:var(--navy-300); font-style:italic; padding: 15px;">Belum ada motif batik yang difavoritkan.</li>';
      } else {
        const batikData = window.BATIK_DATA || [];
        favorites.forEach(favId => {
          const b = batikData.find(item => item.id === favId);
          if (b) {
            dashFavoritesEl.innerHTML += `
              <li style="display:flex; align-items:center; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(0,0,0,0.05);">
                <span style="font-size:24px; margin-right:15px;">${b.emoji}</span>
                <div>
                  <p style="margin:0; font-weight:500; font-size:0.95rem;">Batik ${b.nama}</p>
                  <p style="margin:0; font-size:0.8rem; color:var(--text-light-muted);">${b.asal}</p>
                </div>
              </li>
            `;
          }
        });
      }
    }
  }

  function openInspectModal(targetUsername) {
    const modal = document.getElementById("admin-user-modal");
    const closeBtn = document.getElementById("admin-user-close-btn");
    if (!modal) return;
    
    // Set Header
    document.getElementById("admin-user-title").textContent = `Inspeksi Akun: @${targetUsername}`;
    
    const users = JSON.parse(localStorage.getItem("museum_users") || "[]");
    const u = users.find(x => x.username === targetUsername);
    if (u) {
      const hasGmail = u.email && u.email.endsWith("@gmail.com");
      const emailInfo = hasGmail
        ? `<span style="color:#22c55e;">✅ ${u.email}</span>`
        : `<span style="color:#f59e0b;">⚠️ Tidak ada Gmail terdaftar</span>`;

      // Status khusus
      let statusBadge = "";
      if (u.deletionRequested) {
        statusBadge = `<span style="background:#e74c3c22; color:#e74c3c; border:1px solid #e74c3c; padding:2px 8px; border-radius:10px; font-size:0.75rem; margin-left:8px;">Mengajukan Hapus Akun</span>`;
      }

      // Info akun + kata sandi (hanya admin yang bisa melihat ini)
      let roleHtml = `
        <div style="display:grid; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.15); border-radius:8px;">
            <span style="font-size:0.82rem; color:rgba(0,0,0,0.5);">Peran</span>
            <span style="font-weight:700; color:${u.isAdmin ? '#e74c3c' : '#c9a84c'};">${u.isAdmin ? '🔴 Administrator' : '👤 Pengguna'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.15); border-radius:8px;">
            <span style="font-size:0.82rem; color:rgba(0,0,0,0.5);">Email</span>
            <span style="font-size:0.85rem;">${emailInfo}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(201,168,76,0.08); border:1px solid rgba(201,168,76,0.25); border-radius:8px;">
            <span style="font-size:0.82rem; color:rgba(0,0,0,0.5);">🔑 Kata Sandi (Hanya Admin)</span>
            <span style="font-weight:700; color:#c9a84c; font-family:monospace; font-size:0.95rem;">${u.password || '—'}</span>
          </div>
          ${statusBadge ? `<div style="padding:6px 12px;">${statusBadge}</div>` : ""}
        </div>
      `;

      // Tombol hapus
      if (!u.isAdmin) {
        if (!hasGmail) {
          roleHtml += `<button id="btn-admin-approve-delete" class="btn-primary" style="background:#e74c3c; padding:6px 14px; margin-top:12px; font-size:0.82rem; cursor:pointer; width:100%; border-radius:8px;">🗑️ Hapus Akun Ini (Tanpa Gmail)</button>`;
        } else if (u.deletionRequested) {
          roleHtml += `<button id="btn-admin-approve-delete" class="btn-primary" style="background:#e74c3c; padding:6px 14px; margin-top:12px; font-size:0.82rem; cursor:pointer; width:100%; border-radius:8px;">✅ Setujui Permintaan Hapus Akun</button>`;
        }
      }

      document.getElementById("admin-user-role").innerHTML = roleHtml;

      setTimeout(() => {
        const btnDel = document.getElementById("btn-admin-approve-delete");
        if (btnDel) {
          btnDel.onclick = () => {
            if (confirm(`Peringatan: Hapus permanen akun "${u.username}"? Tindakan ini tidak bisa dibatalkan!`)) {
              let users = JSON.parse(localStorage.getItem("museum_users") || "[]");
              users = users.filter(x => x.username !== u.username);
              localStorage.setItem("museum_users", JSON.stringify(users));
              window.Auth?.logActivity("admin", `Menghapus akun pengguna: @${u.username}`);
              modal.hidden = true;
              modal.setAttribute("aria-hidden", "true");
              window.Dashboard.init();
            }
          };
        }
      }, 50);
    }


    const allComments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    const allQuizLogs = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]"); // (Asumsi global)
    
    // 1. Render Favorites
    const favEl = document.getElementById("admin-inspect-favorites");
    favEl.innerHTML = "";
    if (u && u.favorites && u.favorites.length > 0) {
      const batikData = window.BATIK_DATA || [];
      u.favorites.forEach(favId => {
        const b = batikData.find(item => item.id === favId);
        if (b) {
          favEl.innerHTML += `<span style="background:rgba(0,0,0,0.05); color:var(--navy-900); padding:4px 10px; border-radius:15px; font-size:0.8rem; border:1px solid var(--navy-400);">${b.emoji} Batik ${b.nama}</span>`;
        }
      });
    } else {
      favEl.innerHTML = '<span style="color:var(--navy-800); font-size:0.85rem; font-style:italic; font-weight:600;">Tidak ada koleksi favorit.</span>';
    }

    // 2. Render Quizzes
    const quizEl = document.getElementById("admin-inspect-quizzes");
    quizEl.innerHTML = "";
    const userQuizzes = (targetUsername === window.Auth?.getCurrentUser()?.username) ? allQuizLogs : []; // Simulasi: hanya jika akun yang dicek adalah akun yang sedang aktif karena data global
    if (userQuizzes.length === 0) {
      quizEl.innerHTML = '<li style="color:var(--navy-800); font-size:0.85rem; font-style:italic; font-weight:600;">Belum mengerjakan kuis.</li>';
    } else {
      userQuizzes.slice(0,10).forEach(log => {
        quizEl.innerHTML += `<li style="font-size:0.85rem; padding-bottom:5px; border-bottom:1px solid rgba(0,0,0,0.1); color:var(--navy-800);">Skor <strong style="color:var(--navy-900);">${log.score}/100</strong> pada ${new Date(log.date).toLocaleDateString("id-ID")}</li>`;
      });
    }

    // 3. Render Comments
    const commEl = document.getElementById("admin-inspect-comments");
    commEl.innerHTML = "";
    const userComments = allComments.filter(c => c.username === targetUsername);
    if (userComments.length === 0) {
      commEl.innerHTML = '<span style="color:var(--navy-800); font-size:0.85rem; font-style:italic; font-weight:600;">Belum pernah memberi saran/komentar.</span>';
    } else {
      userComments.forEach(c => {
        const dateStr = new Date(c.date).toLocaleDateString("id-ID", {day:"numeric", month:"short", year:"numeric"});
        const context = c.batikId === "GLOBAL_WEBSITE" ? "Saran Website Umum" : "Komentar Motif";
        commEl.innerHTML += `
          <div style="background:rgba(0,0,0,0.05); padding:10px; border-radius:5px; border-left:3px solid var(--navy-600);">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
              <span style="font-size:0.75rem; color:var(--navy-600);">${context}</span>
              <span style="font-size:0.75rem; color:var(--navy-500);">${dateStr}</span>
            </div>
            <p style="font-size:0.85rem; margin:0; color:var(--navy-900);">"${c.text}"</p>
          </div>
        `;
      });
    }

    // Tampilkan Modal
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    
    // Bind tombol tutup
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
      };
    }
  }

  function bindAdminEvents() {
    const addBtn = document.getElementById("add-batik-btn");
    const msg = document.getElementById("add-batik-msg");
    const iName = document.getElementById("add-batik-name");
    const iRegion = document.getElementById("add-batik-region");
    const iDesc = document.getElementById("add-batik-desc");
    const iImage = document.getElementById("add-batik-image");
    const iSamples = document.getElementById("add-batik-samples-file");
    const iSamplesAppend = document.getElementById("add-batik-samples-append");
    const select = document.getElementById("edit-batik-select");
    const deleteBtn = document.getElementById("delete-batik-btn");
    const previewImg = document.getElementById("edit-batik-preview");

    if (!select) return;

    let selectedImageBase64 = "";
    let selectedSamplesBase64 = [];
    let appendSamplesBase64 = [];

    // ── Validasi gambar (format & ukuran) ─────────────────────────────────
    function validateImage(file, msgEl) {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      const maxMB = 10;
      const maxBytes = maxMB * 1024 * 1024;
      if (!allowed.includes(file.type)) {
        const ext = file.name.split(".").pop().toUpperCase();
        if (msgEl) { msgEl.style.color = "#e74c3c"; msgEl.textContent = `❌ Format .${ext} tidak didukung. Gunakan: JPG, PNG, WebP, atau GIF.`; }
        return false;
      }
      if (file.size > maxBytes) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        if (msgEl) { msgEl.style.color = "#e74c3c"; msgEl.textContent = `❌ Gambar terlalu besar (${mb}MB). Maksimum ${maxMB}MB per file.`; }
        return false;
      }
      return true;
    }

    // Load foto append (tambah ke yang sudah ada)
    if (iSamplesAppend) {
      iSamplesAppend.addEventListener("change", (e) => {
        appendSamplesBase64 = [];
        Array.from(e.target.files || []).forEach(file => {
          if (!validateImage(file, msg)) return;
          const r = new FileReader();
          r.onload = evt => appendSamplesBase64.push(evt.target.result);
          r.readAsDataURL(file);
        });
      });
    }

    if (iSamples) {
      iSamples.addEventListener("change", (e) => {
        selectedSamplesBase64 = [];
        Array.from(e.target.files || []).forEach(file => {
          if (!validateImage(file, msg)) return;
          const r = new FileReader();
          r.onload = evt => selectedSamplesBase64.push(evt.target.result);
          r.readAsDataURL(file);
        });
      });
    }

    if (iImage) {
      iImage.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          if (!validateImage(file, msg)) { iImage.value = ""; selectedImageBase64 = ""; return; }
          const r = new FileReader();
          r.onload = evt => {
            selectedImageBase64 = evt.target.result;
            if (previewImg) { previewImg.src = selectedImageBase64; previewImg.style.display = "block"; }
            if (msg) msg.textContent = ""; // clear error
          };
          r.readAsDataURL(file);
        } else { selectedImageBase64 = ""; }
      });
    }

    // Populate dropdown
    let allBatiks = window.BATIK_DATA || JSON.parse(localStorage.getItem("global_batik_data") || "[]");
    select.innerHTML = '<option value="">--- ➕ Tambah Batik Baru ---</option>';
    allBatiks.forEach(b => {
      select.innerHTML += `<option value="${b.id}">${b.nama} (${b.asal})</option>`;
    });

    // Handle select change
    select.addEventListener("change", () => {
      const val = select.value;
      if (!val) {
        iName.value = ""; iRegion.value = ""; iDesc.value = ""; iImage.value = "";
        selectedImageBase64 = ""; selectedSamplesBase64 = []; appendSamplesBase64 = [];
        if (iSamples) iSamples.value = "";
        if (iSamplesAppend) iSamplesAppend.value = "";
        if (previewImg) previewImg.style.display = "none";
        if (deleteBtn) deleteBtn.style.display = "none";
        if (addBtn) addBtn.textContent = "Simpan Batik";
        // Sembunyikan panel tambah foto
        const appendPanel = document.getElementById("append-photo-panel");
        if (appendPanel) appendPanel.style.display = "none";
        // Sembunyikan grid foto galeri
        const existingGrid = document.getElementById('existing-photos-grid');
        if (existingGrid) existingGrid.style.display = 'none';
        return;
      }
      const b = allBatiks.find(x => x.id === val);
      if (b) {
        iName.value = b.nama;
        iRegion.value = b.asal;
        iDesc.value = b.sejarah || b.deskripsiSingkat;
        selectedImageBase64 = b.image || "";
        if (previewImg && b.image) { previewImg.src = b.image; previewImg.style.display = "block"; }
        iImage.value = "";
        selectedSamplesBase64 = []; appendSamplesBase64 = [];
        if (iSamples) iSamples.value = "";
        if (iSamplesAppend) iSamplesAppend.value = "";
        if (addBtn) addBtn.textContent = "Update Batik";
        if (deleteBtn) deleteBtn.style.display = "inline-block";
        // Tampilkan panel tambah foto
        const appendPanel = document.getElementById("append-photo-panel");
        if (appendPanel) appendPanel.style.display = "block";
        // Tampilkan jumlah foto saat ini
        const curPhotoCount = document.getElementById("cur-photo-count");
        if (curPhotoCount) curPhotoCount.textContent = b.samples?.length || 0;
        // Tampilkan grid foto galeri yang sudah ada
        renderExistingPhotos(b);
      }
    });

    // Tombol Hapus Batik
    if (deleteBtn) {
      const newDel = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDel, deleteBtn);
      newDel.addEventListener("click", () => {
        const selectedId = select.value;
        if (!selectedId) return;
        const b = allBatiks.find(x => x.id === selectedId);
        if (!confirm(`Yakin hapus "${b?.nama}" dari koleksi? Tidak bisa dibatalkan!`)) return;
        let data = JSON.parse(localStorage.getItem("global_batik_data") || "[]");
        if (!data.length) data = window.BATIK_DATA || [];
        data = data.filter(x => x.id !== selectedId);
        localStorage.setItem("global_batik_data", JSON.stringify(data));
        window.BATIK_DATA = data;
        if (window.DB) DB.write("batik_data", data); // Firebase sync
        window.Auth?.logActivity("admin", `Menghapus koleksi: ${b?.nama}`);
        if (msg) { msg.style.color = "#22c55e"; msg.textContent = `"${b?.nama}" berhasil dihapus dari koleksi.`; }
        select.value = "";
        iName.value = ""; iRegion.value = ""; iDesc.value = "";
        if (previewImg) previewImg.style.display = "none";
        newDel.style.display = "none";
        setTimeout(() => { if (msg) msg.textContent = ""; bindAdminEvents(); }, 2000);
      });
    }

    // Tombol Simpan/Update
    if (addBtn) {
      const newBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newBtn, addBtn);
      newBtn.addEventListener("click", () => {
        const name = iName.value.trim();
        const region = iRegion.value.trim();
        const desc = iDesc.value.trim();
        const selectedId = select.value;

        if (!name || !region || !desc) {
          if (msg) { msg.style.color = "#e74c3c"; msg.textContent = "Semua kolom wajib diisi!"; }
          setTimeout(() => { if (msg) msg.textContent = ""; }, 3000);
          return;
        }

        let data = JSON.parse(localStorage.getItem("global_batik_data"));
        if (!data) data = window.BATIK_DATA || [];
        const finalImage = selectedImageBase64 || "img/batik-merak-lasem.jpg";

        if (selectedId) {
          // Update
          const idx = data.findIndex(x => x.id === selectedId);
          if (idx !== -1) {
            data[idx].nama = name;
            data[idx].asal = region;
            data[idx].deskripsiSingkat = desc;
            data[idx].sejarah = desc;
            data[idx].image = finalImage;
            // Ganti foto samples (opsional)
            if (selectedSamplesBase64.length > 0) data[idx].samples = selectedSamplesBase64;
            // Tambah foto ke yang sudah ada
            if (appendSamplesBase64.length > 0) {
              data[idx].samples = [...(data[idx].samples || []), ...appendSamplesBase64];
            }
            window.Auth?.logActivity("admin", `Memperbarui koleksi: ${name}`);
            if (msg) msg.textContent = `"${name}" berhasil diperbarui!`;
          }
        } else {
          // Tambah baru
          const newB = {
            id: "custom_" + Date.now(),
            nama: name, asal: region,
            image: finalImage,
            samples: selectedSamplesBase64.length > 0 ? selectedSamplesBase64 : [],
            emoji: "✨",
            deskripsiSingkat: desc, sejarah: desc, filosofi: desc,
            karakteristik: ["Kustom"], isCustom: true
          };
          data.push(newB);
          window.Auth?.logActivity("admin", `Menambahkan koleksi: ${name}`);
          if (msg) msg.textContent = `"${name}" berhasil ditambahkan!`;
        }

        localStorage.setItem("global_batik_data", JSON.stringify(data));
        window.BATIK_DATA = data;
        if (window.DB) DB.write("batik_data", data); // Firebase sync
        if (msg) msg.style.color = "#22c55e";
        setTimeout(() => { if (msg) msg.textContent = ""; }, 3000);
        iName.value = ""; iRegion.value = ""; iDesc.value = ""; iImage.value = "";
        if (iSamples) iSamples.value = "";
        if (iSamplesAppend) iSamplesAppend.value = "";
        if (previewImg) previewImg.style.display = "none";
        select.value = ""; selectedImageBase64 = ""; selectedSamplesBase64 = []; appendSamplesBase64 = [];
        bindAdminEvents(); // refresh dropdown
      });
    }

    // Render saran pengguna yang menunggu tinjauan
    renderPendingSuggestions();
  }

  function renderExistingPhotos(batik) {
    const grid = document.getElementById('existing-photos-grid');
    if (!grid) return;
    if (!batik.samples || batik.samples.length === 0) {
      grid.innerHTML = '<p style="color:rgba(249,240,224,0.4);font-size:0.8rem;">Belum ada foto galeri untuk batik ini.</p>';
      grid.style.display = 'block';
      return;
    }
    let html = '<p style="font-size:0.82rem;color:#d4b45a;margin-bottom:8px;font-weight:600;">📸 Foto Galeri Saat Ini (' + batik.samples.length + ' foto):</p>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">';
    batik.samples.forEach((src, idx) => {
      html += `<div style="position:relative;border-radius:6px;overflow:hidden;border:1px solid rgba(201,168,76,0.3);">
        <img src="${src}" style="width:100%;height:75px;object-fit:cover;display:block;"/>
        <div style="display:flex;gap:2px;padding:3px;background:rgba(0,0,0,0.7);">
          <label style="flex:1;cursor:pointer;">
            <input type="file" accept="image/*" data-photo-index="${idx}" class="photo-replace-input" style="display:none;"/>
            <span style="display:block;text-align:center;font-size:0.65rem;color:#4ade80;font-weight:600;padding:2px;">🔄</span>
          </label>
          <button class="photo-delete-btn" data-photo-index="${idx}" style="flex:1;background:none;border:none;cursor:pointer;font-size:0.65rem;color:#e74c3c;font-weight:600;padding:2px;">🗑️</button>
        </div>
      </div>`;
    });
    html += '</div>';
    grid.innerHTML = html;
    grid.style.display = 'block';

    // Bind replace handlers
    grid.querySelectorAll('.photo-replace-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.dataset.photoIndex);
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
          let data = JSON.parse(localStorage.getItem('global_batik_data') || '[]');
          if (!data.length) data = window.BATIK_DATA || [];
          const bIdx = data.findIndex(x => x.id === batik.id);
          if (bIdx !== -1 && data[bIdx].samples) {
            data[bIdx].samples[idx] = evt.target.result;
            localStorage.setItem('global_batik_data', JSON.stringify(data));
            window.BATIK_DATA = data;
            window.Auth?.logActivity('admin', 'Mengganti foto galeri batik: ' + batik.nama);
            renderExistingPhotos(data[bIdx]);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    // Bind delete handlers
    grid.querySelectorAll('.photo-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.photoIndex);
        if (!confirm('Hapus foto ini dari galeri?')) return;
        let data = JSON.parse(localStorage.getItem('global_batik_data') || '[]');
        if (!data.length) data = window.BATIK_DATA || [];
        const bIdx = data.findIndex(x => x.id === batik.id);
        if (bIdx !== -1 && data[bIdx].samples) {
          data[bIdx].samples.splice(idx, 1);
          localStorage.setItem('global_batik_data', JSON.stringify(data));
          window.BATIK_DATA = data;
          window.Auth?.logActivity('admin', 'Menghapus foto galeri batik: ' + batik.nama);
          renderExistingPhotos(data[bIdx]);
          const curPhotoCount = document.getElementById('cur-photo-count');
          if (curPhotoCount) curPhotoCount.textContent = data[bIdx].samples.length;
        }
      });
    });
  }

  function renderAdminGmailCard() {
    const statusEl = document.getElementById('admin-gmail-status');
    if (!statusEl) return;
    const freshAdmin = JSON.parse(localStorage.getItem('museum_users') || '[]').find(u => u.isAdmin);
    const hasGmail = freshAdmin?.email && freshAdmin.email.endsWith('@gmail.com');
    if (hasGmail) {
      statusEl.innerHTML = `✅ Gmail terhubung: <strong style="color:#4ade80;">${freshAdmin.email}</strong> — Notifikasi keamanan aktif`;
    } else {
      statusEl.innerHTML = `⚠️ <span style="color:#f59e0b;">Gmail belum terhubung</span> — Keamanan akun admin terbatas. Tambahkan Gmail untuk notifikasi keamanan.`;
    }
  }

  function renderPendingSuggestions() {
    const el = document.getElementById("admin-pending-suggestions");
    if (!el) return;
    const comments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    const pending = comments.filter(c => !c.reviewed);
    if (pending.length === 0) {
      el.innerHTML = '<p style="color:rgba(249,240,224,0.45);font-size:0.85rem;font-style:italic;">Tidak ada saran yang menunggu tinjauan.</p>';
      return;
    }
    el.innerHTML = pending.map(c => `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.2);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.65rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
          <span style="font-size:0.78rem;color:#d4b45a;font-weight:700;">@${c.username}</span>
          <span style="font-size:0.75rem;color:rgba(249,240,224,0.35);">${new Date(c.date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span>
        </div>
        <p style="font-size:0.85rem;color:rgba(249,240,224,0.8);margin:0 0 0.65rem;">&quot;${c.text}&quot;</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button onclick="window.Dashboard.reviewSuggestion('${c.id}', true)" style="padding:4px 12px;font-size:0.78rem;background:#22c55e;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">✅ Tandai Ditinjau</button>
          <button onclick="window.Dashboard.reviewSuggestion('${c.id}', false)" style="padding:4px 12px;font-size:0.78rem;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">🗑️ Hapus Saran</button>
        </div>
      </div>
    `).join("");
  }

  function reviewSuggestion(id, keep) {
    const comments = JSON.parse(localStorage.getItem("museum_comments") || "[]");
    let updated;
    if (keep) {
      updated = comments.map(c => c.id === id ? { ...c, reviewed: true } : c);
    } else {
      updated = comments.filter(c => c.id !== id);
    }
    localStorage.setItem("museum_comments", JSON.stringify(updated));
    if (window.DB) DB.write("comments", updated); // Firebase sync
    window.Auth?.logActivity("admin", keep ? "Meninjau saran pengguna" : "Menghapus saran pengguna");
    renderPendingSuggestions();
  }

  function renderResetRequests() {
    const el = document.getElementById("admin-reset-requests");
    if (!el) return;
    const requests = JSON.parse(localStorage.getItem("museum_reset_requests") || "[]");
    const pending = requests.filter(r => r.status === "pending");
    if (pending.length === 0) {
      el.innerHTML = '<p style="color:rgba(249,240,224,0.4);font-size:0.85rem;font-style:italic;">Tidak ada permintaan reset sandi yang menunggu.</p>';
      return;
    }
    el.innerHTML = pending.map(r => `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.65rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <div>
            <span style="font-size:0.88rem;font-weight:700;color:#f59e0b;">@${r.username}</span>
            <span style="font-size:0.75rem;color:rgba(249,240,224,0.35);margin-left:8px;">${new Date(r.requestedAt).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          <span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;">Menunggu</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="new-pass-${r.id}" type="text" placeholder="Sandi baru untuk @${r.username}" style="flex:1;min-width:150px;padding:7px 10px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(0,0,0,0.3);color:white;font-size:0.85rem;outline:none;"/>
          <button onclick="window.Dashboard.processResetRequest('${r.id}', '${r.username}')" style="padding:7px 14px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.82rem;">✅ Tetapkan Sandi</button>
          <button onclick="window.Dashboard.processResetRequest('${r.id}', null)" style="padding:7px 12px;background:rgba(231,76,60,0.2);color:#e74c3c;border:1px solid #e74c3c;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.82rem;">❌ Tolak</button>
        </div>
      </div>
    `).join("");
  }

  function processResetRequest(requestId, username) {
    const requests = JSON.parse(localStorage.getItem("museum_reset_requests") || "[]");
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1) return;

    if (!username) {
      requests[idx].status = "rejected";
      localStorage.setItem("museum_reset_requests", JSON.stringify(requests));
      if (window.DB) DB.write("reset_requests", requests); // Firebase sync
      window.Auth?.logActivity("admin", `Menolak permintaan reset sandi: @${requests[idx].username}`);
      renderResetRequests();
      return;
    }

    const newPass = document.getElementById(`new-pass-${requestId}`)?.value.trim();
    if (!newPass || newPass.length < 4) { alert("Sandi baru minimal 4 karakter!"); return; }

    // Update sandi pengguna + sync Firebase
    const users = JSON.parse(localStorage.getItem("museum_users") || "[]");
    const uIdx = users.findIndex(u => u.username === username);
    if (uIdx !== -1) {
      users[uIdx].password = newPass;
      localStorage.setItem("museum_users", JSON.stringify(users));
      if (window.DB) DB.write("users", users); // Firebase sync
    }

    requests[idx].status = "done";
    requests[idx].processedAt = new Date().toISOString();
    localStorage.setItem("museum_reset_requests", JSON.stringify(requests));
    if (window.DB) DB.write("reset_requests", requests); // Firebase sync
    window.Auth?.logActivity("admin", `Reset sandi @${username} berhasil dilakukan`);
    alert(`✅ Sandi untuk @${username} berhasil direset menjadi: "${newPass}"\n\nBeritahu pengguna untuk segera ganti sandi setelah masuk.`);
    renderResetRequests();
  }

  return { init, openInspectModal, adminDeleteUser, reviewSuggestion, processResetRequest };
})();

// Dengarkan perubahan status login untuk me-refresh dasbor tanpa perlu reload halaman
window.addEventListener("authStateChanged", () => {
  if (window.Dashboard) {
    window.Dashboard.init();
  }
});

window.Dashboard = Dashboard;
