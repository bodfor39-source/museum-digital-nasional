/**
 * firebase.js — Firebase Realtime Database (REST API)
 * Cross-device sync untuk Museum Digital Nasional Indonesia
 * Database: museum-digital-e9734
 * v2.0 — Preload semua data sebelum halaman aktif
 */

const FIREBASE_URL = "https://museum-digital-e9734-default-rtdb.asia-southeast1.firebasedatabase.app";

const DB = (() => {
  let online = navigator.onLine;
  window.addEventListener("online",  () => { online = true;  console.log("[Firebase] Kembali online."); });
  window.addEventListener("offline", () => { online = false; console.log("[Firebase] Offline — menggunakan cache lokal."); });

  // ─── Inti Request ───────────────────────────────────────────────
  async function req(path, method, data) {
    if (!online) return null;
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (data !== undefined) {
        // Trik Firebase: Jika array kosong, kirim {_empty:true} agar node tidak terhapus
        if (Array.isArray(data) && data.length === 0) {
          opts.body = JSON.stringify({ _empty: true });
        } else {
          opts.body = JSON.stringify(data);
        }
      }
      const r = await fetch(`${FIREBASE_URL}/${path}.json`, opts);
      if (!r.ok) { console.warn(`[Firebase] ${method} /${path} → ${r.status}`); return null; }
      return method === "DELETE" ? true : await r.json();
    } catch (e) {
      console.warn(`[Firebase] ${method} error /${path}:`, e.message);
      return null;
    }
  }

  const read   = (path)       => req(path, "GET");
  const write  = (path, data) => req(path, "PUT",    data);
  const update = (path, data) => req(path, "PATCH",  data);
  const del    = (path)       => req(path, "DELETE");

  // ─── Sync: Baca dari Firebase, simpan ke localStorage ───────────
  async function pull(fbPath, localKey, fallback = []) {
    let fbData = await read(fbPath);
    if (fbData !== null && fbData !== undefined) {
      // Jika Firebase mengembalikan objek penanda kosong, jadikan array kosong
      if (fbData._empty === true) {
        fbData = [];
      }
      // Firebase punya data → timpa localStorage
      try { localStorage.setItem(localKey, JSON.stringify(fbData)); } catch {}
      return fbData;
    }
    // Firebase kosong (benar-benar dihapus/belum ada) → push data lokal ke Firebase
    const raw = localStorage.getItem(localKey);
    if (raw) {
      try {
        const local = JSON.parse(raw);
        if (local && (Array.isArray(local) ? local.length > 0 : Object.keys(local).length > 0)) {
          await write(fbPath, local);
          return local;
        }
      } catch {}
    }
    return fallback;
  }

  // ─── Push: Simpan ke localStorage + Firebase ─────────────────────
  async function push(fbPath, localKey, data) {
    try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}
    await write(fbPath, data);
  }

  // ─── Preload: Pull semua data kritis sebelum app init ────────────
  async function preloadAll() {
    console.log("[Firebase] Memulai preload data dari cloud...");
    try {
      // Pull semua path penting secara paralel
      await Promise.allSettled([
        pull("users",            "museum_users",           []),
        pull("batik_data",       "global_batik_data",      []),
        pull("comments",         "museum_comments",        []),
        pull("quiz_leaderboard", "quiz_leaderboard",       []),
        pull("reset_requests",   "museum_reset_requests",  []),
        pull("activities",       "dashboard_activities",   []),
        pull("duels",            "museum_duels",           []),
      ]);
      console.log("[Firebase] ✅ Preload selesai — data siap dipakai.");
    } catch (e) {
      console.warn("[Firebase] Preload gagal sebagian:", e.message);
    }
  }

  // ─── Status koneksi ──────────────────────────────────────────────
  function isOnline() { return online; }

  return { read, write, update, del, pull, push, push, preloadAll, isOnline };
})();

window.DB = DB;

// ─── AUTO PRELOAD: jalankan sebelum DOMContentLoaded selesai ────────
// Simpan promise agar auth.js bisa menunggu selesai
window._dbReady = DB.preloadAll();

console.log("[Firebase] Modul dimuat. Preload dimulai. DB URL:", FIREBASE_URL);
