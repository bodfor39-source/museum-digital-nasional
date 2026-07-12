/**
 * duel.js — Sistem Mini-Games Duel untuk Museum Digital Nasional
 * Menangani duel tie-breaker (Suit, Tebak Angka, Kartu) secara realtime (polling)
 */

const DuelSys = (() => {
  const GAMES = ["suit", "tebak", "kartu"];
  let pollInterval = null;
  let currentDuelId = null;
  let uiContainer = null;
  let currentUser = null;

  // Render Arena Duel di Dasbor
  function renderArena() {
    uiContainer = document.getElementById("duel-arena-container");
    if (!uiContainer) return;

    if (!window.Auth || !window.Auth.isLoggedIn()) {
      uiContainer.innerHTML = "";
      return;
    }
    currentUser = window.Auth.getCurrentUser();
    if (!currentUser || !currentUser.email) {
      uiContainer.innerHTML = ""; // Hanya untuk akun ber-Gmail
      return;
    }

    const duels = JSON.parse(localStorage.getItem("museum_duels") || "[]");
    // Cari duel yang melibatkan user ini dan belum selesai
    const activeDuel = duels.find(d => 
      (d.player1 === currentUser.username || d.player2 === currentUser.username) && 
      d.status !== "finished"
    );

    if (!activeDuel) {
      uiContainer.innerHTML = `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:20px; text-align:center;">
          <h3 style="color:var(--gold-400); margin-bottom:8px;">⚔️ Arena Duel Kuis</h3>
          <p style="color:rgba(249,240,224,0.6); font-size:0.9rem;">Tidak ada duel yang aktif. Cetak skor tertinggi di kuis untuk menantang lawan Anda berduel!</p>
        </div>
      `;
      stopPolling();
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
    const myMove = isP1 ? duel.state.p1_move : duel.state.p2_move;
    const oppMove = isP1 ? duel.state.p2_move : duel.state.p1_move;
    const myReady = isP1 ? duel.state.p1_ready : duel.state.p2_ready;
    const oppReady = isP1 ? duel.state.p2_ready : duel.state.p1_ready;

    let gameHtml = "";

    if (duel.status === "waiting_for_player2") {
      if (isP1) {
        gameHtml = `<p style="color:#f39c12; font-weight:bold;">Menunggu @${opponent} masuk ke Arena Duel...</p>
                    <p style="font-size:0.8rem; color:rgba(255,255,255,0.5);">Notifikasi email telah dikirimkan ke lawan Anda.</p>`;
      } else {
        gameHtml = `<p>@${opponent} menantang Anda untuk berduel memperebutkan posisi!</p>
                    <button onclick="window.DuelSys.acceptDuel('${duel.id}')" style="background:#2ecc71; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px;">Terima Tantangan</button>`;
      }
    } else if (duel.status === "playing") {
      gameHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin:20px 0; background:rgba(0,0,0,0.4); padding:15px; border-radius:10px;">
          <div style="text-align:center; width:40%;">
            <div style="font-weight:bold; color:var(--gold-300);">Anda (@${currentUser.username})</div>
            <div style="font-size:2rem; margin-top:10px;">${myMove ? '✅ Siap' : '⏳ Menunggu Aksi...'}</div>
          </div>
          <div style="font-weight:900; color:#e74c3c; font-size:1.5rem;">VS</div>
          <div style="text-align:center; width:40%;">
            <div style="font-weight:bold; color:var(--gold-300);">Lawan (@${opponent})</div>
            <div style="font-size:2rem; margin-top:10px;">${oppReady ? '✅ Siap' : '⏳ Menunggu...'}</div>
          </div>
        </div>
      `;

      if (!myMove) {
        gameHtml += renderGameControls(duel.gameType);
      } else {
        gameHtml += `<p style="color:#3498db; text-align:center;">Langkah Anda sudah dikunci! Menunggu lawan...</p>`;
      }
    }

    uiContainer.innerHTML = `
      <div style="background:linear-gradient(135deg, #1a0f00, #3e1f00); border:1px solid #d35400; border-radius:12px; padding:20px;">
        <h3 style="color:#f1c40f; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span class="pulsing-dot" style="width:10px; height:10px; background:#e74c3c; border-radius:50%; display:inline-block; animation:pulse 1s infinite;"></span>
          ⚔️ Arena Duel Aktif: ${formatGameName(duel.gameType)}
        </h3>
        ${gameHtml}
      </div>
    `;
  }

  function formatGameName(type) {
    if (type === "suit") return "Batu Gunting Kertas";
    if (type === "tebak") return "Tebak Angka (1-10)";
    if (type === "kartu") return "Kartu Keberuntungan";
    return type;
  }

  function renderGameControls(type) {
    if (type === "suit") {
      return `
        <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
          <button onclick="window.DuelSys.makeMove('batu')" style="font-size:2rem; padding:10px 20px; border-radius:10px; cursor:pointer; background:rgba(255,255,255,0.1); border:1px solid var(--gold-400);">✊</button>
          <button onclick="window.DuelSys.makeMove('kertas')" style="font-size:2rem; padding:10px 20px; border-radius:10px; cursor:pointer; background:rgba(255,255,255,0.1); border:1px solid var(--gold-400);">🖐️</button>
          <button onclick="window.DuelSys.makeMove('gunting')" style="font-size:2rem; padding:10px 20px; border-radius:10px; cursor:pointer; background:rgba(255,255,255,0.1); border:1px solid var(--gold-400);">✌️</button>
        </div>
      `;
    }
    if (type === "tebak") {
      return `
        <div style="text-align:center; margin-top:15px;">
          <p style="font-size:0.85rem; margin-bottom:10px;">Pilih angka 1 sampai 10. Siapa yang paling dekat dengan angka rahasia wasit, dia menang!</p>
          <input type="number" id="tebak-input" min="1" max="10" style="padding:8px; width:80px; text-align:center; border-radius:6px; border:1px solid var(--gold-400); background:rgba(0,0,0,0.3); color:white; font-size:1.2rem;">
          <button onclick="window.DuelSys.makeMove(document.getElementById('tebak-input').value)" style="background:var(--gold-500); color:black; padding:8px 16px; border-radius:6px; border:none; font-weight:bold; cursor:pointer; margin-left:10px;">Kunci Jawaban</button>
        </div>
      `;
    }
    if (type === "kartu") {
      return `
        <div style="text-align:center; margin-top:15px;">
          <p style="font-size:0.85rem; margin-bottom:10px;">Sistem akan mengocok kartu untuk Anda (1-100). Tarik kartumu!</p>
          <button onclick="window.DuelSys.makeMove('tarik_kartu')" style="background:#8e44ad; color:white; padding:12px 24px; border-radius:8px; border:none; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 15px rgba(142, 68, 173, 0.4);">Tarik Kartu 🃏</button>
        </div>
      `;
    }
    return "";
  }

  // Aksi User
  async function acceptDuel(id) {
    const duels = JSON.parse(localStorage.getItem("museum_duels") || "[]");
    const idx = duels.findIndex(d => d.id === id);
    if (idx !== -1) {
      duels[idx].status = "playing";
      duels[idx].state.p2_ready = true; // p2 just accepted
      await DB.push("duels", "museum_duels", duels);
      renderArena();
      
      // Kirim email notifikasi ke P1 bahwa P2 sudah menerima duel
      const p1 = window.Auth?.findUser(duels[idx].player1);
      if (p1 && p1.email) {
        sendDuelEmail(p1.email, p1.username, "Lawan Telah Tiba! Duel Dimulai", `Tantangan duel Anda telah diterima oleh @${currentUser.username}. Segera kembali ke website (Dashboard) untuk memulai pertarungan!`);
      }
    }
  }

  async function makeMove(moveValue) {
    if (!moveValue) return;
    const duels = JSON.parse(localStorage.getItem("museum_duels") || "[]");
    const idx = duels.findIndex(d => d.id === currentDuelId);
    if (idx === -1) return;

    const duel = duels[idx];
    const isP1 = duel.player1 === currentUser.username;
    
    // Khusus kartu, generate langsung angka random
    if (duel.gameType === "kartu" && moveValue === "tarik_kartu") {
      moveValue = Math.floor(Math.random() * 100) + 1;
    }

    if (isP1) {
      duel.state.p1_move = moveValue;
      duel.state.p1_ready = true;
    } else {
      duel.state.p2_move = moveValue;
      duel.state.p2_ready = true;
    }

    // Cek apakah keduanya sudah jalan
    if (duel.state.p1_ready && duel.state.p2_ready) {
      resolveDuel(duel);
    } else {
      await DB.push("duels", "museum_duels", duels);
      renderArena();
    }
  }

  async function resolveDuel(duel) {
    const p1Move = duel.state.p1_move;
    const p2Move = duel.state.p2_move;
    let winner = null;

    if (duel.gameType === "suit") {
      if (p1Move === p2Move) winner = "draw";
      else if (
        (p1Move === "batu" && p2Move === "gunting") ||
        (p1Move === "gunting" && p2Move === "kertas") ||
        (p1Move === "kertas" && p2Move === "batu")
      ) winner = duel.player1;
      else winner = duel.player2;
    } 
    else if (duel.gameType === "tebak") {
      const secret = duel.state.secret; // di-generate saat duel dibuat
      const diff1 = Math.abs(secret - parseInt(p1Move));
      const diff2 = Math.abs(secret - parseInt(p2Move));
      if (diff1 === diff2) winner = "draw";
      else if (diff1 < diff2) winner = duel.player1;
      else winner = duel.player2;
    }
    else if (duel.gameType === "kartu") {
      const v1 = parseInt(p1Move);
      const v2 = parseInt(p2Move);
      if (v1 === v2) winner = "draw";
      else if (v1 > v2) winner = duel.player1;
      else winner = duel.player2;
    }

    duel.status = "finished";
    duel.winner = winner;

    const duels = JSON.parse(localStorage.getItem("museum_duels") || "[]");
    const idx = duels.findIndex(d => d.id === duel.id);
    if (idx !== -1) duels[idx] = duel;
    
    await DB.push("duels", "museum_duels", duels);

    // Update skor jika ada pemenang (bukan draw)
    if (winner !== "draw") {
      const lb = JSON.parse(localStorage.getItem("quiz_leaderboard") || "[]");
      const winnerEntry = lb.find(e => e.username === winner);
      if (winnerEntry) {
        winnerEntry.best += 5; // +5 Poin kemenangan duel
        lb.sort((a,b) => b.best - a.best);
        await DB.push("quiz_leaderboard", "quiz_leaderboard", lb.slice(0,20));
      }
      window.Auth?.logActivity("duel", `@${winner} memenangkan duel melawan @${winner === duel.player1 ? duel.player2 : duel.player1}!`);
    }

    // Tampilkan hasil
    alert(`Duel Selesai!\nHasil: ${winner === "draw" ? "SERI!" : "Pemenang: @" + winner}\n\nLangkah P1: ${p1Move}\nLangkah P2: ${p2Move}`);
    renderArena();
  }

  // --- Utility Pembuatan Duel (dipanggil dari quiz.js) ---
  async function createDuel(player1, player2) {
    const duels = JSON.parse(localStorage.getItem("museum_duels") || "[]");
    const gameType = GAMES[Math.floor(Math.random() * GAMES.length)];
    const duel = {
      id: "duel_" + Date.now(),
      player1,
      player2,
      status: "waiting_for_player2",
      gameType,
      state: {
        p1_move: null, p2_move: null, p1_ready: true, p2_ready: false,
        secret: gameType === "tebak" ? (Math.floor(Math.random() * 10) + 1) : null
      },
      createdAt: new Date().toISOString()
    };
    duels.unshift(duel);
    await DB.push("duels", "museum_duels", duels.slice(0, 50));
    
    // Kirim email notifikasi ke Player 2
    const p2Info = window.Auth?.findUser(player2);
    if (p2Info && p2Info.email) {
      sendDuelEmail(p2Info.email, p2Info.username, "Panggilan Duel: Pertahankan Posisimu!", `Akun @${player1} telah menyamai skor kuis Anda! Segera login ke website dan masuk ke Dasbor (Arena Duel) untuk bertatapan langsung dan menyelesaikan pertarungan ini!`);
    }
  }

  function sendDuelEmail(toEmail, toName, subject, message) {
    if (typeof emailjs === "undefined") return;
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      message: message + "\n\n(Pesan otomatis ini adalah pemberitahuan dari sistem. Anda disarankan untuk menambahkan email ini ke daftar aman agar tidak masuk ke spam).",
      subject: subject
    };
    // Menggunakan template ID yg sama dengan OTP, pastikan template mendukung message/subject dinamis
    emailjs.send("service_x9r2d0r", "template_q91k63r", templateParams).catch(e => console.warn("Gagal kirim email duel", e));
  }

  // --- Polling System ---
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (window.DB && navigator.onLine) {
        const oldData = JSON.parse(localStorage.getItem("museum_duels") || "[]");
        const oldActive = oldData.find(d => d.id === currentDuelId);
        
        const fresh = await DB.pull("duels", "museum_duels", []);
        const newActive = fresh.find(d => d.id === currentDuelId);
        
        if (newActive && (!oldActive || JSON.stringify(newActive) !== JSON.stringify(oldActive))) {
          // Ada update dari lawan!
          renderArena();
        }
      }
    }, 4000); // Polling setiap 4 detik saat duel aktif untuk "bertatapan langsung"
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return { renderArena, acceptDuel, makeMove, createDuel };
})();

window.DuelSys = DuelSys;
