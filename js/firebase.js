/**
 * firebase.js — Firebase Realtime Database (REST API)
 * Cross-device sync untuk Museum Digital Nasional Indonesia
 * Database: museum-digital-e9734
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
      if (data !== undefined) opts.body = JSON.stringify(data);
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
    const fbData = await read(fbPath);
    if (fbData !== null && fbData !== undefined) {
      localStorage.setItem(localKey, JSON.stringify(fbData));
      return fbData;
    }
    // Firebase kosong → push data lokal ke Firebase
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const local = JSON.parse(raw);
      await write(fbPath, local);
      return local;
    }
    return fallback;
  }

  // ─── Push: Simpan ke localStorage + Firebase ─────────────────────
  async function push(fbPath, localKey, data) {
    try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}
    await write(fbPath, data);
  }

  // ─── Status koneksi ──────────────────────────────────────────────
  function isOnline() { return online; }

  return { read, write, update, del, pull, push, isOnline };
})();

window.DB = DB;
console.log("[Firebase] Modul dimuat. DB URL:", FIREBASE_URL);
