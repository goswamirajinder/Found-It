// What the main column shows: home, search results, one room, or all notes.
import {S, items, notes, roomsList} from "./state.js";
import {esc, icon, ago, shortDate, fmtDateTime, fmtDate, today, daysBetween, OCCASIONS, nextDate, whenText, STARTERS} from "./data.js";
import {searchItems} from "./search.js";
import {photoUrl} from "./store.js";
import {placeText} from "./device.js";

export const tapeHtml = it => `<span class="tape">${esc(it.room || "Somewhere")}${it.spot ? `<i>›</i>${esc(it.spot)}` : ""}</span>`;
const sec = (title, inner, extra = "") => `<section class="sec"><h2><span>${title}</span>${extra}</h2>${inner}</section>`;
const notice = (text, btn = "") => `<div class="notice"><p>${text}</p>${btn}</div>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function pills(it) {
  const p = [];
  if (it.example) p.push(`<span class="pill ex">Example</span>`);
  if (it.kind === "item" && it.status === "out") p.push(`<span class="pill out">Out since ${esc(shortDate(it.outAt))}</span>`);
  if (it.expiry) {
    const d = daysBetween(today(), it.expiry);
    if (d <= 60) p.push(`<span class="pill exp">${d < 0 ? "Expired" : d === 0 ? "Expires today" : `Expires in ${d} days`}</span>`);
  }
  if (it.remindOn && daysBetween(today(), it.remindOn) >= 0) p.push(`<span class="pill ex">Reminder ${esc(shortDate(it.remindOn + "T12:00"))}</span>`);
  return p.join("");
}
export function row(it, o = {}) {
  const src = photoUrl(it.photoId);
  const thumb = `<span class="thumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : icon(it.kind === "note" ? "note" : it.category)}</span>`;
  const place = it.place ? `<span>${icon("pin")} ${esc(placeText(it.place))}</span>` : "";
  if (it.kind === "note") {
    return `<button class="item note" type="button" data-open="${esc(it.id)}">${thumb}<span class="body"><span class="name">${esc(it.name)}</span>
      <span class="meta">${pills(it)}<span>${esc(fmtDateTime(it.createdAt))}</span>${place}</span></span></button>`;
  }
  return `<button class="item" type="button" data-open="${esc(it.id)}">${thumb}<span class="body"><span class="name">${esc(it.name)}</span>${o.noTape ? "" : tapeHtml(it)}
    <span class="meta">${pills(it)}<span>Put away ${esc(ago(it.keptAt))}</span>${it.place && it.place.label ? place : ""}</span></span></button>`;
}
const list = arr => `<div class="list">${arr.map(i => row(i)).join("")}</div>`;
const byNewest = (a, b) => String(b.keptAt || b.createdAt).localeCompare(String(a.keptAt || a.createdAt));

function comingGroups() {
  const t = today(), groups = [];
  for (const key of Object.keys(OCCASIONS)) {
    if (key === "date") continue;
    const d = nextDate(key, t);
    const its = items().filter(i => i.occasion === key);
    if (!d || !its.length) continue;
    const days = daysBetween(t, d);
    if (days <= 30) groups.push({title: OCCASIONS[key].label, when: whenText(key, days), days, its});
  }
  for (const i of S.items) {
    if (!i.remindOn) continue;
    const days = daysBetween(t, i.remindOn);
    if (days <= 14 && days >= -3) groups.push({title: fmtDate(i.remindOn), when: whenText("date", days), days, its: [i]});
  }
  return groups.sort((a, b) => a.days - b.days);
}

function hello() {
  return `<div class="hello">
    <h2>Never hunt for the Diwali lights again.</h2>
    <p>Save where you put things, and anything else on your mind. Each entry keeps a photo, the date and time, and, if you like, where you were.</p>
    <div class="starts">
      <button class="start" type="button" data-act="keep">${icon("plus")}<b>Put something away</b><span>Passport, medicines, Diwali lights</span></button>
      <button class="start" type="button" data-act="note">${icon("note")}<b>Note anything</b><span>A thought, a number, something you saw</span></button>
    </div>
    <p class="say">Or tap the mic and say: “I kept the passport in the steel almirah in the bedroom.”</p>
    <div class="chips">${STARTERS.map(s => `<button class="chip" type="button" data-starter="${esc(s)}">${esc(s)}</button>`).join("")}</div>
  </div>`;
}

