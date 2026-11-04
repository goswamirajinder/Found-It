// Everything is stored on this phone in IndexedDB: entries, photos (as image files), named places and settings.
import {CATS, OCCASIONS, isYmd, newId} from "./data.js";

const NAME = "found-it", VERSION = 1, STORES = [["entries", "id"], ["photos", "id"], ["places", "id"], ["meta", "key"]];
let dbp = null;
export function openDb() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => { for (const [s, k] of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, {keyPath: k}); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const wrap = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export const getAll = async store => wrap((await openDb()).transaction(store).objectStore(store).getAll());
export const getOne = async (store, key) => wrap((await openDb()).transaction(store).objectStore(store).get(key));
async function write(store, fn) {
  const d = await openDb();
  return new Promise((res, rej) => {
    const t = d.transaction(store, "readwrite");
    fn(t.objectStore(store));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error("aborted"));
  });
}
export const putMany = (store, values) => write(store, s => values.forEach(v => s.put(v)));
export const put = (store, value) => putMany(store, [value]);
export const remove = (store, keys) => write(store, s => keys.forEach(k => s.delete(k)));
export const clearStore = store => write(store, s => s.clear());
export const getMeta = async (key, fallback) => { const r = await getOne("meta", key); return r ? r.value : fallback; };
export const setMeta = (key, value) => put("meta", {key, value});

/* photos: kept as Blobs, shown through object URLs cached for the page's lifetime */
const urls = new Map();
export const photoUrl = id => (id && urls.get(id)) || "";
export async function loadPhotoUrls(ids) {
  await Promise.all(ids.filter(id => id && !urls.has(id)).map(async id => {
    const r = await getOne("photos", id);
    if (r && r.blob) urls.set(id, URL.createObjectURL(r.blob));
  }));
}
export async function savePhoto(blob) {
  const id = newId();
  await put("photos", {id, blob, createdAt: new Date().toISOString()});
  urls.set(id, URL.createObjectURL(blob));
  return id;
}
export async function deletePhoto(id) {
  if (!id) return;
  await remove("photos", [id]);
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
}

/* entries are coerced on the way in, so a damaged backup can't break the screens */
export function cleanEntry(d) {
  if (!d || typeof d !== "object" || !d.id) return null;
  const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
  const num = v => typeof v === "number" && isFinite(v) ? v : null;
  const pl = d.place && typeof d.place === "object" && num(d.place.lat) !== null && num(d.place.lng) !== null
    ? {lat: d.place.lat, lng: d.place.lng, acc: num(d.place.acc) || 0, label: str(d.place.label, 60)} : null;
  return {
    id: String(d.id).slice(0, 40), kind: ["note", "buy", "todo", "box", "person"].includes(d.kind) ? d.kind : "item",
    tel: str(d.tel, 24).replace(/[^\d+]/g, "") || null, aliases: Array.isArray(d.aliases) ? d.aliases.filter(a => typeof a === "string").slice(0, 6).map(a => a.slice(0, 40)) : [],
    bought: d.bought === true, boughtAt: str(d.boughtAt, 40) || null, boxId: str(d.boxId, 12) || null, code: str(d.code, 12) || null,
    name: str(d.name, 1000) || "Untitled", room: str(d.room, 60), spot: str(d.spot, 140),
    category: CATS.some(c => c[0] === d.category) ? d.category : "other",
    occasion: OCCASIONS[d.occasion] ? d.occasion : null,
    remindOn: isYmd(d.remindOn) ? d.remindOn : null, expiry: isYmd(d.expiry) ? d.expiry : null,
    notes: str(d.notes, 500), photoId: str(d.photoId, 40) || null,
    status: d.status === "out" ? "out" : "kept",
    keptAt: str(d.keptAt, 40), outAt: str(d.outAt, 40) || null, seenAt: str(d.seenAt, 40) || null,
    history: Array.isArray(d.history) ? d.history.slice(0, 10).map(h => ({room: str(h && h.room, 60), spot: str(h && h.spot, 140), until: str(h && h.until, 40)})) : [],
    place: pl, createdAt: str(d.createdAt, 40), updatedAt: str(d.updatedAt, 40), example: d.example === true
  };
}

const toDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
export async function exportAll() {
  const [entries, places, photos, meta] = await Promise.all(["entries", "places", "photos", "meta"].map(getAll));
  return {
    app: "Found It", version: 1, exported: new Date().toISOString(), entries, places,
    settings: (meta.find(m => m.key === "settings") || {}).value || null,
    photos: await Promise.all(photos.map(async p => ({id: p.id, createdAt: p.createdAt, data: await toDataUrl(p.blob)})))
  };
}
export async function importAll(obj) {
  if (!obj || obj.app !== "Found It" || !Array.isArray(obj.entries)) throw new Error("not-a-backup");
  const photos = [];
  for (const p of obj.photos || []) {
    if (!p || !p.id || typeof p.data !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(p.data)) continue;
    photos.push({id: String(p.id).slice(0, 40), createdAt: String(p.createdAt || ""), blob: await (await fetch(p.data)).blob()});
  }
  const entries = obj.entries.map(cleanEntry).filter(Boolean);
  const places = (obj.places || []).filter(p => p && p.id && typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => ({id: String(p.id).slice(0, 40), label: String(p.label || "Place").slice(0, 60), lat: p.lat, lng: p.lng}));
  await putMany("photos", photos);
  await putMany("entries", entries);
  await putMany("places", places);
  return entries.length;
}
export async function wipeAll() {
  for (const [s] of STORES) await clearStore(s);
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
}
