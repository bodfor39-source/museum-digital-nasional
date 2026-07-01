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

    if (currentUser.isAdmin) {
      if (adminEl) adminEl.style.display = "block";
      if (userEl) userEl.style.display = "none";
      initVisitorStats();
      renderStats();
      renderActivityChart();
      renderRecentLogs();
      renderAdminUsers(); // Render account monitor
      bindAdminEvents();  // Pasang event untuk Admin Add Batik
    } else {
      if (adminEl) adminEl.style.display = "none";
      if (userEl) userEl.style.display = "block";
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
    
    // Asumsikan data ini global tapi untuk demo kita sebut semua kuis = kuis global
    const allQuizLogs = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]");
    
    if (users.length === 0) {
      listEl.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-light-muted);">Belum ada akun terdaftar</td></tr>';
      return;
    }

    users.forEach(u => {
      const userComments = allComments.filter(c => c.username === u.username).length;
      // Karena demo menyimpan kuis global tanpa username, kita ambil estimasi acak atau 0 kecuali jika itu user aktif 
      const userQuizzes = (window.Auth?.getCurrentUser()?.username === u.username) ? allQuizLogs.length : 0;
      
      const roleStr = u.isAdmin ? '<span style="background:#e74c3c; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem;">Admin</span>' : '<span style="background:var(--gold-400); color:var(--navy-900); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">User</span>';
      
      const targetEmail = u.email || `${u.username}@gmail.com`; // Fallback jika pengguna lama tidak punya email
      const mailtoLink = `mailto:${targetEmail}?subject=Pemulihan%20Sandi%20Akun%20Museum%20Digital&body=Halo%20${u.username},%0A%0ABerikut%20adalah%20tautan%20untuk%20mereset%20sandi%20Anda:%20[LINK_RESET_DISINI]%0A%0ASalam,%0AAdmin%20Museum%20Digital`;

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
      tr.innerHTML = `
        <td style="padding: 12px; font-weight: 500; color: var(--navy-800);">
          <button onclick="window.Dashboard.openInspectModal('${u.username}')" style="background:none; border:none; color:var(--gold-500); cursor:pointer; font-weight:bold; font-size:0.95rem; text-decoration:underline;">@${u.username}</button>
        </td>
        <td style="padding: 12px;">${roleStr}</td>
        <td style="padding: 12px; color: var(--text-light-muted); font-size:0.85rem;">${userComments} Saran | ${userQuizzes} Kuis</td>
        <td style="padding: 12px;">
          <a href="${mailtoLink}" target="_blank" class="btn-ghost" style="padding: 5px 10px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items:center; gap:5px;">
            <span style="font-size:1rem;">📧</span> Kirim Pemulihan
          </a>
        </td>
      `;
      listEl.appendChild(tr);
    });
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
      let roleHtml = u.isAdmin ? "Peran: Administrator" : "Peran: Pengguna Biasa";
      if (!u.email) {
        roleHtml += ` <br><span style="font-size:0.8rem; color:#888;">(Akun Tanpa Email)</span> <button id="btn-admin-approve-delete" class="btn-primary" style="background:#e74c3c; padding:4px 10px; margin-top:10px; font-size:0.8rem; cursor:pointer;">Hapus Permanen (Bebas)</button>`;
      } else if (u.deletionRequested) {
        roleHtml += ` <br><button id="btn-admin-approve-delete" class="btn-primary" style="background:#e74c3c; padding:4px 10px; margin-top:10px; font-size:0.8rem; cursor:pointer;">Setujui Hapus Akun</button>`;
      }
      document.getElementById("admin-user-role").innerHTML = roleHtml;

      setTimeout(() => {
        const btnDel = document.getElementById("btn-admin-approve-delete");
        if (btnDel) {
          btnDel.onclick = () => {
            if (confirm(`Peringatan: Hapus permanen akun ${u.username}?`)) {
              let users = JSON.parse(localStorage.getItem("museum_users") || "[]");
              users = users.filter(x => x.username !== u.username);
              localStorage.setItem("museum_users", JSON.stringify(users));
              window.Auth?.logActivity("admin", `Menghapus akun pengguna: ${u.username}`);
              close();
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
    const select = document.getElementById("edit-batik-select");
    
    if (addBtn && iName && iRegion && iDesc && select && iImage) {
      let selectedImageBase64 = "";
      let selectedSamplesBase64 = [];

      if (iSamples) {
        iSamples.addEventListener("change", (e) => {
          selectedSamplesBase64 = [];
          const files = e.target.files;
          if (!files || files.length === 0) return;
          
          Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (evt) => {
              selectedSamplesBase64.push(evt.target.result);
            };
            reader.readAsDataURL(file);
          });
        });
      }

      iImage.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(evt) {
            selectedImageBase64 = evt.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          selectedImageBase64 = "";
        }
      });

      // 1. Populate Dropdown
      let allBatiks = window.BATIK_DATA || JSON.parse(localStorage.getItem("global_batik_data") || "[]");
      select.innerHTML = '<option value="">--- ➕ Tambah Batik Baru ---</option>';
      allBatiks.forEach(b => {
        select.innerHTML += `<option value="${b.id}">${b.nama} (${b.asal})</option>`;
      });

      // 2. Handle Select Change (Auto-fill)
      select.addEventListener("change", () => {
        const val = select.value;
        if (!val) {
          iName.value = ""; iRegion.value = ""; iDesc.value = ""; iImage.value = ""; selectedImageBase64 = "";
          if (iSamples) iSamples.value = ""; selectedSamplesBase64 = [];
          addBtn.textContent = "Simpan Batik";
          return;
        }
        const b = allBatiks.find(x => x.id === val);
        if (b) {
          iName.value = b.nama;
          iRegion.value = b.asal;
          iDesc.value = b.sejarah || b.deskripsiSingkat;
          iImage.value = ""; 
          selectedImageBase64 = b.image || "";
          if (iSamples) iSamples.value = ""; selectedSamplesBase64 = [];
          addBtn.textContent = "Update Batik";
        }
      });

      // Hilangkan event listener lama agar tidak dobel
      const newBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newBtn, addBtn);
      
      newBtn.addEventListener("click", () => {
        const name = iName.value.trim();
        const region = iRegion.value.trim();
        const desc = iDesc.value.trim();
        const imgUrl = selectedImageBase64;
        const selectedId = select.value;
        
        if (!name || !region || !desc) {
          msg.style.color = "#e74c3c";
          msg.textContent = "Semua kolom teks wajib diisi!";
          setTimeout(() => msg.textContent = "", 3000);
          return;
        }

        let allBatiksData = JSON.parse(localStorage.getItem("global_batik_data"));
        if (!allBatiksData) allBatiksData = window.BATIK_DATA || [];
        const finalImage = imgUrl || "img/batik-merak-lasem.jpg"; // Gambar default jika kosong
        
        if (selectedId) {
          // Update mode
          const idx = allBatiksData.findIndex(x => x.id === selectedId);
          if (idx !== -1) {
            allBatiksData[idx].nama = name;
            allBatiksData[idx].asal = region;
            allBatiksData[idx].deskripsiSingkat = desc;
            allBatiksData[idx].sejarah = desc;
            allBatiksData[idx].filosofi = desc;
            allBatiksData[idx].image = finalImage;
            if (selectedSamplesBase64.length > 0) {
              allBatiksData[idx].samples = selectedSamplesBase64;
            }
            window.Auth?.logActivity("admin", `Memperbarui data koleksi museum: ${name}`);
            msg.textContent = "Koleksi berhasil diperbarui!";
          }
        } else {
          // Add mode
          const newBatik = {
            id: "custom_" + Date.now(),
            nama: name,
            asal: region,
            image: finalImage,
            samples: selectedSamplesBase64.length > 0 ? selectedSamplesBase64 : [],
            emoji: "✨",
            deskripsiSingkat: desc,
            sejarah: desc,
            filosofi: desc,
            karakteristik: ["Kustom"],
            isCustom: true
          };
          allBatiksData.push(newBatik);
          window.Auth?.logActivity("admin", `Menambahkan koleksi baru: ${name}`);
          msg.textContent = "Koleksi baru berhasil ditambahkan!";
        }

        localStorage.setItem("global_batik_data", JSON.stringify(allBatiksData));
        window.BATIK_DATA = allBatiksData; // Segera perbarui state global
        
        msg.style.color = "#2ecc71";
        setTimeout(() => msg.textContent = "", 3000);
        iName.value = ""; iRegion.value = ""; iDesc.value = ""; iImage.value = ""; select.value = ""; selectedImageBase64 = "";
        if (iSamples) iSamples.value = ""; selectedSamplesBase64 = [];
        
        // Refresh dropdown
        bindAdminEvents();
      });
    }
  }

  return { init, openInspectModal };
})();

// Dengarkan perubahan status login untuk me-refresh dasbor tanpa perlu reload halaman
window.addEventListener("authStateChanged", () => {
  if (window.Dashboard) {
    window.Dashboard.init();
  }
});

window.Dashboard = Dashboard;
