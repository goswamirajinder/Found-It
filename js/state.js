// App state and every change to saved data goes through here, so the screens and reminders stay in step.
import * as db from "./store.js";
import {schedule} from "./reminders.js";
import {DEFAULT_ROOMS} from "./data.js";
import {rank} from "./search.js";

export const DEFAULT_SETTINGS = {voiceLang: "en-IN", speakAnswers: true, autoSave: true, autoLocation: false, reminders: false};
export const S = {items: [], places: [], settings: {...DEFAULT_SETTINGS}, ready: false, view: {kind: "home"}, render: () => {}};
export const $ = s => document.querySelector(s);

export async function load() {
  const [entries, places, settings] = await Promise.all([db.getAll("entries"), db.getAll("places"), db.getMeta("settings", null)]);
  S.items = entries.map(db.cleanEntry).filter(Boolean);
  S.places = places;
  S.settings = {...DEFAULT_SETTINGS, ...(settings || {})};
  await db.loadPhotoUrls(S.items.map(i => i.photoId));
  S.ready = true;
  saveSchedule();
}
function saveSchedule() { db.setMeta("schedule", schedule(S.items)).catch(() => {}); }
function changed() { saveSchedule(); S.render(); }

export async function saveEntry(entry) {
  const e = db.cleanEntry(entry);
  await db.put("entries", e);
  await db.loadPhotoUrls([e.photoId]);
  const i = S.items.findIndex(x => x.id === e.id);
  S.items = i >= 0 ? S.items.map(x => x.id === e.id ? e : x) : [e, ...S.items];
  changed();
  return e;
}
export async function patchEntry(id, patch) {
  const cur = S.items.find(x => x.id === id);
  if (!cur) return null;
  return saveEntry({...cur, ...patch, updatedAt: new Date().toISOString()});
}
export async function removeEntry(it) {
  await db.remove("entries", [it.id]);
  if (it.photoId) await db.deletePhoto(it.photoId);
  S.items = S.items.filter(x => x.id !== it.id);
  changed();
}
export async function saveSettings(patch) {
  S.settings = {...S.settings, ...patch};
  await db.setMeta("settings", S.settings);
}
export async function savePlace(p) { await db.put("places", p); S.places = [...S.places.filter(x => x.id !== p.id), p]; }
export async function removePlace(id) { await db.remove("places", [id]); S.places = S.places.filter(x => x.id !== id); }
export async function reloadAll() { await load(); S.render(); }

let toastTimer = 0;
export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 3000);
}
export function showErr(sel, msg, focusSel) {
  const el = $(sel);
  el.textContent = msg;
  el.hidden = false;
  if (focusSel) $(focusSel).focus();
}

export const items = () => S.items.filter(i => i.kind === "item");
export const notes = () => S.items.filter(i => i.kind === "note");
export function roomsList() {
  const m = new Map();
  for (const i of items()) {
    const r = i.room || "Somewhere", k = r.toLowerCase();
    const e = m.get(k) || {name: r, n: 0};
    e.n++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
export const knownRooms = () => roomsList().filter(r => r.name !== "Somewhere").map(r => r.name);
export const roomChoices = () => [...new Map([...knownRooms(), ...DEFAULT_ROOMS].map(n => [n.toLowerCase(), n])).values()];
export function spotsIn(room) {
  const m = new Map();
  for (const i of items()) if (i.spot && i.room.toLowerCase() === String(room).toLowerCase()) m.set(i.spot.toLowerCase(), i.spot);
  return [...m.values()];
}
// The one item a spoken "took out the ..." or "put the ... back" means, if it is clear enough.
export function bestItem(query, filter = () => true) {
  const r = rank(query, items().filter(filter));
  if (!r.length) return null;
  const top = r[0];
  if (top.hit < top.of) return null;
  if (r[1] && r[1].hit === top.hit && r[1].score === top.score) return null;
  return top.it;
}
