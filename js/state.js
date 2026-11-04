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
// Many entries without photos (people to call) in one write.
export async function removeMany(list) {
  const ids = new Set(list.map(x => x.id));
  await db.remove("entries", [...ids]);
  S.items = S.items.filter(x => !ids.has(x.id));
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
// A person as search sees them: nicknames count as much as the name. Kept per person so search's word index is reused.
const SEARCHABLE = new WeakMap();
export function searchable(p) {
  let x = SEARCHABLE.get(p);
  if (!x) { x = {...p, name: [p.name, ...p.aliases].join(" ")}; SEARCHABLE.set(p, x); }
  return x;
}
// Everyone a name could mean, best first, and whether the best one is a sure match: an exact name or nickname,
// or every word matching as written, as a family word (mom/mummy) or as the start of a name.
// Not sure (a near spelling, or two people called Rahul) means: ask which one before dialling.
export function findPeople(who) {
  const q = String(who || "").replace(/\b(?:number|phone|mobile|contact)\b/gi, " ").replace(/\s+/g, " ").trim().replace(/^(?:the|my|mere|meri|mera)\s+/i, "");
  if (!q) return {people: [], sure: false};
  const ql = q.toLowerCase(), all = people(), byId = new Map(all.map(p => [p.id, p]));
  const exact = all.filter(p => p.name.toLowerCase() === ql || p.aliases.some(a => a.toLowerCase() === ql));
  if (exact.length) return {people: exact.slice(0, 5), sure: exact.length === 1};
  const r = rank(q, all.map(searchable)).filter(x => x.hit === x.of);
  if (!r.length) return {people: [], sure: false};
  const tie = r.length > 1 && r[1].score >= r[0].score - 0.01;
  if (!tie && r[0].score >= 2.4 * r[0].of) return {people: [byId.get(r[0].it.id)], sure: true};
  return {people: r.slice(0, 5).map(x => byId.get(x.it.id)), sure: false};
}
const telKey = tel => String(tel || "").replace(/\D/g, "").slice(-10);
// Many people at once (several picked from contacts, or a whole contacts file): one write and one redraw.
// A number that's already saved keeps its name; a different name for it becomes a nickname, so either works.
export async function savePeople(list) {
  const now = new Date().toISOString(), byTel = new Map(people().map(p => [telKey(p.tel), p])), touched = new Map();
  let added = 0, nicknamed = 0;
  list.forEach(({name, tel}, i) => {
    const nm = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40), clean = String(tel || "").replace(/[^\d+]/g, ""), k = telKey(clean);
    if (!nm || k.length < 6) return;
    const same = byTel.get(k);
    if (!same) {
      const e = {id: `p${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: "person", name: nm, tel: clean, aliases: [], keptAt: now, createdAt: now, updatedAt: now};
      byTel.set(k, e); touched.set(e.id, e); added++;
    } else if (same.name.toLowerCase() !== nm.toLowerCase() && !same.aliases.some(a => a.toLowerCase() === nm.toLowerCase()) && same.aliases.length < 6) {
      const e = {...same, aliases: [...same.aliases, nm], updatedAt: now};
      byTel.set(k, e);
      if (!touched.has(e.id)) nicknamed++;
      touched.set(e.id, e);
    }
  });
  const entries = [...touched.values()].map(db.cleanEntry).filter(Boolean);
  if (entries.length) {
    await db.putMany("entries", entries);
    const fresh = new Map(entries.map(e => [e.id, e])), had = new Set(S.items.map(x => x.id));
    S.items = [...S.items.map(x => fresh.get(x.id) || x), ...entries.filter(e => !had.has(e.id))];
    changed();
  }
  return {added, nicknamed};
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
