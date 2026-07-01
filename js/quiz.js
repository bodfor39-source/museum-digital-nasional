/**
 * quiz.js — AI Quiz Engine
 * Membuat kuis interaktif tipe Pilihan Ganda, Benar/Salah, dan Menjodohkan
 * secara dinamis berdasarkan database batik dan menyimpan skor akhir.
 * Museum Digital Nasional Indonesia
 */

const Quiz = (() => {
  let quizContainer = null;
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let timerInterval = null;
  let timeRemaining = 20; // 20 detik per soal
  let totalQuestions = 5;

  function init() {
    quizContainer = document.getElementById("quiz-container");
    if (!quizContainer) return;
    renderStartScreen();
  }

  function renderStartScreen() {
    quizContainer.innerHTML = `
      <div class="quiz-card glass-card text-center fade-in">
        <span class="quiz-card__trophy">🏆</span>
        <h2 class="quiz-card__title">Kuis AI Batik Nusantara</h2>
        <p class="quiz-card__subtitle">
          Uji wawasan Anda mengenai filosofi, sejarah, dan corak motif batik Nusantara. 
          Kuis ini berisi 5 pertanyaan acak yang dihasilkan secara dinamis.
        </p>
        <div class="quiz-start-settings">
          <label for="quiz-type-select">Pilih Tingkat Kuis:</label>
          <select id="quiz-level-select" class="form-input">
            <option value="easy">Pemula (Pilihan Ganda)</option>
            <option value="medium">Menengah (Campuran Pilihan Ganda & Benar/Salah)</option>
            <option value="hard">Ahli (Campuran Pilihan Ganda, Benar/Salah & Menjodohkan)</option>
          </select>
        </div>
        <button id="btn-start-quiz" class="btn-primary btn-full" style="margin-top: 20px;">
          Mulai Kuis Sekarang
        </button>
      </div>
    `;

    document.getElementById("btn-start-quiz").addEventListener("click", () => {
      const level = document.getElementById("quiz-level-select").value;
      generateQuizQuestions(level);
      startQuiz();
    });
  }

  // Membuat Pertanyaan secara Dinamis dari BATIK_DATA
  function generateQuizQuestions(level) {
    const data = window.BATIK_DATA || [];
    questions = [];
    currentQuestionIndex = 0;
    score = 0;

    // Kloning data untuk pengacakan aman
    const pool = [...data];
    if (pool.length < 3) return;

    // Acak pool batik
    pool.sort(() => Math.random() - 0.5);

    // Buat Pertanyaan Pilihan Ganda (Tipe 1)
    const pgBatik = pool[0];
    const choicesAsal = [pgBatik.asal];
    const otherOrigins = pool.filter(b => b.id !== pgBatik.id).map(b => b.asal);
    while (choicesAsal.length < 4 && otherOrigins.length > 0) {
      const randOrigin = otherOrigins.splice(Math.floor(Math.random() * otherOrigins.length), 1)[0];
      if (!choicesAsal.includes(randOrigin)) choicesAsal.push(randOrigin);
    }
    choicesAsal.sort(() => Math.random() - 0.5);

    questions.push({
      type: "pilihan-ganda",
      question: `Dari daerah manakah motif **Batik ${pgBatik.nama}** berasal?`,
      choices: choicesAsal,
      answer: pgBatik.asal,
      points: 20
    });

    // Buat Pertanyaan Filosofi Pilihan Ganda (Tipe 2)
    const philBatik = pool[1];
    const choicesPhil = [philBatik.nama];
    const otherNames = pool.filter(b => b.id !== philBatik.id).map(b => b.nama);
    while (choicesPhil.length < 4 && otherNames.length > 0) {
      const randName = otherNames.splice(Math.floor(Math.random() * otherNames.length), 1)[0];
      if (!choicesPhil.includes(randName)) choicesPhil.push(randName);
    }
    choicesPhil.sort(() => Math.random() - 0.5);

    questions.push({
      type: "pilihan-ganda",
      question: `Motif batik apakah yang memiliki makna filosofis mendalam berikut: *"${philBatik.makna.slice(0, 120)}..."*?`,
      choices: choicesPhil,
      answer: philBatik.nama,
      points: 20
    });

    // Buat Pertanyaan Benar/Salah (Tipe 3)
    const tfBatik = pool[2];
    const isTrueStatement = Math.random() > 0.5;
    let statement = "";
    let ans = "";

    if (isTrueStatement) {
      statement = `Batik **${tfBatik.nama}** dicirikan dengan: *${tfBatik.ciriKhasMotif}*`;
      ans = "Benar";
    } else {
      // Pasangkan dengan ciri khas batik lain
      const wrongBatik = pool.find(b => b.id !== tfBatik.id) || tfBatik;
      statement = `Batik **${tfBatik.nama}** dicirikan dengan: *${wrongBatik.ciriKhasMotif}*`;
      ans = "Salah";
    }

    questions.push({
      type: "benar-salah",
      question: `Apakah pernyataan berikut Benar atau Salah?\n\n"${statement}"`,
      choices: ["Benar", "Salah"],
      answer: ans,
      points: 20
    });

    // Buat Pertanyaan Abad Pilihan Ganda (Tipe 4)
    const centuryBatik = pool[pool.length - 1];
    questions.push({
      type: "pilihan-ganda",
      question: `Berdasarkan catatan sejarah museum, pada abad keberapakah **Batik ${centuryBatik.nama}** mulai berkembang di Nusantara?`,
      choices: ["Abad XIII", "Abad XVI", "Abad XVII", "Abad XIX", "Abad XX"].sort(() => Math.random() - 0.5),
      answer: `Abad ${centuryBatik.abad}`,
      points: 20
    });

    // Buat Pertanyaan Menjodohkan (Tipe 5) jika tingkat medium/hard
    if (level === "easy") {
      // Jika mudah, ganti tipe matching dengan Pilihan Ganda biasa
      const easyBatik = pool[0];
      questions.push({
        type: "pilihan-ganda",
        question: `Batik **${easyBatik.nama}** dibuat menggunakan teknik utama...`,
        choices: ["Batik tulis", "Batik cap", "Batik kombinasi", "Batik lukis"],
        answer: easyBatik.cidoc?.technique || "Batik tulis",
        points: 20
      });
    } else {
      // Tipe Menjodohkan (Matching)
      // Ambil 3 batik acak untuk dijodohkan
      const matchingBatik = pool.slice(0, 3);
      const itemsLeft = matchingBatik.map(b => ({ id: b.id, text: b.nama }));
      const itemsRight = matchingBatik.map(b => ({ id: b.id, text: b.ciriKhasMotif })).sort(() => Math.random() - 0.5);

      questions.push({
        type: "menjodohkan",
        question: "Jodohkan nama motif batik di sebelah kiri dengan deskripsi ciri khas motif yang tepat di sebelah kanan!",
        left: itemsLeft,
        right: itemsRight,
        pairs: matchingBatik.reduce((acc, curr) => {
          acc[curr.id] = curr.id;
          return acc;
        }, {}),
        points: 20
      });
    }

    // Batasi total pertanyaan
    questions = questions.slice(0, totalQuestions);
  }

  function startQuiz() {
    renderQuestion();
  }

  function renderQuestion() {
    if (currentQuestionIndex >= questions.length) {
      endQuiz();
      return;
    }

    const q = questions[currentQuestionIndex];
    timeRemaining = 20;

    // Kerangka Dasar Kuis
    quizContainer.innerHTML = `
      <div class="quiz-card glass-card fade-in">
        <div class="quiz-header">
          <span class="quiz-progress">Pertanyaan ${currentQuestionIndex + 1} dari ${questions.length}</span>
          <span id="quiz-timer" class="quiz-timer">⏰ ${timeRemaining}s</span>
        </div>
        
        <div class="quiz-progress-bar-wrap">
          <div class="quiz-progress-bar" style="width: ${((currentQuestionIndex + 1) / questions.length) * 100}%"></div>
        </div>

        <h3 class="quiz-question-text" style="margin-top: 20px;">${q.question}</h3>
        
        <div id="quiz-options-area" class="quiz-options-area" style="margin-top: 20px;"></div>
      </div>
    `;

    // Render pilihan jawaban berdasarkan tipe soal
    const optionsArea = document.getElementById("quiz-options-area");

    if (q.type === "pilihan-ganda" || q.type === "benar-salah") {
      q.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "quiz-option-btn";
        btn.innerHTML = choice;
        btn.addEventListener("click", () => selectAnswer(choice, btn));
        optionsArea.appendChild(btn);
      });
    } else if (q.type === "menjodohkan") {
      renderMatchingGame(optionsArea, q);
    }

    // Jalankan timer
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    const timerEl = document.getElementById("quiz-timer");
    
    timerInterval = setInterval(() => {
      timeRemaining--;
      if (timerEl) timerEl.textContent = `⏰ ${timeRemaining}s`;

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        // Waktu habis, langsung skip
        showAnswerFeedback(false, true);
      }
    }, 1000);
  }

  function selectAnswer(selected, buttonEl) {
    clearInterval(timerInterval);
    const q = questions[currentQuestionIndex];
    const isCorrect = selected === q.answer;

    if (buttonEl) {
      buttonEl.classList.add(isCorrect ? "quiz-option-btn--correct" : "quiz-option-btn--wrong");
    }

    // Nonaktifkan semua tombol
    document.querySelectorAll(".quiz-option-btn").forEach(btn => btn.disabled = true);

    showAnswerFeedback(isCorrect);
  }

  // Logika Khusus Tipe Menjodohkan (Matching)
  function renderMatchingGame(container, q) {
    container.innerHTML = `
      <div class="matching-game">
        <div class="matching-col" id="matching-left-col">
          <p class="matching-col-title">Motif</p>
          ${q.left.map(item => `<button class="matching-item matching-item--left" data-id="${item.id}">${item.text}</button>`).join("")}
        </div>
        <div class="matching-col" id="matching-right-col">
          <p class="matching-col-title">Deskripsi Ciri Khas</p>
          ${q.right.map(item => `<button class="matching-item matching-item--right" data-id="${item.id}">${item.text}</button>`).join("")}
        </div>
      </div>
      <button id="btn-submit-matching" class="btn-primary btn-full" style="margin-top: 20px;" disabled>
        Kirim Jawaban Menjodohkan
      </button>
    `;

    let selectedLeft = null;
    let selectedRight = null;
    const connections = {}; // format: { leftId: rightId }

    const leftBtns = container.querySelectorAll(".matching-item--left");
    const rightBtns = container.querySelectorAll(".matching-item--right");
    const submitBtn = document.getElementById("btn-submit-matching");

    leftBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        leftBtns.forEach(b => b.classList.remove("matching-item--selected"));
        btn.classList.add("matching-item--selected");
        selectedLeft = btn.dataset.id;
        checkConnection();
      });
    });

    rightBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        rightBtns.forEach(b => b.classList.remove("matching-item--selected"));
        btn.classList.add("matching-item--selected");
        selectedRight = btn.dataset.id;
        checkConnection();
      });
    });

    function checkConnection() {
      if (selectedLeft && selectedRight) {
        connections[selectedLeft] = selectedRight;
        
        // Tandai visual terhubung
        const leftEl = container.querySelector(`.matching-item--left[data-id="${selectedLeft}"]`);
        const rightEl = container.querySelector(`.matching-item--right[data-id="${selectedRight}"]`);

        leftEl.classList.remove("matching-item--selected");
        rightEl.classList.remove("matching-item--selected");
        leftEl.classList.add("matching-item--connected");
        rightEl.classList.add("matching-item--connected");

        selectedLeft = null;
        selectedRight = null;

        // Cek jika semua sudah terhubung
        if (Object.keys(connections).length === q.left.length) {
          submitBtn.disabled = false;
        }
      }
    }

    submitBtn.addEventListener("click", () => {
      clearInterval(timerInterval);
      
      // Hitung skor kecocokan matching
      let allCorrect = true;
      Object.keys(connections).forEach(lId => {
        if (connections[lId] !== q.pairs[lId]) {
          allCorrect = false;
        }
      });

      // Tampilkan umpan balik
      showAnswerFeedback(allCorrect);
    });
  }

  function showAnswerFeedback(isCorrect, autoSkip = false) {
    const q = questions[currentQuestionIndex];
    if (isCorrect) score += q.points;

    // Nonaktifkan semua tombol agar tidak bisa diklik ganda
    document.querySelectorAll(".quiz-option-btn").forEach(btn => btn.disabled = true);
    const submitBtn = document.getElementById("btn-submit-matching");
    if (submitBtn) submitBtn.disabled = true;

    if (autoSkip) {
      // Langsung lewati tanpa menunggu jika waktu habis
      currentQuestionIndex++;
      renderQuestion();
      return;
    }

    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = `quiz-feedback ${isCorrect ? "quiz-feedback--correct" : "quiz-feedback--wrong"}`;
    feedbackDiv.innerHTML = `
      <p class="quiz-feedback-title">${isCorrect ? "🎉 Jawaban Benar!" : "❌ Kurang Tepat"}</p>
      <p class="quiz-feedback-desc">Jawaban yang benar: <strong>${q.answer || "Koneksi pencocokan yang tepat"}</strong></p>
      <button id="btn-next-question" class="btn-primary" style="margin-top: 15px;">
        ${currentQuestionIndex + 1 >= questions.length ? "Lihat Hasil Kuis" : "Pertanyaan Selanjutnya"}
      </button>
    `;

    quizContainer.querySelector(".quiz-card").appendChild(feedbackDiv);

    document.getElementById("btn-next-question").addEventListener("click", () => {
      currentQuestionIndex++;
      renderQuestion();
    });
  }

  function endQuiz() {
    clearInterval(timerInterval);
    
    // Simpan nilai kuis ke dashboard
    saveQuizScore(score);

    let emoji = "🥉";
    let statusMsg = "Coba pelajari lagi koleksi batik di modul AI Learning.";
    if (score >= 80) {
      emoji = "🥇";
      statusMsg = "Luar biasa! Anda adalah pakar budaya Batik Nusantara.";
    } else if (score >= 60) {
      emoji = "🥈";
      statusMsg = "Kerja bagus! Pengetahuan batik Anda cukup luas.";
    }

    quizContainer.innerHTML = `
      <div class="quiz-card glass-card text-center fade-in">
        <span class="quiz-card__trophy">${emoji}</span>
        <h2 class="quiz-card__title">Hasil Kuis Anda</h2>
        <p class="quiz-card__score" style="font-size: 42px; font-weight: bold; color: var(--gold-400); margin: 15px 0;">
          ${score} / 100
        </p>
        <p class="quiz-card__subtitle">${statusMsg}</p>
        <div class="quiz-actions-row" style="margin-top: 25px; display: flex; gap: 15px; justify-content: center;">
          <button id="btn-restart-quiz" class="btn-primary">Main Lagi</button>
          <a href="dashboard.html" class="btn-ghost">Buka Dashboard AI</a>
        </div>
      </div>
    `;

    document.getElementById("btn-restart-quiz").addEventListener("click", () => {
      renderStartScreen();
    });
  }

  function saveQuizScore(finalScore) {
    try {
      const history = JSON.parse(localStorage.getItem("dashboard_quiz_scores") || "[]");
      history.unshift({
        score: finalScore,
        date: new Date().toISOString()
      });
      localStorage.setItem("dashboard_quiz_scores", JSON.stringify(history.slice(0, 10)));

      // Update quiz selesai count
      const count = localStorage.getItem("dashboard_quiz_completed") || "0";
      localStorage.setItem("dashboard_quiz_completed", String(Number(count) + 1));

      // Simpan aktivitas log
      const logs = JSON.parse(localStorage.getItem("dashboard_activities") || "[]");
      logs.unshift({
        type: "kuis",
        time: new Date().toISOString(),
        description: `Menyelesaikan kuis AI dengan skor ${finalScore}`
      });
      localStorage.setItem("dashboard_activities", JSON.stringify(logs.slice(0, 100)));
    } catch (_) {}
  }

  return {
    init
  };
})();

window.Quiz = Quiz;
