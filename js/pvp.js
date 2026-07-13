/**
 * pvp.js v3 — Sistem Duel Rebut Poin (PvP)
 * Arena khusus di pvp.html
 * Bug fixes: timer reset, pilihan ganda gambar, polling benar
 */

const PvPSys = (() => {
  const PVP_GAMES = ["tebak_gambar", "susun_kata", "adu_refleks"];
  let pollInterval = null;
  let currentDuelId = null;
  let currentUser = null;

  // State game — TIDAK boleh di-reset oleh polling
  let gameStartTime = null; // diset sekali saat game dimulai
  let gameSubmitted = false; // flag agar tidak submit 2x
  let clickerActive = false;
  let clickerCount = 0;
  let clickerTimeLeft = 5.0;
  let clickerInterval = null;

  // ─────────────────────────────────────────────
  // INIT PAGE (dipanggil dari pvp.html)
  // ─────────────────────────────────────────────
  async function initPage() {
    currentUser = window.Auth?.getCurrentUser();
    const needLogin = document.getElementById("pvp-need-login");
    const myStats = document.getElementById("pvp-my-stats");
    const contentGrid = document.getElementById("pvp-content-grid");
    const arenaMain = document.getElementById("pvp-arena-main");

    if (!currentUser || !currentUser.email) {
      if (needLogin) needLogin.style.display = "block";
      if (contentGrid) contentGrid.style.display = "none";
      if (arenaMain) arenaMain.style.display = "none";
      // Tetap render leaderboard agar bisa dilihat
      await syncAndRenderLeaderboard();
      if (contentGrid) contentGrid.style.display = "grid";
      return;
    }

    // Init user di PvP leaderboard jika belum ada
    await initUserPvP(currentUser);

    // Render stats bar
    renderMyStats();
    if (myStats) myStats.style.display = "flex";

    // Sync data dari Firebase
    if (window.DB && navigator.onLine) {
      await Promise.all([
        DB.pull("pvp_leaderboard", "museum_pvp_leaderboard", []),
        DB.pull("pvp_duels", "museum_pvp_duels", [])
      ]);
    }

    // Render arena dan leaderboard
    renderArena();
    await syncAndRenderLeaderboard();

    // Mulai polling
    startPolling();
  }

  // ─────────────────────────────────────────────
  // INISIALISASI USER DI PVP LEADERBOARD
  // ─────────────────────────────────────────────
  async function initUserPvP(user) {
    if (!user || !user.email) return;
    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    const entry = lb.find(e => e.username === user.username);
    if (!entry) {
      lb.push({ username: user.username, points: 100, wins: 0, losses: 0 });
      lb.sort((a, b) => b.points - a.points);
      if (window.DB) await DB.push("pvp_leaderboard", "museum_pvp_leaderboard", lb);
      else localStorage.setItem("museum_pvp_leaderboard", JSON.stringify(lb));
    }
  }

  // ─────────────────────────────────────────────
  // RENDER MY STATS BAR
  // ─────────────────────────────────────────────
  function renderMyStats() {
    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    const entry = lb.find(e => e.username === currentUser.username);
    const pts = entry?.points ?? 100;
    const wins = entry?.wins ?? 0;
    const losses = entry?.losses ?? 0;
    const el = id => document.getElementById(id);
    if (el("pvp-stat-pts")) el("pvp-stat-pts").textContent = pts;
    if (el("pvp-stat-wins")) el("pvp-stat-wins").textContent = wins;
    if (el("pvp-stat-losses")) el("pvp-stat-losses").textContent = losses;
  }

  // ─────────────────────────────────────────────
  // RENDER LEADERBOARD
  // ─────────────────────────────────────────────
  async function syncAndRenderLeaderboard() {
    if (window.DB && navigator.onLine) {
      await DB.pull("pvp_leaderboard", "museum_pvp_leaderboard", []);
    }
    const container = document.getElementById("pvp-leaderboard-list");
    if (!container) return;

    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    lb.sort((a, b) => b.points - a.points);

    if (lb.length === 0) {
      container.innerHTML = '<p style="color:rgba(249,240,224,0.4);text-align:center;padding:20px;">Belum ada pemain. Jadilah yang pertama!</p>';
      return;
    }

    const badges = ["👑", "🥈", "🥉"];
    let html = "";
    lb.forEach((entry, idx) => {
      const isMe = currentUser && entry.username === currentUser.username;
      const canChallenge = currentUser && currentUser.email && !isMe;
      html += `
        <div class="lb-row ${isMe ? "is-me" : ""}">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="lb-rank">${badges[idx] || "#" + (idx + 1)}</span>
            <div>
              <div class="lb-name">@${entry.username}${isMe ? " (Anda)" : ""}</div>
              <div class="lb-sub">W: ${entry.wins || 0} · L: ${entry.losses || 0}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="lb-pts">${entry.points}</span>
            ${canChallenge ? `<button class="btn-challenge" onclick="window.PvPSys.challengeUser('${entry.username}')">⚔️ Tantang</button>` : ""}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ─────────────────────────────────────────────
  // TANTANGAN
  // ─────────────────────────────────────────────
  async function challengeUser(targetUsername) {
    if (!currentUser || !currentUser.email) {
      alert("Hanya akun Gmail yang dapat menantang. Silakan hubungkan Gmail Anda.");
      return;
    }

    // Sync dulu sebelum cek
    if (window.DB && navigator.onLine) {
      await DB.pull("pvp_duels", "museum_pvp_duels", []);
      await DB.pull("pvp_leaderboard", "museum_pvp_leaderboard", []);
    }

    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    const myEntry = lb.find(e => e.username === currentUser.username);
    if (!myEntry || myEntry.points < 10) {
      alert("Poin Anda tidak cukup untuk bertaruh! Minimal 10 poin dibutuhkan.");
      return;
    }

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const existing = duels.find(d =>
      ((d.player1 === currentUser.username && d.player2 === targetUsername) ||
       (d.player2 === currentUser.username && d.player1 === targetUsername)) &&
      d.status !== "finished"
    );
    if (existing) {
      alert("Anda sudah memiliki duel aktif dengan pemain ini! Selesaikan dulu yang sedang berjalan.");
      return;
    }

    if (!confirm(`⚔️ Tantang @${targetUsername}?\n\nJika menang: Anda dapat +10 poin dari mereka.\nJika kalah: Anda kehilangan -10 poin ke mereka.\n\nLanjutkan?`)) return;

    // Pilih game acak
    const gameType = PVP_GAMES[Math.floor(Math.random() * PVP_GAMES.length)];

    // Siapkan data game
    const bData = JSON.parse(localStorage.getItem("global_batik_data") || "[]");
    let gameData = { gameType };

    if ((gameType === "tebak_gambar" || gameType === "susun_kata") && bData.length >= 4) {
      // Pilih 1 jawaban benar + 3 pengecoh (acak)
      const shuffled = [...bData].sort(() => 0.5 - Math.random());
      const correct = shuffled[0];
      const distractors = shuffled.slice(1, 4);

      gameData.answer = correct.nama.toLowerCase().trim();
      gameData.motifId = correct.id;

      if (gameType === "tebak_gambar") {
        gameData.image = correct.samples?.[0] || correct.image || "";
        // Simpan 4 pilihan (diacak urutannya)
        const choices = [correct.nama, ...distractors.map(d => d.nama)].sort(() => 0.5 - Math.random());
        gameData.choices = choices;
      } else {
        // Susun kata: acak huruf nama
        const nama = correct.nama.toUpperCase();
        let anagram = nama.split("").sort(() => 0.5 - Math.random()).join("");
        // Pastikan berbeda dari aslinya
        if (anagram === nama && nama.length > 1) anagram = nama.slice(1) + nama[0];
        gameData.anagram = anagram;
      }
    }

    const duel = {
      id: "pvp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type: "pvp_rebut_poin",
      player1: currentUser.username,
      player2: targetUsername,
      status: "waiting_for_player2",
      gameType,
      gameData,
      state: { p1_score: null, p2_score: null, p1_ready: true, p2_ready: false },
      createdAt: new Date().toISOString()
    };

    duels.unshift(duel);
    const saved = duels.slice(0, 60);
    localStorage.setItem("museum_pvp_duels", JSON.stringify(saved));
    if (window.DB) await DB.push("pvp_duels", "museum_pvp_duels", saved);

    // Email ke lawan
    const targetUser = window.Auth?.findUser(targetUsername);
    if (targetUser?.email) {
      sendPvPEmail(targetUser.email, targetUser.username,
        "⚠️ Poin Anda Ditantang!",
        `@${currentUser.username} menantang Anda dalam Duel Rebut Poin PvP!\n\nSegera buka halaman Arena PvP (pvp.html) di website untuk mempertahankan poin Anda. Jika Anda menang, Anda akan merampas 10 poin mereka!`
      );
    }

    alert(`✅ Tantangan terkirim ke @${targetUsername}!\nBuka Arena PvP untuk memainkan giliran Anda.`);
    renderArena();
    syncAndRenderLeaderboard();
  }

  // ─────────────────────────────────────────────
  // RENDER ARENA (dipanggil saat init dan polling)
  // ─────────────────────────────────────────────
  function renderArena() {
    const arenaMain = document.getElementById("pvp-arena-main");
    const arenaContent = document.getElementById("pvp-arena-content");
    if (!arenaMain || !arenaContent) return;

    if (!currentUser?.email) {
      arenaMain.style.display = "none";
      return;
    }

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const activeDuel = duels.find(d =>
      (d.player1 === currentUser.username || d.player2 === currentUser.username) &&
      d.status !== "finished"
    );

    if (!activeDuel) {
      arenaMain.style.display = "none";
      return;
    }

    currentDuelId = activeDuel.id;
    arenaMain.style.display = "block";

    const isP1 = activeDuel.player1 === currentUser.username;
    const opponent = isP1 ? activeDuel.player2 : activeDuel.player1;
    const myScore = isP1 ? activeDuel.state.p1_score : activeDuel.state.p2_score;
    const oppScore = isP1 ? activeDuel.state.p2_score : activeDuel.state.p1_score;
    const oppReady = isP1 ? activeDuel.state.p2_ready : activeDuel.state.p1_ready;

    let html = `
      <div style="font-size:0.82rem; color:rgba(249,240,224,0.5); margin-bottom:12px;">
        🎮 Game: <strong style="color:var(--gold-400);">${formatGameName(activeDuel.gameType)}</strong>
      </div>
      <div class="arena-vs">
        <div class="arena-player">
          <div class="arena-player-name">Anda<br>(@${currentUser.username})</div>
          <div class="arena-player-status">${myScore !== null ? "✅" : "⚔️"}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:5px;">${myScore !== null ? "Selesai" : "Giliran Anda"}</div>
        </div>
        <div class="arena-vs-text">VS</div>
        <div class="arena-player">
          <div class="arena-player-name">Lawan<br>(@${opponent})</div>
          <div class="arena-player-status">${!oppReady ? "⏳" : oppScore !== null ? "✅" : "🎮"}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:5px;">${!oppReady ? "Belum terima" : oppScore !== null ? "Selesai" : "Sedang main"}</div>
        </div>
      </div>
    `;

    if (activeDuel.status === "waiting_for_player2") {
      if (isP1) {
        html += `
          <div style="text-align:center; padding:15px; color:#f39c12;">
            <p style="font-weight:700; margin-bottom:8px;">⏳ Menunggu @${opponent} menerima tantangan...</p>
            <p style="font-size:0.82rem; color:rgba(249,240,224,0.5);">Email notifikasi sudah terkirim. Anda bisa memainkan giliran Anda sekarang, atau tunggu lawan terlebih dahulu.</p>
            <div style="margin-top:15px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
              ${myScore === null ? `<button class="btn-accept" onclick="window.PvPSys.startMyTurn()">🎮 Main Giliran Saya Sekarang</button>` : `<span style="color:#2ecc71;font-weight:700;">✅ Giliran Anda sudah selesai! Menunggu lawan...</span>`}
              <button class="btn-cancel" onclick="window.PvPSys.cancelDuel('${activeDuel.id}')">Batalkan</button>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="text-align:center; padding:15px;">
            <p style="color:white; font-weight:700; margin-bottom:8px;">@${opponent} menantang Anda!</p>
            <p style="font-size:0.85rem; color:#e74c3c; margin-bottom:15px;">⚠️ Jika kalah: -10 poin. Jika menang: +10 poin dari mereka.</p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
              <button class="btn-accept" onclick="window.PvPSys.acceptDuel('${activeDuel.id}')">✅ Terima & Bertarung!</button>
              <button class="btn-cancel" onclick="window.PvPSys.cancelDuel('${activeDuel.id}')">❌ Tolak</button>
            </div>
          </div>
        `;
      }
    } else if (activeDuel.status === "playing") {
      if (myScore !== null) {
        html += `<div style="text-align:center; padding:20px; color:#2ecc71; font-weight:700;">✅ Skor Anda sudah dikunci! Menunggu @${opponent} menyelesaikan bagiannya...</div>`;
      } else {
        // Tampilkan game — gameStartTime diset HANYA sekali di sini
        if (gameStartTime === null && !gameSubmitted) {
          gameStartTime = Date.now();
        }
        html += renderGameControls(activeDuel);
      }
    }

    arenaContent.innerHTML = html;
  }

  // ─────────────────────────────────────────────
  // START MY TURN (untuk P1 saat waiting)
  // ─────────────────────────────────────────────
  function startMyTurn() {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const active = duels.find(d => d.id === currentDuelId);
    if (!active) return;

    // Set state playing agar bisa main (tanpa harus tunggu P2 terima dulu)
    if (gameStartTime === null && !gameSubmitted) {
      gameStartTime = Date.now();
    }
    // Re-render dengan game controls
    const arenaContent = document.getElementById("pvp-arena-content");
    if (arenaContent) {
      arenaContent.innerHTML += renderGameControls(active);
    }
    // Sembunyikan tombol "Main sekarang"
    document.querySelectorAll("[onclick*='startMyTurn']").forEach(b => b.style.display = "none");
  }

  // ─────────────────────────────────────────────
  // RENDER MINI GAMES
  // ─────────────────────────────────────────────
  function renderGameControls(duel) {
    const d = duel.gameData;

    if (duel.gameType === "tebak_gambar") {
      const choices = d.choices || [];
      const choicesBtns = choices.map((name, i) =>
        `<button class="choice-btn" id="choice-btn-${i}" onclick="window.PvPSys.submitTebakGambar('${name.replace(/'/g, "\\'")}')">${name}</button>`
      ).join("");
      return `
        <div class="game-box">
          <p class="game-title">🖼️ Tebak nama batik ini! Pilih jawaban tercepat — waktu mulai dihitung sejak game dimuat!</p>
          <img src="${d.image || ""}" class="game-img" id="pvp-game-img" onerror="this.src=''" />
          <div class="game-choices">${choicesBtns}</div>
        </div>
      `;
    }

    if (duel.gameType === "susun_kata") {
      return `
        <div class="game-box">
          <p class="game-title">🔤 Susun ulang huruf berikut menjadi nama batik yang benar! Waktu mulai saat ini.</p>
          <div class="anagram-display">${d.anagram || "???"}</div>
          <input type="text" id="pvp-kata-input" class="game-input" placeholder="Jawaban..." />
          <br>
          <button class="btn-submit" onclick="window.PvPSys.submitSusunKata()">✅ Submit Jawaban</button>
        </div>
      `;
    }

    if (duel.gameType === "adu_refleks") {
      return `
        <div class="game-box">
          <p class="game-title">⚡ Klik tombol sebanyak-banyaknya dalam 5 detik! Klik pertama memulai hitungan.</p>
          <div class="clicker-timer" id="pvp-click-timer">Waktu: 5.0s</div>
          <button class="clicker-btn" id="pvp-click-btn" onclick="window.PvPSys.clickerTap()">MULAI</button>
          <div class="clicker-score" id="pvp-click-score">0 Klik</div>
        </div>
      `;
    }

    return "";
  }

  // ─────────────────────────────────────────────
  // SUBMIT TEBAK GAMBAR (pilihan ganda)
  // ─────────────────────────────────────────────
  function submitTebakGambar(chosenName) {
    if (gameSubmitted) return;

    const timeTaken = gameStartTime !== null ? Date.now() - gameStartTime : 999999;
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const active = duels.find(d => d.id === currentDuelId);
    if (!active) return;

    const isCorrect = chosenName.toLowerCase().trim() === active.gameData.answer;

    // Highlight tombol
    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.toLowerCase().trim() === active.gameData.answer) {
        btn.classList.add("correct");
      } else if (btn.textContent === chosenName && !isCorrect) {
        btn.classList.add("wrong");
      }
    });

    // Unblur gambar setelah jawab
    const img = document.getElementById("pvp-game-img");
    if (img) img.classList.add("revealed");

    const score = isCorrect ? timeTaken : 999999;
    gameSubmitted = true;

    setTimeout(() => {
      if (!isCorrect) {
        alert(`❌ Jawaban salah! Jawaban yang benar: "${active.gameData.answer.toUpperCase()}"\nAnda mendapat penalti waktu maksimal.`);
      } else {
        alert(`✅ Benar! Waktu Anda: ${(timeTaken / 1000).toFixed(2)} detik.`);
      }
      saveScore(score);
    }, 800);
  }

  // ─────────────────────────────────────────────
  // SUBMIT SUSUN KATA
  // ─────────────────────────────────────────────
  function submitSusunKata() {
    if (gameSubmitted) return;

    const input = document.getElementById("pvp-kata-input");
    if (!input) return;
    const typed = input.value.toLowerCase().trim();
    const timeTaken = gameStartTime !== null ? Date.now() - gameStartTime : 999999;

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const active = duels.find(d => d.id === currentDuelId);
    if (!active) return;

    const isCorrect = typed === active.gameData.answer;
    const score = isCorrect ? timeTaken : 999999;
    gameSubmitted = true;

    if (!isCorrect) {
      alert(`❌ Jawaban salah! Yang benar: "${active.gameData.answer.toUpperCase()}"\nPenalti waktu maksimal.`);
    } else {
      alert(`✅ Benar! Waktu Anda: ${(timeTaken / 1000).toFixed(2)} detik.`);
    }
    saveScore(score);
  }

  // ─────────────────────────────────────────────
  // CLICKER
  // ─────────────────────────────────────────────
  function clickerTap() {
    if (gameSubmitted) return;

    const btn = document.getElementById("pvp-click-btn");
    const scoreEl = document.getElementById("pvp-click-score");
    const timerEl = document.getElementById("pvp-click-timer");
    if (!btn || !scoreEl || !timerEl) return;

    if (!clickerActive && clickerCount === 0) {
      // Mulai game
      clickerActive = true;
      clickerCount = 1;
      scoreEl.textContent = "1 Klik";
      btn.textContent = "TAP!";
      btn.classList.add("running");

      clickerInterval = setInterval(() => {
        clickerTimeLeft = Math.max(0, clickerTimeLeft - 0.1);
        timerEl.textContent = "Waktu: " + clickerTimeLeft.toFixed(1) + "s";
        if (clickerTimeLeft <= 0) {
          clearInterval(clickerInterval);
          clickerActive = false;
          btn.disabled = true;
          btn.textContent = "⏰";
          btn.classList.remove("running");
          timerEl.textContent = "SELESAI!";
          gameSubmitted = true;
          const finalCount = clickerCount;
          setTimeout(() => {
            alert(`✅ Waktu habis! Anda menekan ${finalCount} kali.`);
            saveScore(finalCount);
          }, 200);
        }
      }, 100);
    } else if (clickerActive) {
      clickerCount++;
      scoreEl.textContent = clickerCount + " Klik";
    }
  }

  // ─────────────────────────────────────────────
  // SAVE SCORE & PUSH KE FIREBASE
  // ─────────────────────────────────────────────
  async function saveScore(scoreValue) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === currentDuelId);
    if (idx === -1) return;

    const duel = duels[idx];
    const isP1 = duel.player1 === currentUser.username;

    if (isP1) {
      duel.state.p1_score = scoreValue;
      duel.state.p1_ready = true;
    } else {
      duel.state.p2_score = scoreValue;
      duel.state.p2_ready = true;
    }

    // Update status jadi playing jika belum
    if (duel.status === "waiting_for_player2") {
      duel.status = "playing";
    }

    localStorage.setItem("museum_pvp_duels", JSON.stringify(duels));
    if (window.DB) await DB.push("pvp_duels", "museum_pvp_duels", duels);

    // Cek apakah keduanya sudah submit
    if (duel.state.p1_score !== null && duel.state.p2_score !== null) {
      await resolveDuel(duel, duels, idx);
    } else {
      renderArena();
    }
  }

  // ─────────────────────────────────────────────
  // RESOLVE DUEL & TRANSFER POIN
  // ─────────────────────────────────────────────
  async function resolveDuel(duel, duels, idx) {
    const p1Score = parseFloat(duel.state.p1_score);
    const p2Score = parseFloat(duel.state.p2_score);
    let winner = "draw";

    if (duel.gameType === "tebak_gambar" || duel.gameType === "susun_kata") {
      // Waktu terendah menang; 999999 = salah jawab
      if (p1Score < p2Score) winner = duel.player1;
      else if (p2Score < p1Score) winner = duel.player2;
      // else draw
    } else if (duel.gameType === "adu_refleks") {
      // Klik terbanyak menang
      if (p1Score > p2Score) winner = duel.player1;
      else if (p2Score > p1Score) winner = duel.player2;
    }

    duel.status = "finished";
    duel.winner = winner;
    duel.finishedAt = new Date().toISOString();
    if (duels && idx !== undefined) duels[idx] = duel;
    const latest = duels || JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    localStorage.setItem("museum_pvp_duels", JSON.stringify(latest));
    if (window.DB) await DB.push("pvp_duels", "museum_pvp_duels", latest);

    // Transfer poin
    if (winner !== "draw") {
      const loser = winner === duel.player1 ? duel.player2 : duel.player1;
      if (window.DB && navigator.onLine) {
        await DB.pull("pvp_leaderboard", "museum_pvp_leaderboard", []);
      }
      const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
      const winEntry = lb.find(e => e.username === winner);
      const loseEntry = lb.find(e => e.username === loser);

      if (winEntry) { winEntry.points = (winEntry.points || 100) + 10; winEntry.wins = (winEntry.wins || 0) + 1; }
      if (loseEntry) { loseEntry.points = Math.max(0, (loseEntry.points || 100) - 10); loseEntry.losses = (loseEntry.losses || 0) + 1; }

      lb.sort((a, b) => b.points - a.points);
      localStorage.setItem("museum_pvp_leaderboard", JSON.stringify(lb));
      if (window.DB) await DB.push("pvp_leaderboard", "museum_pvp_leaderboard", lb);

      window.Auth?.logActivity("pvp", `@${winner} merampas 10 poin dari @${loser} dalam Duel PvP (${formatGameName(duel.gameType)})!`);
    }

    // Reset state game
    gameStartTime = null;
    gameSubmitted = false;
    clickerActive = false;
    clickerCount = 0;
    clickerTimeLeft = 5.0;
    if (clickerInterval) { clearInterval(clickerInterval); clickerInterval = null; }
    currentDuelId = null;

    const isWinner = winner === currentUser.username;
    const isDraw = winner === "draw";

    alert(
      isDraw
        ? "🤝 SERI! Tidak ada poin yang berpindah."
        : isWinner
          ? `🏆 ANDA MENANG!\n+10 poin dari @${winner === duel.player1 ? duel.player2 : duel.player1}!\n\nTotal poin PvP Anda bertambah.`
          : `💀 ANDA KALAH!\n-10 poin dari akun Anda.\n\nJangan menyerah, tantang lagi!`
    );

    renderMyStats();
    renderArena();
    syncAndRenderLeaderboard();
  }

  // ─────────────────────────────────────────────
  // ACCEPT / CANCEL DUEL
  // ─────────────────────────────────────────────
  async function acceptDuel(id) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === id);
    if (idx === -1) return;

    duels[idx].status = "playing";
    duels[idx].state.p2_ready = true;
    localStorage.setItem("museum_pvp_duels", JSON.stringify(duels));
    if (window.DB) await DB.push("pvp_duels", "museum_pvp_duels", duels);

    // Reset state game untuk P2
    gameStartTime = Date.now(); // mulai timer
    gameSubmitted = false;
    clickerActive = false;
    clickerCount = 0;
    clickerTimeLeft = 5.0;

    // Email P1
    const p1 = window.Auth?.findUser(duels[idx].player1);
    if (p1?.email) {
      sendPvPEmail(p1.email, p1.username,
        "⚔️ Tantangan PvP Diterima!",
        `@${currentUser.username} telah menerima tantangan Anda dalam Duel PvP! Buka halaman Arena PvP untuk menyelesaikan giliran Anda jika belum.`
      );
    }

    renderArena();
  }

  async function cancelDuel(id) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === id);
    if (idx !== -1) {
      duels[idx].status = "finished";
      duels[idx].winner = "cancelled";
      localStorage.setItem("museum_pvp_duels", JSON.stringify(duels));
      if (window.DB) await DB.push("pvp_duels", "museum_pvp_duels", duels);
    }
    gameStartTime = null;
    gameSubmitted = false;
    currentDuelId = null;
    renderArena();
  }

  // ─────────────────────────────────────────────
  // EMAIL
  // ─────────────────────────────────────────────
  function sendPvPEmail(toEmail, toName, subject, message) {
    if (typeof emailjs === "undefined") return;
    emailjs.send("service_x9r2d0r", "template_q91k63r", {
      to_email: toEmail,
      to_name: toName,
      message: message + "\n\nBuka: https://bodfor39-source.github.io/museum-digital-nasional/pvp.html",
      subject: subject
    }).catch(e => console.warn("Email PvP gagal:", e));
  }

  // ─────────────────────────────────────────────
  // POLLING (hanya berjalan di pvp.html)
  // ─────────────────────────────────────────────
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (!window.DB || !navigator.onLine) return;
      const oldDuelStr = localStorage.getItem("museum_pvp_duels") || "[]";
      try {
        const fresh = await DB.pull("pvp_duels", "museum_pvp_duels", []);
        const newDuelStr = JSON.stringify(fresh);
        if (newDuelStr !== oldDuelStr) {
          // Ada perubahan — tapi JANGAN reset state game yang sedang berjalan
          const activeDuel = fresh.find(d =>
            (d.player1 === currentUser?.username || d.player2 === currentUser?.username) &&
            d.status !== "finished"
          );
          // Cek apakah ada duel yang selesai di server (lawan sudah submit)
          if (currentDuelId) {
            const serverDuel = fresh.find(d => d.id === currentDuelId);
            if (serverDuel) {
              const isP1 = serverDuel.player1 === currentUser?.username;
              const myScore = isP1 ? serverDuel.state.p1_score : serverDuel.state.p2_score;
              const oppScore = isP1 ? serverDuel.state.p2_score : serverDuel.state.p1_score;
              // Jika lawan sudah submit & kita sudah submit → resolve
              if (myScore !== null && oppScore !== null && serverDuel.status !== "finished") {
                await resolveDuel(serverDuel, fresh, fresh.findIndex(d => d.id === currentDuelId));
                return;
              }
            }
          }
          renderArena();
          await syncAndRenderLeaderboard();
        }
      } catch (e) { console.warn("Polling PvP error:", e); }
    }, 4000);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  function formatGameName(type) {
    const map = {
      "tebak_gambar": "🖼️ Tebak Gambar Batik",
      "susun_kata": "🔤 Susun Kata Anagram",
      "adu_refleks": "⚡ Adu Refleks Klik"
    };
    return map[type] || type;
  }

  // Ekspor fungsi yang dipanggil dari HTML/dashboard
  return {
    initPage,
    initUserPvP,
    challengeUser,
    acceptDuel,
    cancelDuel,
    startMyTurn,
    submitTebakGambar,
    submitSusunKata,
    clickerTap,
    renderArena,
    stopPolling
  };
})();

window.PvPSys = PvPSys;
