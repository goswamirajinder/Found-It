// App state and every change to saved data goes through here, so the screens and reminders stay in step.
import * as db from "./store.js";
import {schedule} from "./reminders.js";
import {DEFAULT_ROOMS} from "./data.js";
import {rank} from "./search.js";
import {phrases, joinWith} from "./phrases.js";

export const DEFAULT_SETTINGS = {voiceLang: "en-IN", answerLang: "en", speakAnswers: true, speechRate: 0.85, autoSave: true, autoLocation: false, reminders: false};
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
export const P = () => phrases(S.settings.answerLang);
export const joinNames = names => joinWith(names, P().and);
// Adds things to the shopping list or the to-do list, a millisecond apart so they keep the order they were said in.
// Each thing is a name, or {name, remindOn} for a job with a day. Resolves the sentence to show or say.
export async function addToList(kind, things) {
  const list = things.map(x => (typeof x === "string" ? {name: x, remindOn: null} : x));
  for (const [i, x] of list.entries()) {
    const t = new Date(Date.now() + i).toISOString();
    await saveEntry({id: `${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 6)}`, kind, name: x.name, remindOn: x.remindOn || null,
      bought: false, keptAt: t, createdAt: t, updatedAt: t});
  }
  return P().added(kind, joinNames(list.map(x => x.name)));
}

/* people to call: saved on this phone, matched by name, nickname or family word ("mom" finds "Mummy") */
export const people = () => S.items.filter(i => i.kind === "person" && i.tel);
export function findPerson(who) {
  const q = String(who || "").replace(/^(?:the|my|mere|meri|mera)\s+/i, "").trim();
  if (!q) return null;
  const ql = q.toLowerCase();
  const exact = people().find(p => p.name.toLowerCase() === ql || p.aliases.some(a => a.toLowerCase() === ql));
  if (exact) return exact;
  const r = rank(q, people().map(p => ({...p, notes: p.aliases.join(" ")})));
  return r.length && r[0].hit === r[0].of ? people().find(p => p.id === r[0].it.id) : null;
}
export async function savePerson({name, tel, alias}) {
  const clean = String(tel || "").replace(/[^\d+]/g, "");
  const same = people().find(p => p.tel === clean || p.name.toLowerCase() === String(name).toLowerCase());
  const aliases = [...new Set([...(same ? same.aliases : []), ...(alias && alias.toLowerCase() !== String(name).toLowerCase() ? [alias] : [])])];
  const now = new Date().toISOString();
  return saveEntry(same ? {...same, name, tel: clean, aliases, updatedAt: now}
    : {id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: "person", name, tel: clean, aliases, keptAt: now, createdAt: now, updatedAt: now});
}
// "Call mom", "Mummy ko call karna", "phone the plumber": who a to-do wants you to ring.
export function callTarget(text) {
  const m = String(text || "").match(/^(?:call|phone|ring|dial)\s+(?:to\s+)?(?:the\s+|my\s+)?(.+)$/i) || String(text || "").match(/^(.+?)\s+ko\s+(?:call|phone|fone|ring)\b/i);
  return m ? m[1].replace(/\s+(?:back|now|abhi|about .*|regarding .*|for .*)$/i, "").trim() : null;
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
