/**
 * pvp.js — Sistem Duel Rebut Poin (PvP) untuk Museum Digital Nasional
 * Game: Tebak Gambar, Anagram (Susun Kata), Adu Refleks (Clicker)
 */

const PvPSys = (() => {
  const PVP_GAMES = ["tebak_gambar", "susun_kata", "adu_refleks"];
  let pollInterval = null;
  let currentDuelId = null;
  let uiContainer = null;
  let currentUser = null;

  let clickerCount = 0;
  let clickerInterval = null;

  // --- INISIALISASI & LEADERBOARD ---
  async function initUserPvP(user) {
    if (!user || !user.email) return; // Hanya akun Gmail
    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    let entry = lb.find(e => e.username === user.username);
    if (!entry) {
      entry = { username: user.username, points: 100, wins: 0, losses: 0, lastPlayed: new Date().toISOString() };
      lb.push(entry);
      lb.sort((a, b) => b.points - a.points);
      await DB.push("pvp_leaderboard", "museum_pvp_leaderboard", lb);
    }
  }

  function renderPvPLeaderboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    lb.sort((a, b) => b.points - a.points);
    
    currentUser = window.Auth?.getCurrentUser();

    if (lb.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Belum ada Raja Duel. Jadilah yang pertama dengan mendaftarkan Gmail!</p>';
      return;
    }

    let html = `
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(231,76,60,0.3); border-radius:12px; padding:20px; margin-top:30px;">
        <h3 style="color:#e74c3c; margin-bottom:10px; text-align:center; font-size:1.4rem;">⚔️ Papan Skor PvP (Rebut Poin)</h3>
        <p style="text-align:center; color:rgba(249,240,224,0.6); font-size:0.85rem; margin-bottom:20px;">Tantang pemain lain untuk merampas 10 poin mereka. Hati-hati jika Anda kalah, poin ANDA yang diambil!</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
    `;

    lb.forEach((entry, idx) => {
      const isMe = currentUser && currentUser.username === entry.username;
      const canChallenge = currentUser && currentUser.email && !isMe;
      
      let badge = "";
      if (idx === 0) badge = "👑 ";
      else if (idx === 1) badge = "🥈 ";
      else if (idx === 2) badge = "🥉 ";

      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'rgba(231,76,60,0.15)' : 'rgba(0,0,0,0.3)'}; padding:12px 15px; border-radius:8px; border:1px solid ${isMe ? '#e74c3c' : 'rgba(255,255,255,0.05)'};">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-weight:bold; color:var(--gold-400); width:20px;">#${idx+1}</span>
            <div>
              <div style="font-weight:bold; color:white; font-size:1.1rem;">${badge}@${entry.username} ${isMe ? '(Anda)' : ''}</div>
              <div style="font-size:0.75rem; color:rgba(255,255,255,0.5);">Menang: ${entry.wins || 0} | Kalah: ${entry.losses || 0}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:15px;">
            <div style="text-align:right;">
              <span style="display:block; font-size:1.2rem; font-weight:900; color:#e74c3c;">${entry.points} pts</span>
            </div>
            ${canChallenge ? `<button onclick="window.PvPSys.challengeUser('${entry.username}')" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem; transition:0.2s;">⚔️ Tantang</button>` : ''}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // --- LOGIKA TANTANGAN ---
  async function challengeUser(targetUsername) {
    if (!currentUser || !currentUser.email) {
      alert("Hanya akun yang tertaut Gmail yang dapat menggunakan fitur Duel PvP.");
      return;
    }
    
    // Cek apakah poin cukup untuk kalah (opsional: tidak boleh ngutang)
    const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
    const myEntry = lb.find(e => e.username === currentUser.username);
    if (!myEntry || myEntry.points < 10) {
      alert("Poin Duel Anda tidak cukup untuk melakukan taruhan! Minimal 10 poin.");
      return;
    }

    if (!confirm(`Tantang @${targetUsername} untuk merampas 10 poin mereka?\n\nJika kalah, ANDA yang akan kehilangan 10 poin!`)) return;

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    
    // Cek jika sudah ada duel aktif dengan orang ini
    const existing = duels.find(d => 
      ((d.player1 === currentUser.username && d.player2 === targetUsername) || 
       (d.player2 === currentUser.username && d.player1 === targetUsername)) &&
      d.status !== "finished"
    );
    if (existing) {
      alert("Anda sudah memiliki duel yang belum selesai dengan pemain ini! Cek Dashboard Anda.");
      return;
    }

    const gameType = PVP_GAMES[Math.floor(Math.random() * PVP_GAMES.length)];
    
    // Generate data rahasia untuk game
    let gameData = {};
    if (gameType === "tebak_gambar" || gameType === "susun_kata") {
      const bData = JSON.parse(localStorage.getItem("global_batik_data") || "[]");
      if (bData.length > 0) {
        const motif = bData[Math.floor(Math.random() * bData.length)];
        gameData.motifId = motif.id;
        gameData.answer = motif.nama.toLowerCase();
        if (gameType === "tebak_gambar") {
          gameData.image = motif.samples && motif.samples.length > 0 ? motif.samples[0] : (motif.image || "");
        } else if (gameType === "susun_kata") {
          gameData.anagram = motif.nama.split('').sort(() => 0.5 - Math.random()).join('').toUpperCase();
        }
      }
    }

    const duel = {
      id: "pvp_" + Date.now(),
      type: "pvp_rebut_poin",
      player1: currentUser.username,
      player2: targetUsername,
      status: "waiting_for_player2",
      gameType,
      gameData,
      state: {
        p1_score: null, p2_score: null, p1_ready: true, p2_ready: false
      },
      createdAt: new Date().toISOString()
    };
    
    duels.unshift(duel);
    await DB.push("pvp_duels", "museum_pvp_duels", duels.slice(0, 50));
    
    // Kirim notifikasi email ke player 2
    const targetUser = window.Auth?.findUser(targetUsername);
    if (targetUser && targetUser.email) {
      sendPvPEmail(targetUser.email, targetUser.username, "Peringatan! Poin Anda Sedang Terancam", `Akun @${currentUser.username} telah menantang Anda dalam Duel Rebut Poin! Segera login ke website dan masuk ke Dasbor (Arena PvP) untuk mempertahankan poin Anda. Jika Anda menang, Anda akan mengambil 10 poin mereka!`);
    }

    alert(`Tantangan berhasil dikirim! Buka Dashboard untuk memainkan giliran Anda terlebih dahulu.`);
    window.location.href = "dashboard.html";
  }

  function sendPvPEmail(toEmail, toName, subject, message) {
    if (typeof emailjs === "undefined") return;
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      message: message + "\n\n(Abaikan pesan ini jika Anda tidak ingin bermain).",
      subject: subject
    };
    emailjs.send("service_x9r2d0r", "template_q91k63r", templateParams).catch(e => console.warn("Gagal kirim email pvp", e));
  }

  // --- RENDER ARENA DI DASHBOARD ---
  // Fungsi ini dipanggil dari dashboard.js
  async function renderArena() {
    uiContainer = document.getElementById("pvp-arena-container");
    if (!uiContainer) return;

    currentUser = window.Auth?.getCurrentUser();
    if (!currentUser || !currentUser.email) {
      uiContainer.innerHTML = "";
      return;
    }

    if (window.DB && navigator.onLine) {
      await DB.pull("pvp_duels", "museum_pvp_duels", []);
    }

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const activeDuel = duels.find(d => 
      (d.player1 === currentUser.username || d.player2 === currentUser.username) && 
      d.status !== "finished"
    );

    if (!activeDuel) {
      uiContainer.innerHTML = ""; // Sembunyikan jika tidak ada duel PvP
      startPolling(); // Tetap polling mencari tantangan baru
      return;
    }

    currentDuelId = activeDuel.id;
    startPolling();
    renderActiveDuel(activeDuel);
  }

  function renderActiveDuel(duel) {
    if (!uiContainer) return;
    
    const isP1 = duel.player1 === currentUser.username;
    const opponent = isP1 ? duel.player2 : duel.player1;
    const myScore = isP1 ? duel.state.p1_score : duel.state.p2_score;
    const oppScore = isP1 ? duel.state.p2_score : duel.state.p1_score;
    const myReady = isP1 ? duel.state.p1_ready : duel.state.p2_ready;
    const oppReady = isP1 ? duel.state.p2_ready : duel.state.p1_ready;

    let gameHtml = "";

    if (duel.status === "waiting_for_player2") {
      if (isP1) {
        gameHtml = `<p style="color:#f39c12; font-weight:bold;">Menunggu @${opponent} menerima tantangan...</p>
                    <p style="font-size:0.8rem; color:rgba(255,255,255,0.5);">Taruhan: 10 Pts. Anda bisa memainkan giliran Anda kapan saja, atau batalkan jika kelamaan.</p>
                    <button onclick="window.PvPSys.cancelDuel('${duel.id}')" style="background:#7f8c8d; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; margin-top:10px;">Batalkan Tantangan</button>`;
      } else {
        gameHtml = `<p>@${opponent} menantang Anda Duel Rebut Poin!</p>
                    <p style="font-size:0.85rem; color:#e74c3c;">Risiko: Jika kalah, Anda kehilangan 10 poin. Menang, Anda dapat 10 poin mereka.</p>
                    <button onclick="window.PvPSys.acceptDuel('${duel.id}')" style="background:#e74c3c; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px;">Terima & Bertarung!</button>
                    <button onclick="window.PvPSys.cancelDuel('${duel.id}')" style="background:transparent; color:#95a5a6; border:1px solid #95a5a6; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px; margin-left:10px;">Tolak</button>`;
      }
    } else if (duel.status === "playing") {
      gameHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin:20px 0; background:rgba(231,76,60,0.1); padding:15px; border-radius:10px; border:1px solid rgba(231,76,60,0.3);">
          <div style="text-align:center; width:40%;">
            <div style="font-weight:bold; color:white;">Anda (@${currentUser.username})</div>
            <div style="font-size:1.5rem; margin-top:10px;">${myScore !== null ? '✅ Selesai' : '⚔️ Giliranmu'}</div>
          </div>
          <div style="font-weight:900; color:#e74c3c; font-size:2rem; text-shadow:0 0 10px rgba(231,76,60,0.5);">VS</div>
          <div style="text-align:center; width:40%;">
            <div style="font-weight:bold; color:white;">Lawan (@${opponent})</div>
            <div style="font-size:1.5rem; margin-top:10px;">${oppReady ? (oppScore !== null ? '✅ Selesai' : '⏳ Sedang Main...') : '⏳ Menunggu...'}</div>
          </div>
        </div>
      `;

      if (myScore === null) {
        // Reset waktu mulai setiap kali komponen dimuat dan user belum main
        gameStartTime = Date.now();
        gameHtml += renderGameControls(duel);
      } else {
        gameHtml += `<p style="color:#2ecc71; text-align:center; font-weight:bold;">Skor/Catatan waktu Anda sudah dikunci! Menunggu lawan menyelesaikan bagiannya...</p>`;
      }
    }

    uiContainer.innerHTML = `
      <div style="background:linear-gradient(135deg, #2c0e0e, #1a0505); border:2px solid #c0392b; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(192, 57, 43, 0.2); margin-bottom: 25px;">
        <h3 style="color:#e74c3c; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span class="pulsing-dot" style="width:10px; height:10px; background:#e74c3c; border-radius:50%; display:inline-block; animation:pulse 0.8s infinite;"></span>
          🔥 ARENA REBUT POIN PvP: ${formatGameName(duel.gameType)}
        </h3>
        ${gameHtml}
      </div>
    `;
  }

  function formatGameName(type) {
    if (type === "tebak_gambar") return "Tebak Gambar Batik (Kecepatan Waktu)";
    if (type === "susun_kata") return "Susun Kata/Anagram (Kecepatan Ketik)";
    if (type === "adu_refleks") return "Adu Refleks Klik (Klik Terbanyak 5 Detik)";
    return type;
  }

  // --- RENDER MINI GAMES ---
  function renderGameControls(duel) {
    if (duel.gameType === "tebak_gambar") {
      return `
        <div style="text-align:center; margin-top:15px; background:rgba(0,0,0,0.5); padding:20px; border-radius:10px;">
          <p style="font-size:0.9rem; margin-bottom:15px;">Tebak nama batik ini! Siapa yang menjawab benar paling <b>CEPAT</b>, dia yang menang!</p>
          <img src="${duel.gameData.image || ''}" style="width:150px; height:150px; object-fit:cover; border-radius:10px; margin-bottom:15px; border:3px solid #e74c3c; filter:blur(4px); transition:0.3s;" id="pvp-img-blur">
          <br>
          <input type="text" id="tebak-gambar-input" placeholder="Ketik nama batik..." style="padding:10px; width:60%; border-radius:6px; border:none; text-align:center; font-size:1.1rem; margin-bottom:10px;">
          <br>
          <button onclick="window.PvPSys.submitTebakGambar()" style="background:#e74c3c; color:white; padding:10px 20px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:1.1rem;">Kunci Jawaban & Catat Waktu!</button>
        </div>
      `;
    }
    if (duel.gameType === "susun_kata") {
      return `
        <div style="text-align:center; margin-top:15px; background:rgba(0,0,0,0.5); padding:20px; border-radius:10px;">
          <p style="font-size:0.9rem; margin-bottom:15px;">Susun ulang huruf ini menjadi nama batik/daerah! Waktu tercepat menang!</p>
          <div style="font-size:2rem; font-weight:900; letter-spacing:5px; color:var(--gold-400); margin-bottom:20px;">${duel.gameData.anagram}</div>
          <input type="text" id="susun-kata-input" placeholder="Jawaban..." style="padding:10px; width:60%; border-radius:6px; border:none; text-align:center; font-size:1.1rem; margin-bottom:10px; text-transform:uppercase;">
          <br>
          <button onclick="window.PvPSys.submitSusunKata()" style="background:#e74c3c; color:white; padding:10px 20px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:1.1rem;">Submit Cepat!</button>
        </div>
      `;
    }
    if (duel.gameType === "adu_refleks") {
      return `
        <div style="text-align:center; margin-top:15px; background:rgba(0,0,0,0.5); padding:20px; border-radius:10px;">
          <p style="font-size:0.9rem; margin-bottom:15px;">Klik tombol di bawah ini sebanyak-banyaknya dalam <b>5 DETIK</b>!</p>
          <div id="pvp-click-timer" style="font-size:1.5rem; color:#e74c3c; font-weight:bold; margin-bottom:10px;">Waktu: 5.0s</div>
          <button id="pvp-click-btn" onclick="window.PvPSys.clickerTap()" style="background:#3498db; color:white; width:120px; height:120px; border-radius:50%; border:none; font-weight:900; cursor:pointer; font-size:2.5rem; box-shadow:0 10px 0 #2980b9, 0 15px 20px rgba(0,0,0,0.4); transition:0.1s; display:inline-flex; align-items:center; justify-content:center;">MULAI</button>
          <div id="pvp-click-score" style="font-size:2rem; font-weight:900; margin-top:15px; color:var(--gold-400);">0 Klik</div>
        </div>
      `;
    }
    return "";
  }

  // --- LOGIKA GAMEPLAY & SCORING ---
  
  let gameStartTime = Date.now();

  function submitTebakGambar() {
    const timeTaken = Date.now() - gameStartTime;
    const input = document.getElementById("tebak-gambar-input").value.toLowerCase().trim();
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const active = duels.find(d => d.id === currentDuelId);
    
    // Skor: Jika salah = 999999ms. Jika benar = timeTaken.
    let score = 999999;
    if (input === active.gameData.answer) {
      score = timeTaken;
      document.getElementById("pvp-img-blur").style.filter = "none";
    } else {
      alert("Jawaban salah! Waktu Anda dianulir (Dikenakan penalti maksimal).");
    }
    saveScore(score);
  }

  function submitSusunKata() {
    const timeTaken = Date.now() - gameStartTime;
    const input = document.getElementById("susun-kata-input").value.toLowerCase().trim();
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const active = duels.find(d => d.id === currentDuelId);
    
    let score = 999999;
    if (input === active.gameData.answer) {
      score = timeTaken;
    } else {
      alert("Susunan kata salah! Dikenakan penalti waktu maksimal.");
    }
    saveScore(score);
  }

  function clickerTap() {
    const btn = document.getElementById("pvp-click-btn");
    const scoreEl = document.getElementById("pvp-click-score");
    const timerEl = document.getElementById("pvp-click-timer");

    // Animasi
    btn.style.transform = "translateY(10px)";
    btn.style.boxShadow = "0 0 0 #2980b9, 0 5px 10px rgba(0,0,0,0.4)";
    setTimeout(() => {
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 10px 0 #2980b9, 0 15px 20px rgba(0,0,0,0.4)";
    }, 50);

    if (!clickerActive && clickerCount === 0) {
      clickerActive = true;
      clickerCount = 1;
      scoreEl.textContent = clickerCount + " Klik";
      btn.textContent = "TAP!";
      btn.style.background = "#e74c3c";
      btn.style.boxShadow = "0 10px 0 #c0392b, 0 15px 20px rgba(0,0,0,0.4)";
      
      clickerInterval = setInterval(() => {
        clickerTimeLeft -= 0.1;
        timerEl.textContent = "Waktu: " + clickerTimeLeft.toFixed(1) + "s";
        if (clickerTimeLeft <= 0) {
          clearInterval(clickerInterval);
          clickerActive = false;
          btn.disabled = true;
          btn.style.background = "#7f8c8d";
          btn.style.boxShadow = "none";
          btn.style.transform = "translateY(10px)";
          timerEl.textContent = "WAKTU HABIS!";
          alert(`Waktu habis! Anda berhasil menekan ${clickerCount} kali.`);
          saveScore(clickerCount); 
        }
      }, 100);
    } else if (clickerActive) {
      clickerCount++;
      scoreEl.textContent = clickerCount + " Klik";
    }
  }

  async function saveScore(scoreValue) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === currentDuelId);
    if (idx === -1) return;

    const duel = duels[idx];
    const isP1 = duel.player1 === currentUser.username;
    
    if (isP1) duel.state.p1_score = scoreValue;
    else duel.state.p2_score = scoreValue;

    if (duel.state.p1_score !== null && duel.state.p2_score !== null) {
      resolveDuel(duel);
    } else {
      await DB.push("pvp_duels", "museum_pvp_duels", duels);
      renderArena();
    }
  }

  // --- RESOLVE DUEL & TRANSFER POINTS ---
  async function resolveDuel(duel) {
    const p1Score = parseFloat(duel.state.p1_score);
    const p2Score = parseFloat(duel.state.p2_score);
    let winner = null;

    if (duel.gameType === "tebak_gambar" || duel.gameType === "susun_kata") {
      // Kecepatan (waktu terendah menang)
      if (p1Score === p2Score) winner = "draw";
      else if (p1Score < p2Score) winner = duel.player1;
      else winner = duel.player2;
    } else if (duel.gameType === "adu_refleks") {
      // Jumlah klik tertinggi menang
      if (p1Score === p2Score) winner = "draw";
      else if (p1Score > p2Score) winner = duel.player1;
      else winner = duel.player2;
    }

    duel.status = "finished";
    duel.winner = winner;

    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === duel.id);
    if (idx !== -1) duels[idx] = duel;
    
    await DB.push("pvp_duels", "museum_pvp_duels", duels);

    // Transfer Poin Rebut
    if (winner !== "draw") {
      const loser = winner === duel.player1 ? duel.player2 : duel.player1;
      const lb = JSON.parse(localStorage.getItem("museum_pvp_leaderboard") || "[]");
      
      let winEntry = lb.find(e => e.username === winner);
      let loseEntry = lb.find(e => e.username === loser);
      
      if (winEntry && loseEntry) {
        winEntry.points += 10;
        winEntry.wins = (winEntry.wins || 0) + 1;
        
        loseEntry.points = Math.max(0, (loseEntry.points || 0) - 10);
        loseEntry.losses = (loseEntry.losses || 0) + 1;
        
        lb.sort((a,b) => b.points - a.points);
        await DB.push("pvp_leaderboard", "museum_pvp_leaderboard", lb);
        
        window.Auth?.logActivity("pvp", `@${winner} merampas 10 poin dari @${loser} dalam Duel PvP!`);
      }
    }

    alert(`PvP Selesai!\nHasil: ${winner === "draw" ? "SERI! Tidak ada poin yang berpindah." : "Pemenang: @" + winner + " (+10 Pts)"}`);
    renderArena();
  }

  // --- ACTIONS ---
  async function acceptDuel(id) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === id);
    if (idx !== -1) {
      duels[idx].status = "playing";
      duels[idx].state.p2_ready = true;
      await DB.push("pvp_duels", "museum_pvp_duels", duels);
      
      gameStartTime = Date.now();
      clickerCount = 0; clickerActive = false; clickerTimeLeft = 5.0;
      renderArena();
      
      const p1 = window.Auth?.findUser(duels[idx].player1);
      if (p1 && p1.email) {
        sendPvPEmail(p1.email, p1.username, "Tantangan PvP Diterima!", `@${currentUser.username} telah menerima tantangan Anda. Masuk ke Dasbor untuk menyelesaikan bagian Anda (Jika belum). Pemenang merampas 10 poin!`);
      }
    }
  }

  async function cancelDuel(id) {
    const duels = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
    const idx = duels.findIndex(d => d.id === id);
    if (idx !== -1) {
      duels[idx].status = "finished";
      duels[idx].winner = "cancelled";
      await DB.push("pvp_duels", "museum_pvp_duels", duels);
      renderArena();
    }
  }

  // --- POLLING ---
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (window.DB && navigator.onLine) {
        const oldData = JSON.parse(localStorage.getItem("museum_pvp_duels") || "[]");
        const oldActive = oldData.find(d => d.id === currentDuelId);
        
        const fresh = await DB.pull("pvp_duels", "museum_pvp_duels", []);
        const newActive = fresh.find(d => d.id === currentDuelId);
        
        if (newActive && (!oldActive || JSON.stringify(newActive) !== JSON.stringify(oldActive))) {
          renderArena();
        } else if (!newActive && oldActive) {
          // Jika duel dibatalkan atau selesai
          renderArena();
        }
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return { initUserPvP, renderPvPLeaderboard, challengeUser, renderArena, acceptDuel, cancelDuel, submitTebakGambar, submitSusunKata, clickerTap };
})();

window.PvPSys = PvPSys;