export function viewHome() {
  const out = [];
  if (S.installEvent) out.push(notice("Install Found It on this phone. It opens like an app and works without internet.", `<button class="btn small dark" type="button" data-act="install">Install</button>`));
  else if (S.iosHint) out.push(notice("To install on iPhone: tap the Share button, then “Add to Home Screen”."));
  const ex = S.items.filter(i => i.example).length;
  if (ex) out.push(notice(`${plural(ex, "example")} show how it works.`, `<button class="btn small" type="button" data-act="clear-examples">Clear examples</button>`));
  if (S.ready && !S.items.length) out.push(hello());

  const coming = comingGroups();
  if (coming.length) out.push(sec("Coming up", `<div class="list">${coming.map(g => `<div class="soon"><h3>${esc(g.title)}<small>${esc(g.when)}</small></h3>${list(g.its)}</div>`).join("")}</div>`));
  const outs = items().filter(i => i.status === "out").sort((a, b) => String(a.outAt).localeCompare(String(b.outAt)));
  if (outs.length) out.push(sec("Taken out", `<p class="hint" style="margin:-4px 0 10px">Tap Put back the moment it goes back. That's when things get lost.</p>
    <div class="list">${outs.map(i => `<div class="outrow">${row(i)}<button class="btn dark" type="button" data-putback="${esc(i.id)}">Put back</button></div>`).join("")}</div>`));
  const exp = S.items.filter(i => i.expiry && daysBetween(today(), i.expiry) <= 60).sort((a, b) => a.expiry.localeCompare(b.expiry));
  if (exp.length) out.push(sec("Expiring soon", list(exp)));
  const ns = notes().sort(byNewest);
  if (ns.length) out.push(sec("Notes and sightings", list(ns.slice(0, 4)), ns.length > 4 ? `<button class="link" type="button" data-act="notes">See all ${ns.length}</button>` : ""));
  const recent = items().sort(byNewest).slice(0, 6);
  if (recent.length) out.push(sec("Recently put away", list(recent)));
  const rooms = roomsList();
  if (rooms.length) out.push(sec("Places", `<div class="places">${rooms.map(r => `<button class="place" type="button" data-room="${esc(r.name)}"><b>${esc(r.name)}</b><span>${plural(r.n, "thing")}</span></button>`).join("")}</div>`));
  if (S.items.length) out.push(`<p class="hint">Everything is saved only on this phone. Back it up now and then from Settings.</p>`);
  return out.join("");
}
export function viewSearch(q) {
  const res = searchItems(q, S.items);
  return sec(res.length ? plural(res.length, "match").replace("matchs", "matches") : "No matches",
    res.length ? list(res) : `<p class="empty-note">Nothing matches “${esc(q)}” yet. Try another word, or a word from a note.</p>`);
}
export function viewRoom(room) {
  const k = room.toLowerCase();
  const its = items().filter(i => (i.room || "Somewhere").toLowerCase() === k);
  const spots = new Map();
  for (const i of its) {
    const s = i.spot || "No exact spot", sk = s.toLowerCase();
    if (!spots.has(sk)) spots.set(sk, {name: s, its: []});
    spots.get(sk).its.push(i);
  }
  return `<div><button class="back btn ghost small" type="button" data-act="home">‹ Home</button><h2 class="room-h">${esc(room)}</h2>
    <p class="hint">${plural(its.length, "thing")} in ${plural(spots.size, "spot")}</p></div>
    ${[...spots.values()].map(sp => `<section class="sec"><span class="tape">${esc(sp.name)}</span><div class="list" style="margin-top:8px">${sp.its.map(i => row(i, {noTape: true})).join("")}</div></section>`).join("")}`;
}
export function viewNotes() {
  const ns = notes().sort(byNewest);
  return `<div><button class="back btn ghost small" type="button" data-act="home">‹ Home</button><h2 class="room-h">Notes and sightings</h2>
    <p class="hint">${plural(ns.length, "note")}</p></div>${list(ns)}`;
}
