// Found It service worker: keeps the app working offline and shows due reminders as phone notifications.
// Bump CACHE when you release a new version so phones pick up the new files.
const CACHE = "found-it-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/app.js", "js/data.js", "js/search.js", "js/parse.js",
  "js/store.js", "js/state.js", "js/device.js", "js/reminders.js", "js/views.js", "js/sheets.js", "js/voice-ui.js", "js/qr.js", "js/boxes.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("found-it") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// App files and fonts: answer from the cache at once and refresh it in the background.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  const nav = req.mode === "navigate";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(nav ? "./" : req, {ignoreSearch: nav});
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === "opaque")) cache.put(nav ? "./" : req, r.clone());
      return r;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (nav ? cache.match("./") : Response.error());
  })());
});

/* ---------- reminders: the app saves a schedule; this shows each due item once ---------- */
self.addEventListener("periodicsync", e => { if (e.tag === "reminders") e.waitUntil(checkReminders()); });
self.addEventListener("message", e => { if (e.data && e.data.type === "check-reminders") e.waitUntil(checkReminders()); });

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("found-it", 1);
    r.onupgradeneeded = () => { for (const [s, k] of [["entries", "id"], ["photos", "id"], ["places", "id"], ["meta", "key"]]) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, {keyPath: k}); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const getMeta = (d, key) => new Promise((res, rej) => { const q = d.transaction("meta").objectStore("meta").get(key); q.onsuccess = () => res(q.result ? q.result.value : undefined); q.onerror = () => rej(q.error); });
const setMeta = (d, key, value) => new Promise((res, rej) => { const t = d.transaction("meta", "readwrite"); t.objectStore("meta").put({key, value}); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
const day = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function checkReminders() {
  if (self.Notification && Notification.permission !== "granted") return;
  const d = await openDb();
  const [schedule, settings, notified] = await Promise.all([getMeta(d, "schedule"), getMeta(d, "settings"), getMeta(d, "notified")]);
  if (!settings || !settings.reminders || !Array.isArray(schedule)) return;
  const today = day(new Date()), oldest = day(new Date(Date.now() - 30 * 864e5)), yearAgo = day(new Date(Date.now() - 365 * 864e5));
  const sent = Object.fromEntries(Object.entries(notified || {}).filter(([, v]) => v >= yearAgo));
  const due = schedule.filter(r => r && r.key && r.date <= today && r.date >= oldest && !sent[r.key]).slice(0, 5);
  for (const r of due) {
    await self.registration.showNotification(r.title, {body: r.body, tag: r.key, icon: "icons/icon-192.png", data: {key: r.key}});
    sent[r.key] = today;
  }
  await setMeta(d, "notified", sent);
}

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const key = (e.notification.data && e.notification.data.key) || "";
  const id = key.startsWith("occ:") ? "" : key.split(":")[1] || "";
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const c of wins) {
      if ("focus" in c) { await c.focus(); if (id) c.postMessage({type: "open", id}); return; }
    }
    await self.clients.openWindow(id ? `./?open=${encodeURIComponent(id)}` : "./");
  })());
});
