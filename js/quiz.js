/**
 * quiz.js — Quiz Kompetitif + Mini Game Batik
 * Fitur: Timer, Combo Streak, Papan Skor, Tebak Motif, Word Scramble
 * Museum Digital Nasional Indonesia
 */

const Quiz = (() => {
  let quizContainer = null;
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let streak = 0;
  let timerInterval = null;
  let timeRemaining = 30;
  let totalQuestions = 10;
  let questionStartTime = 0;
  let currentMode = "quiz"; // "quiz" | "tebak-motif" | "scramble"

  // ========================
  // INIT
  // ========================
  function init() {
    quizContainer = document.getElementById("quiz-container");
    if (!quizContainer) return;
    renderLobby();
  }

  // ========================
  // LOBBY
  // ========================
  function renderLobby() {
    const user = window.Auth?.getCurrentUser();
    const hasGmail = isGmailUser();
    const leaderboard = getLeaderboard();

    quizContainer.innerHTML = `
      <div style="display:grid;gap:1.5rem;max-width:900px;margin:0 auto;padding:1rem 0;">

        <!-- Hero Card -->
        <div class="glass-card" style="text-align:center;padding:2.5rem 2rem;">
          <div style="font-size:3.5rem;margin-bottom:1rem;">🏆</div>
          <h2 style="font-family:var(--font-display);color:var(--gold-400);font-size:2rem;margin-bottom:0.5rem;">Arena Batik Nusantara</h2>
          <p style="color:var(--text-light-muted);font-size:0.95rem;max-width:500px;margin:0 auto 1.5rem;">
            Uji wawasan, tantang diri, dan rebut puncak papan skor! ${hasGmail ? '⭐ Skor Anda akan tercatat di papan skor publik.' : '👤 Masuk atau daftar dengan Gmail agar skor Anda terlihat di papan skor.'}
          </p>

          <!-- Mode Selection -->
          <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem;">
            <button onclick="Quiz.startMode('quiz')" style="padding:0.85rem 1.75rem;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:12px;color:#0a0e1a;font-weight:800;font-size:1rem;cursor:pointer;min-width:180px;">
              📝 Quiz Batik<br><span style="font-size:0.75rem;font-weight:500;">Pilihan ganda & B/S</span>
            </button>
            <button onclick="Quiz.startMode('tebak-motif')" style="padding:0.85rem 1.75rem;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:none;border-radius:12px;color:white;font-weight:800;font-size:1rem;cursor:pointer;min-width:180px;">
              🎨 Tebak Motif!<br><span style="font-size:0.75rem;font-weight:500;">Lihat foto, tebak namanya</span>
            </button>
            <button onclick="Quiz.startMode('scramble')" style="padding:0.85rem 1.75rem;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;border-radius:12px;color:white;font-weight:800;font-size:1rem;cursor:pointer;min-width:180px;">
              🔤 Susun Nama Batik<br><span style="font-size:0.75rem;font-weight:500;">Acak huruf, tebak nama</span>
            </button>
          </div>

          ${!user ? '<p style="font-size:0.82rem;color:#f59e0b;margin-top:-0.5rem;">💡 Masuk ke akun dulu agar skor tersimpan dan bisa bersaing di papan skor!</p>' : ''}
        </div>

        <!-- Layout: Papan Skor + Info -->
        <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:1.5rem;">

          <!-- Papan Skor -->
          <div class="glass-card" style="padding:1.5rem;">
            <h3 style="color:var(--gold-400);font-size:1.1rem;margin-bottom:1rem;display:flex;align-items:center;gap:8px;">
              🏅 Papan Skor Teratas
              <span style="font-size:0.72rem;color:rgba(249,240,224,0.4);font-weight:400;margin-left:auto;">Hanya akun Gmail</span>
            </h3>
            ${renderLeaderboardHTML(leaderboard)}
          </div>

          <!-- Info Tier -->
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div class="glass-card" style="padding:1.25rem;">
              <h4 style="color:#22c55e;font-size:0.9rem;margin-bottom:0.75rem;">⭐ Keuntungan Akun Gmail</h4>
              <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:6px;font-size:0.82rem;color:var(--text-light-muted);">
                <li>🏅 Skor tercatat di papan skor publik</li>
                <li>🔥 Streak & poin bonus dihitung</li>
                <li>🎖️ Dapat badge peringkat (🥇🥈🥉)</li>
                <li>🎮 Skor Mini Game tersimpan</li>
                <li>📧 Pemulihan sandi otomatis</li>
              </ul>
              ${!hasGmail ? `<button onclick="window.Auth?.openGmailModal()" style="margin-top:0.75rem;width:100%;padding:0.6rem;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:8px;color:#0a0e1a;font-weight:700;font-size:0.82rem;cursor:pointer;">📧 Tambahkan Gmail Sekarang</button>` : ''}
            </div>
            <div class="glass-card" style="padding:1.25rem;">
              <h4 style="color:var(--gold-300);font-size:0.9rem;margin-bottom:0.6rem;">📊 Statistik Anda</h4>
              ${renderUserStats(user)}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  function renderLeaderboardHTML(lb) {
    if (!lb || lb.length === 0) {
      return '<p style="color:rgba(249,240,224,0.35);font-size:0.85rem;font-style:italic;text-align:center;padding:1rem;">Belum ada skor. Jadilah yang pertama!</p>';
    }
    const medals = ["🥇","🥈","🥉"];
    const currentUser = window.Auth?.getCurrentUser();
    let html = '<div style="display:flex;flex-direction:column;gap:6px;">';
    lb.forEach((entry, i) => {
      const isMe = entry.username === currentUser?.username;
      const medal = medals[i] || `#${i+1}`;
      html += `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${isMe ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)'};border-radius:8px;border:1px solid ${isMe ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.05)'};">
          <span style="font-size:1.1rem;min-width:24px;">${medal}</span>
          <span style="flex:1;font-size:0.85rem;font-weight:${isMe ? '700' : '500'};color:${isMe ? '#d4b45a' : 'var(--ivory-100)'};">@${entry.username}</span>
          <div style="text-align:right;">
            <div style="font-size:0.88rem;font-weight:700;color:${i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#d97706':'var(--ivory-100)'};">${entry.best}pts</div>
            <div style="font-size:0.7rem;color:rgba(249,240,224,0.35);">${entry.mode}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderUserStats(user) {
    if (!user) return '<p style="font-size:0.82rem;color:rgba(249,240,224,0.35);">Masuk untuk melihat statistik.</p>';
    const allScores = JSON.parse(localStorage.getItem("quiz_leaderboard") || "[]");
    const myScores = allScores.filter(s => s.username === user.username);
    if (myScores.length === 0) return '<p style="font-size:0.82rem;color:rgba(249,240,224,0.35);">Belum pernah main. Ayo mulai!</p>';
    const best = Math.max(...myScores.map(s => s.score));
    const plays = myScores.length;
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="text-align:center;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;">
          <div style="font-size:1.3rem;font-weight:700;color:#d4b45a;">${best}</div>
          <div style="font-size:0.72rem;color:rgba(249,240,224,0.45);">Skor Terbaik</div>
        </div>
        <div style="text-align:center;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;">
          <div style="font-size:1.3rem;font-weight:700;color:#a78bfa;">${plays}</div>
          <div style="font-size:0.72rem;color:rgba(249,240,224,0.45);">Kali Main</div>
        </div>
      </div>
    `;
  }

  // ========================
  // QUIZ MODE
  // ========================
  function startMode(mode) {
    currentMode = mode;
    score = 0; streak = 0; currentQuestionIndex = 0;
    if (mode === "quiz") startQuiz();
    else if (mode === "tebak-motif") startTebakMotif();
    else if (mode === "scramble") startScramble();
  }

  function generateQuizQuestions(level) {
    const data = window.BATIK_DATA || [];
    questions = [];
    currentQuestionIndex = 0;
    score = 0; streak = 0;
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const pool = shuffled.slice(0, Math.min(totalQuestions + 5, shuffled.length));

    pool.slice(0, totalQuestions).forEach(b => {
      const type = level === "easy" ? "mc" : level === "medium" ? (Math.random() > 0.4 ? "mc" : "tf") : (Math.random() > 0.6 ? "mc" : Math.random() > 0.5 ? "tf" : "match");
      if (type === "mc") {
        const wrongPool = data.filter(x => x.id !== b.id);
        const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.asal);
        const opts = [...wrongs, b.asal].sort(() => Math.random() - 0.5);
        questions.push({ type:"mc", question:`Dari daerah manakah Batik "${b.nama}" berasal?`, options: opts, answer: b.asal, batik: b });
      } else if (type === "tf") {
        const other = data.filter(x => x.id !== b.id)[Math.floor(Math.random() * (data.length-1))];
        const isTrue = Math.random() > 0.5;
        const region = isTrue ? b.asal : other?.asal;
        questions.push({ type:"tf", question:`Batik "${b.nama}" berasal dari ${region}, benar atau salah?`, answer: isTrue ? "Benar" : "Salah", options:["Benar","Salah"], batik: b });
      } else {
        const matchPool = [...data].sort(() => Math.random() - 0.5).slice(0, 3);
        if (!matchPool.find(x => x.id === b.id)) matchPool[0] = b;
        const pairs = matchPool.map(x => ({ batik: x.nama, region: x.asal }));
        questions.push({ type:"match", question:"Jodohkan motif batik dengan daerah asalnya:", pairs, batik: b });
      }
    });
  }

  function startQuiz() {
    const level = "medium";
    generateQuizQuestions(level);
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    if (currentQuestionIndex >= questions.length) { endGame(); return; }
    const q = questions[currentQuestionIndex];
    clearInterval(timerInterval);
    timeRemaining = 30;
    questionStartTime = Date.now();

    const streakHTML = streak >= 3 ? `<div style="text-align:center;margin-bottom:0.5rem;"><span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0a0e1a;padding:3px 12px;border-radius:20px;font-size:0.78rem;font-weight:800;">🔥 STREAK x${streak}!</span></div>` : '';

    quizContainer.innerHTML = `
      <div class="glass-card" style="max-width:680px;margin:0 auto;padding:2rem;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <div style="font-size:0.82rem;color:var(--text-light-muted);">Soal ${currentQuestionIndex+1} / ${questions.length}</div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:#f59e0b;font-weight:700;font-size:0.9rem;">⚡ ${score} poin</span>
            <div id="timer-circle" style="width:42px;height:42px;border-radius:50%;background:conic-gradient(#22c55e ${timeRemaining/30*360}deg,rgba(255,255,255,0.1) 0);display:flex;align-items:center;justify-content:center;">
              <span id="timer-text" style="font-size:0.9rem;font-weight:700;color:white;background:#0a0e1a;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${timeRemaining}</span>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:4px;margin-bottom:1.25rem;overflow:hidden;">
          <div style="height:100%;width:${(currentQuestionIndex/questions.length)*100}%;background:linear-gradient(90deg,#c9a84c,#d4b45a);border-radius:4px;transition:width 0.3s;"></div>
        </div>

        ${streakHTML}

        <!-- Question -->
        <p style="font-size:1.05rem;font-weight:600;color:var(--ivory-100);margin-bottom:1.5rem;line-height:1.5;">${q.question}</p>

        <!-- Options -->
        ${q.type !== "match" ? `
          <div style="display:flex;flex-direction:column;gap:0.65rem;" id="options-container">
            ${q.options.map((opt, i) => `
              <button onclick="Quiz.answerQuestion('${opt.replace(/'/g,"\\'")}', this)" class="quiz-opt-btn" style="padding:0.9rem 1.25rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:var(--ivory-100);font-size:0.95rem;text-align:left;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;" onmouseover="this.style.background='rgba(201,168,76,0.12)';this.style.borderColor='rgba(201,168,76,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,255,255,0.12)'">
                <span style="width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.78rem;color:rgba(255,255,255,0.5);flex-shrink:0;">${'ABCD'[i]}</span>
                ${opt}
              </button>
            `).join('')}
          </div>
        ` : renderMatchQuestion(q)}

        <div id="quiz-feedback" style="margin-top:1rem;min-height:2rem;"></div>
      </div>
    `;

    startTimer(q);
  }

  function startTimer(q) {
    timerInterval = setInterval(() => {
      timeRemaining--;
      const timerText = document.getElementById("timer-text");
      const timerCircle = document.getElementById("timer-circle");
      if (timerText) timerText.textContent = timeRemaining;
      if (timerCircle) {
        const color = timeRemaining > 10 ? "#22c55e" : timeRemaining > 5 ? "#f59e0b" : "#e74c3c";
        timerCircle.style.background = `conic-gradient(${color} ${timeRemaining/30*360}deg, rgba(255,255,255,0.1) 0)`;
      }
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        showFeedback(false, q.answer, null, 0);
        streak = 0;
        setTimeout(() => { currentQuestionIndex++; renderQuizQuestion(); }, 1800);
      }
    }, 1000);
  }

  function renderMatchQuestion(q) {
    const lefts = q.pairs.map(p => p.batik);
    const rights = [...q.pairs.map(p => p.region)].sort(() => Math.random() - 0.5);
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;" id="match-container">
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${lefts.map((l,i) => `<div id="match-left-${i}" style="padding:10px 12px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:8px;font-size:0.88rem;color:var(--gold-300);cursor:pointer;text-align:center;" onclick="Quiz.selectMatchItem('left',${i},'${l.replace(/'/g,"\\'")}')">🎨 ${l}</div>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${rights.map((r,i) => `<div id="match-right-${i}" style="padding:10px 12px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:0.88rem;color:#93c5fd;cursor:pointer;text-align:center;" onclick="Quiz.selectMatchItem('right',${i},'${r.replace(/'/g,"\\'")}')">📍 ${r}</div>`).join('')}
        </div>
      </div>
      <button onclick="Quiz.checkMatch(${JSON.stringify(q.pairs).replace(/"/g,'&quot;')})" style="margin-top:1rem;width:100%;padding:0.8rem;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:8px;color:#0a0e1a;font-weight:700;cursor:pointer;">✅ Cek Jawaban</button>
    `;
  }

  let matchSelections = { left: null, right: null, pairs: [] };

  function selectMatchItem(side, idx, val) {
    // Visual highlight & simple selection
    document.querySelectorAll(`[id^="match-${side}-"]`).forEach(el => {
      el.style.borderColor = side === "left" ? "rgba(201,168,76,0.3)" : "rgba(59,130,246,0.3)";
    });
    const el = document.getElementById(`match-${side}-${idx}`);
    if (el) el.style.borderColor = side === "left" ? "#d4b45a" : "#3b82f6";
    matchSelections[side] = { idx, val };
    if (matchSelections.left && matchSelections.right) {
      matchSelections.pairs.push({ batik: matchSelections.left.val, region: matchSelections.right.val });
      matchSelections.left = null; matchSelections.right = null;
    }
  }

  function checkMatch(pairs) {
    clearInterval(timerInterval);
    const correct = matchSelections.pairs.filter(sel => pairs.find(p => p.batik === sel.batik && p.region === sel.region)).length;
    const total = pairs.length;
    const pts = Math.round((correct / total) * 30);
    score += pts;
    streak = correct === total ? streak + 1 : 0;
    showFeedback(correct === total, `${correct}/${total} benar`, null, pts);
    matchSelections = { left:null, right:null, pairs:[] };
    setTimeout(() => { currentQuestionIndex++; renderQuizQuestion(); }, 2000);
  }

  function answerQuestion(answer, btnEl) {
    clearInterval(timerInterval);
    const elapsed = (Date.now() - questionStartTime) / 1000;
    const q = questions[currentQuestionIndex];
    const isCorrect = answer === q.answer;

    // Disable all buttons
    document.querySelectorAll(".quiz-opt-btn").forEach(b => { b.onclick = null; b.style.cursor = "default"; });

    // Visual feedback on buttons
    document.querySelectorAll(".quiz-opt-btn").forEach(b => {
      if (b.textContent.trim().includes(q.answer)) {
        b.style.background = "rgba(34,197,94,0.2)"; b.style.borderColor = "#22c55e";
      } else if (b === btnEl && !isCorrect) {
        b.style.background = "rgba(231,76,60,0.2)"; b.style.borderColor = "#e74c3c";
      }
    });

    let pts = 0;
    if (isCorrect) {
      streak++;
      const speedBonus = elapsed < 10 ? 20 : elapsed < 20 ? 10 : 0;
      const streakBonus = streak >= 3 ? 10 : 0;
      pts = 10 + speedBonus + streakBonus;
      score += pts;
    } else {
      streak = 0;
    }

    showFeedback(isCorrect, q.answer, elapsed < 10 && isCorrect ? "Jawaban Kilat! +20 bonus" : null, pts);
    setTimeout(() => { currentQuestionIndex++; renderQuizQuestion(); }, 1800);
  }

  function showFeedback(isCorrect, correctAnswer, bonus, pts) {
    const el = document.getElementById("quiz-feedback");
    if (!el) return;
    el.innerHTML = `
      <div style="padding:10px 14px;border-radius:8px;background:${isCorrect?'rgba(34,197,94,0.15)':'rgba(231,76,60,0.15)'};border:1px solid ${isCorrect?'rgba(34,197,94,0.4)':'rgba(231,76,60,0.4)'};display:flex;align-items:center;justify-content:space-between;gap:1rem;">
        <div>
          <span style="font-weight:700;color:${isCorrect?'#4ade80':'#f87171'};font-size:0.95rem;">${isCorrect?'✅ Benar!':'❌ Salah!'}</span>
          ${!isCorrect ? `<span style="font-size:0.82rem;color:rgba(249,240,224,0.6);margin-left:8px;">Jawaban: ${correctAnswer}</span>` : ''}
          ${bonus ? `<span style="font-size:0.78rem;color:#f59e0b;margin-left:8px;">${bonus}</span>` : ''}
        </div>
        ${pts > 0 ? `<span style="font-weight:800;color:#d4b45a;font-size:1.1rem;">+${pts} pts</span>` : ''}
      </div>
    `;
  }

  // ========================
  // TEBAK MOTIF GAME
  // ========================
  function startTebakMotif() {
    const data = window.BATIK_DATA?.filter(b => b.image) || [];
    if (data.length < 4) { alert("Data batik tidak cukup."); renderLobby(); return; }

    questions = [];
    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 8);
    shuffled.forEach(b => {
      const wrong = data.filter(x => x.id !== b.id).sort(() => Math.random()-0.5).slice(0,3).map(x => x.nama);
      const opts = [...wrong, b.nama].sort(() => Math.random()-0.5);
      questions.push({ type:"tebak", image: b.image, answer: b.nama, options: opts, hint: b.asal, batik: b });
    });

    currentQuestionIndex = 0; score = 0; streak = 0;
    renderTebakQuestion();
  }

  function renderTebakQuestion() {
    if (currentQuestionIndex >= questions.length) { endGame(); return; }
    const q = questions[currentQuestionIndex];
    clearInterval(timerInterval);
    timeRemaining = 15;
    questionStartTime = Date.now();

    quizContainer.innerHTML = `
      <div class="glass-card" style="max-width:640px;margin:0 auto;padding:1.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <span style="color:#3b82f6;font-weight:700;font-size:0.88rem;">🎨 Tebak Motif!</span>
            <span style="color:var(--text-light-muted);font-size:0.82rem;margin-left:8px;">${currentQuestionIndex+1}/${questions.length}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:#f59e0b;font-weight:700;">⚡${score}</span>
            <div id="timer-circle" style="width:40px;height:40px;border-radius:50%;background:conic-gradient(#3b82f6 ${timeRemaining/15*360}deg,rgba(255,255,255,0.1) 0);display:flex;align-items:center;justify-content:center;">
              <span id="timer-text" style="font-size:0.88rem;font-weight:700;color:white;background:#0a0e1a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${timeRemaining}</span>
            </div>
          </div>
        </div>

        <img src="${q.image}" alt="Foto batik" style="width:100%;height:220px;object-fit:cover;border-radius:10px;margin-bottom:0.5rem;border:1px solid rgba(255,255,255,0.1);"/>
        <p style="font-size:0.78rem;color:rgba(249,240,224,0.4);text-align:center;margin-bottom:1.25rem;">📍 Petunjuk: Dari ${q.hint}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;">
          ${q.options.map((opt,i) => `
            <button onclick="Quiz.answerTebak('${opt.replace(/'/g,"\\'")}', this)" class="quiz-opt-btn" style="padding:0.8rem;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:10px;color:var(--ivory-100);font-size:0.9rem;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.08)'">
              ${'🅐🅑🅒🅓'[i]} ${opt}
            </button>
          `).join('')}
        </div>
        <div id="quiz-feedback" style="margin-top:0.75rem;min-height:2rem;"></div>
      </div>
    `;

    timerInterval = setInterval(() => {
      timeRemaining--;
      const timerText = document.getElementById("timer-text");
      const timerCircle = document.getElementById("timer-circle");
      if (timerText) timerText.textContent = timeRemaining;
      if (timerCircle) {
        const color = timeRemaining > 7 ? "#3b82f6" : timeRemaining > 3 ? "#f59e0b" : "#e74c3c";
        timerCircle.style.background = `conic-gradient(${color} ${timeRemaining/15*360}deg, rgba(255,255,255,0.1) 0)`;
      }
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        streak = 0;
        showFeedback(false, q.answer, null, 0);
        setTimeout(() => { currentQuestionIndex++; renderTebakQuestion(); }, 1800);
      }
    }, 1000);
  }

  function answerTebak(answer, btnEl) {
    clearInterval(timerInterval);
    const elapsed = (Date.now() - questionStartTime) / 1000;
    const q = questions[currentQuestionIndex];
    const isCorrect = answer === q.answer;

    document.querySelectorAll(".quiz-opt-btn").forEach(b => {
      b.onclick = null; b.style.cursor = "default";
      if (b.textContent.includes(q.answer)) { b.style.background = "rgba(34,197,94,0.2)"; b.style.borderColor = "#22c55e"; }
      else if (b === btnEl && !isCorrect) { b.style.background = "rgba(231,76,60,0.2)"; b.style.borderColor = "#e74c3c"; }
    });

    let pts = 0;
    if (isCorrect) {
      streak++;
      const speed = elapsed < 5 ? 25 : elapsed < 10 ? 15 : 10;
      pts = speed + (streak >= 3 ? 10 : 0);
      score += pts;
    } else { streak = 0; }

    showFeedback(isCorrect, q.answer, isCorrect && elapsed < 5 ? "⚡ Super Cepat! +25pts" : null, pts);
    setTimeout(() => { currentQuestionIndex++; renderTebakQuestion(); }, 1800);
  }

  // ========================
  // WORD SCRAMBLE
  // ========================
  function startScramble() {
    const data = window.BATIK_DATA || [];
    if (data.length < 3) { renderLobby(); return; }
    questions = [];
    const pool = [...data].sort(() => Math.random()-0.5).slice(0, 8);
    pool.forEach(b => {
      const name = b.nama.toUpperCase();
      const scrambled = name.split("").sort(() => Math.random()-0.5).join(" ");
      questions.push({ type:"scramble", scrambled, answer: b.nama, hint: `${b.emoji || "🎨"} Batik dari ${b.asal}`, image: b.image });
    });
    currentQuestionIndex = 0; score = 0; streak = 0;
    renderScrambleQuestion();
  }

  function renderScrambleQuestion() {
    if (currentQuestionIndex >= questions.length) { endGame(); return; }
    const q = questions[currentQuestionIndex];
    clearInterval(timerInterval);
    timeRemaining = 20;
    questionStartTime = Date.now();

    quizContainer.innerHTML = `
      <div class="glass-card" style="max-width:600px;margin:0 auto;padding:1.75rem;text-align:center;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <span style="color:#8b5cf6;font-weight:700;">🔤 Susun Nama Batik — ${currentQuestionIndex+1}/${questions.length}</span>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:#f59e0b;font-weight:700;">⚡${score}</span>
            <div id="timer-circle" style="width:40px;height:40px;border-radius:50%;background:conic-gradient(#8b5cf6 ${timeRemaining/20*360}deg,rgba(255,255,255,0.1) 0);display:flex;align-items:center;justify-content:center;">
              <span id="timer-text" style="font-size:0.88rem;font-weight:700;color:white;background:#0a0e1a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${timeRemaining}</span>
            </div>
          </div>
        </div>

        <p style="font-size:0.82rem;color:rgba(249,240,224,0.5);margin-bottom:0.75rem;">${q.hint}</p>
        <div style="font-size:2.5rem;font-weight:900;letter-spacing:0.2em;color:#a78bfa;margin-bottom:1.5rem;font-family:monospace;background:rgba(139,92,246,0.08);padding:1rem;border-radius:10px;border:1px solid rgba(139,92,246,0.25);">${q.scrambled}</div>

        <input id="scramble-input" type="text" placeholder="Ketik jawaban di sini..."
          style="width:100%;padding:0.9rem;border:2px solid rgba(139,92,246,0.4);border-radius:10px;background:rgba(255,255,255,0.05);color:white;font-size:1rem;text-align:center;font-weight:600;outline:none;margin-bottom:0.75rem;"
          onkeydown="if(event.key==='Enter') Quiz.checkScramble()"/>

        <button onclick="Quiz.checkScramble()" style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;border-radius:10px;color:white;font-weight:700;font-size:0.95rem;cursor:pointer;">✅ Cek Jawaban</button>
        <div id="quiz-feedback" style="margin-top:0.75rem;min-height:2rem;"></div>
      </div>
    `;

    document.getElementById("scramble-input")?.focus();

    timerInterval = setInterval(() => {
      timeRemaining--;
      const timerText = document.getElementById("timer-text");
      const timerCircle = document.getElementById("timer-circle");
      if (timerText) timerText.textContent = timeRemaining;
      if (timerCircle) {
        const color = timeRemaining > 10 ? "#8b5cf6" : timeRemaining > 5 ? "#f59e0b" : "#e74c3c";
        timerCircle.style.background = `conic-gradient(${color} ${timeRemaining/20*360}deg, rgba(255,255,255,0.1) 0)`;
      }
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        streak = 0;
        showFeedback(false, questions[currentQuestionIndex].answer, null, 0);
        setTimeout(() => { currentQuestionIndex++; renderScrambleQuestion(); }, 1800);
      }
    }, 1000);
  }

  function checkScramble() {
    clearInterval(timerInterval);
    const elapsed = (Date.now() - questionStartTime) / 1000;
    const q = questions[currentQuestionIndex];
    const input = document.getElementById("scramble-input")?.value.trim();
    const isCorrect = input?.toLowerCase() === q.answer.toLowerCase();

    let pts = 0;
    if (isCorrect) {
      streak++;
      const speed = elapsed < 8 ? 30 : elapsed < 14 ? 20 : 15;
      pts = speed + (streak >= 3 ? 10 : 0);
      score += pts;
    } else { streak = 0; }

    showFeedback(isCorrect, q.answer, isCorrect && elapsed < 8 ? "⚡ Cepat Banget! +30pts" : null, pts);
    setTimeout(() => { currentQuestionIndex++; renderScrambleQuestion(); }, 1800);
  }

  // ========================
  // END GAME
  // ========================
  function endGame() {
    clearInterval(timerInterval);
    const user = window.Auth?.getCurrentUser();
    const hasGmail = isGmailUser();
    const maxPossible = currentMode === "quiz" ? 400 : currentMode === "tebak-motif" ? 280 : 320;
    const pct = Math.round((score / maxPossible) * 100);
    const grade = pct >= 80 ? "🥇 Luar Biasa!" : pct >= 60 ? "🥈 Bagus!" : pct >= 40 ? "🥉 Cukup Baik" : "💪 Terus Berlatih!";
    const modeLabel = currentMode === "quiz" ? "Quiz Batik" : currentMode === "tebak-motif" ? "Tebak Motif" : "Susun Nama";

    // Simpan skor
    if (user) {
      const entry = {
        username: user.username,
        score,
        mode: modeLabel,
        isPublic: hasGmail,
        date: new Date().toISOString(),
        best: score
      };
      // Simpan ke quiz_leaderboard
      if (hasGmail) {
        const lb = JSON.parse(localStorage.getItem("quiz_leaderboard") || "[]");
        const existIdx = lb.findIndex(e => e.username === user.username && e.mode === modeLabel);
        if (existIdx !== -1) { lb[existIdx].best = Math.max(lb[existIdx].best, score); lb[existIdx].score = score; }
        else lb.push(entry);
        lb.sort((a,b) => b.best - a.best);
        const trimmed = lb.slice(0,20);
        localStorage.setItem("quiz_leaderboard", JSON.stringify(trimmed));
        if (window.DB) DB.write("quiz_leaderboard", trimmed); // Firebase sync
      }
      // Simpan ke personal history (semua user)
      const history = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]");
      history.unshift({ score, date: new Date().toISOString(), mode: modeLabel });
      localStorage.setItem("dashboard_quiz_scores", JSON.stringify(history.slice(0,20)));
      window.Auth?.logActivity("kuis", `Menyelesaikan ${modeLabel} dengan skor ${score}`);
    }

    const lb = getLeaderboard();
    const myRank = lb.findIndex(e => e.username === user?.username) + 1;

    quizContainer.innerHTML = `
      <div class="glass-card" style="max-width:640px;margin:0 auto;padding:2.5rem;text-align:center;">
        <div style="font-size:4rem;margin-bottom:0.75rem;">${grade.split(' ')[0]}</div>
        <h2 style="color:var(--gold-400);font-size:1.8rem;margin-bottom:0.5rem;">${grade.split(' ').slice(1).join(' ')}</h2>
        <p style="color:var(--text-light-muted);margin-bottom:1.5rem;">${modeLabel} — ${questions.length} soal</p>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div style="padding:1rem;background:rgba(201,168,76,0.1);border-radius:10px;border:1px solid rgba(201,168,76,0.3);">
            <div style="font-size:2rem;font-weight:800;color:#d4b45a;">${score}</div>
            <div style="font-size:0.75rem;color:rgba(249,240,224,0.5);">Total Poin</div>
          </div>
          <div style="padding:1rem;background:rgba(34,197,94,0.1);border-radius:10px;border:1px solid rgba(34,197,94,0.3);">
            <div style="font-size:2rem;font-weight:800;color:#4ade80;">${pct}%</div>
            <div style="font-size:0.75rem;color:rgba(249,240,224,0.5);">Performa</div>
          </div>
          <div style="padding:1rem;background:rgba(139,92,246,0.1);border-radius:10px;border:1px solid rgba(139,92,246,0.3);">
            <div style="font-size:2rem;font-weight:800;color:#a78bfa;">${myRank > 0 ? '#'+myRank : hasGmail ? '—' : '🔒'}</div>
            <div style="font-size:0.75rem;color:rgba(249,240,224,0.5);">Peringkat</div>
          </div>
        </div>

        ${!hasGmail && user ? `
          <div style="padding:0.85rem;background:rgba(245,158,11,0.08);border-radius:10px;border:1px solid rgba(245,158,11,0.25);margin-bottom:1.25rem;">
            <p style="font-size:0.85rem;color:#fbbf24;margin:0 0 0.5rem;">⭐ Skor Anda tidak masuk papan skor karena belum pakai Gmail</p>
            <button onclick="window.Auth?.openGmailModal()" style="padding:6px 16px;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:8px;color:#0a0e1a;font-weight:700;font-size:0.82rem;cursor:pointer;">Tambahkan Gmail →</button>
          </div>
        ` : ''}

        <!-- Papan Skor Mini -->
        <div style="text-align:left;margin-bottom:1.5rem;">
          <h4 style="color:var(--gold-400);font-size:0.9rem;margin-bottom:0.75rem;">🏅 Top Papan Skor</h4>
          ${renderLeaderboardHTML(lb)}
        </div>

        <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
          <button onclick="Quiz.startMode('${currentMode}')" style="padding:0.85rem 1.5rem;background:linear-gradient(135deg,#c9a84c,#d4b45a);border:none;border-radius:10px;color:#0a0e1a;font-weight:700;cursor:pointer;">🔄 Main Lagi</button>
          <button onclick="Quiz.returnToLobby()" style="padding:0.85rem 1.5rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:var(--ivory-100);font-weight:600;cursor:pointer;">🏠 Kembali ke Lobby</button>
        </div>
      </div>
    `;
  }

  // ========================
  // HELPERS
  // ========================
  function isGmailUser() {
    const user = window.Auth?.getCurrentUser();
    if (!user) return false;
    const users = JSON.parse(localStorage.getItem("museum_users") || "[]");
    const u = users.find(x => x.username === user.username);
    return !!(u?.email && u.email.endsWith("@gmail.com"));
  }

  function getLeaderboard() {
    const lb = JSON.parse(localStorage.getItem("quiz_leaderboard") || "[]");
    return lb.filter(e => e.isPublic).sort((a,b) => b.best - a.best).slice(0, 10);
  }

  function returnToLobby() { renderLobby(); }

  return { init, startMode, returnToLobby, answerQuestion, answerTebak, checkScramble, checkMatch, selectMatchItem };
})();

window.Quiz = Quiz;
