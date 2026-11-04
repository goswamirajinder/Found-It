// The voice sheet: listen, work out what was meant, then answer, or save after a short countdown.
import {S, $, toast, saveEntry, patchEntry, knownRooms, bestItem, addToList, joinNames} from "./state.js";
import {esc, cap, newId, ago, fmtDate, daysBetween, today} from "./data.js";
import {parseCommand, parseWhen, buyItems, splitItems, todoItems} from "./parse.js";
import {searchItems, rank, guessCategory, guessOccasion} from "./search.js";
import {canListen, listen, voiceError, speak, stopSpeaking, locate, nearest} from "./device.js";
import {row, tapeHtml, dayOf, LISTS, listItems} from "./views.js";
import {openCapture, openItem, finishMove} from "./sheets.js";

let rec = null, P = null;
const result = html => { $("#voice-result").innerHTML = html; };
const state = text => { $("#voice-state").textContent = text; };
const talk = text => speak(text, S.settings.voiceLang, S.settings.speechRate);
const say = text => { if (S.settings.speakAnswers) talk(text); };
const whereText = it => `${it.room || "somewhere"}${it.spot ? ", " + it.spot : ""}`;

export function openVoice(autoStart = true) {
  clearPending();
  $("#heard").textContent = "";
  result("");
  $("#v-text").value = "";
  if (!$("#voice-dlg").open) $("#voice-dlg").showModal();
  if (canListen && autoStart) start();
  else if (!canListen) { state("This browser can't listen. Type below, or use the mic on your keyboard."); $("#v-text").focus(); }
  else state("Tap the mic and speak.");
}
function start() {
  stopSpeaking();
  clearPending();
  if (rec) rec.cancel();
  result("");
  $("#heard").textContent = "";
  $("#listen").classList.add("on");
  state("Listening…");
  rec = listen({
    lang: S.settings.voiceLang,
    onText: t => { $("#heard").textContent = t; },
    onDone: t => { rec = null; $("#listen").classList.remove("on"); if (t) handle(t); else state("I didn't catch that. Tap the mic to try again."); },
    onError: code => { rec = null; $("#listen").classList.remove("on"); state(voiceError(code)); }
  });
}
function stop() { if (rec) { rec.cancel(); rec = null; } $("#listen").classList.remove("on"); }

let lastText = "";
export function handle(text) {
  lastText = text;
  const cmd = parseCommand(text, knownRooms());
  $("#heard").textContent = `“${text}”`;
  state("Tap the mic to say something else.");
  if (cmd.intent === "find") return showFind(cmd.query || text);
  if (cmd.intent === "keep") return confirmKeep(cmd.parsed);
  if (cmd.intent === "out") return confirmOut(cmd.query);
  if (cmd.intent === "back") return confirmBack(cmd);
  if (cmd.intent === "note") return confirmNote(cmd);
  if (cmd.intent === "buy") return confirmBuy(cmd.items);
  if (cmd.intent === "bought") return confirmBought(cmd.query);
  if (cmd.intent === "list") return readList("buy", true);
  if (cmd.intent === "todo") return confirmTodo(cmd.items);
  if (cmd.intent === "todo-list") return readList("todo", true);
  if (cmd.intent === "done") return confirmTick("todo", cmd.query);
  if (cmd.intent === "help") {
    const a = "I can read out your shopping list or to-do list, or find where something is. Try “read my to-do list” or “where is my passport”.";
    result(`<p class="answer">${esc(a)}</p>`);
    say(a);
    return;
  }
  result(`<p class="answer">Say what you put where, ask where something is, or say “note” and anything else.</p>`);
}

function showFind(q) {
  const res = searchItems(q, S.items).slice(0, 5);
  if (!res.length) { const a = `I couldn't find anything for “${q}”.`; result(`<p class="answer">${esc(a)}</p>`); say(a); return; }
  const top = res[0];
  const a = top.kind === "note" ? `Your note from ${dayOf(top.keptAt || top.createdAt)}: ${top.name}`
    : top.kind === "buy" ? (top.bought ? `You bought ${top.name} on ${dayOf(top.boughtAt)}.` : `${top.name} is on your shopping list.`)
    : top.kind === "todo" ? (top.bought ? `You ticked off “${top.name}” on ${dayOf(top.boughtAt)}.` : `“${top.name}” is on your to-do list${top.remindOn ? `, ${dueWords(top.remindOn)}` : ""}.`)
    : top.kind === "box" ? `Box ${top.code}, ${top.name}, is in ${whereText(top)}.`
    : `${top.name} is in ${whereText(top)}, kept on ${dayOf(top.keptAt)}.${top.status === "out" ? ` It was taken out ${ago(top.outAt)}.` : ""}`;
  result(`<p class="answer">${esc(a)}</p><div class="list">${res.map(i => row(i)).join("")}</div>`);
  say(a);
}

async function hereNow() {
  if (!S.settings.autoLocation) return null;
  try {
    const p = await Promise.race([locate(), new Promise((_, rej) => setTimeout(() => rej({code: 3}), 6000))]);
    const n = nearest(S.places, p);
    return {...p, label: n ? n.label : ""};
  } catch (e) { return null; }
}
function confirmKeep(p) {
  const it = {name: p.name, room: p.room, spot: p.spot};
  pending({
    html: `Save <b>${esc(p.name)}</b> ${tapeHtml(it)}`,
    label: "Save",
    run: async () => {
      const now = new Date().toISOString();
      await saveEntry({id: newId(), kind: "item", name: p.name, room: p.room, spot: p.spot, category: guessCategory(p.name), occasion: guessOccasion(p.name),
        status: "kept", history: [], photoId: null, keptAt: now, createdAt: now, updatedAt: now, place: await hereNow()});
      return `Saved. ${p.name}: ${whereText(p)}.`;
    },
    edit: () => openCapture("item", {name: p.name, room: p.room, spot: p.spot})
  });
}
function confirmNote(cmd) {
  const w = parseWhen(cmd.text);
  const remindOn = w.date || (cmd.remind ? w.tomorrow : null);
  const text = cap(w.date ? w.rest : cmd.text);
  pending({
    html: `Note: <b>${esc(text)}</b>${remindOn ? `<br>Reminder on ${esc(fmtDate(remindOn))}` : ""}`,
    label: "Save note",
    run: async () => {
      const now = new Date().toISOString();
      await saveEntry({id: newId(), kind: "note", name: text, remindOn, photoId: null, keptAt: now, createdAt: now, updatedAt: now, place: await hereNow()});
      return remindOn ? `Noted. I'll remind you on ${fmtDate(remindOn)}.` : "Noted.";
    },
    edit: () => openCapture("note", {text, remindOn}),
    alts: [{label: "Add to To buy instead", run: () => addToList("buy", thingsToBuy(text))}, {label: "Add to To do instead", run: () => addToList("todo", thingsToDo(text))}]
  });
}

const dueWords = d => { const n = daysBetween(today(), d); return n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : `on ${fmtDate(d)}`; };
// "You have 3 things to buy: atta, bulbs and milk." Used by voice and by each list's Read aloud button.
// `spoken` numbers each one and ends it with a full stop, so the voice pauses between them.
export function listText(kind) {
  const {open} = listItems(kind), L = LISTS[kind];
  if (!open.length) return {open, text: `Your ${L.listName} is empty.`, spoken: `Your ${L.listName} is empty.`};
  const count = `You have ${open.length} thing${open.length === 1 ? "" : "s"} ${kind === "todo" ? "to do" : "to buy"}`;
  const one = i => (i.remindOn ? `${i.name}, ${dueWords(i.remindOn)}` : i.name);
  return {open, text: `${count}: ${joinNames(open.map(one))}.`, spoken: `${count}. ${open.map((i, k) => `${k + 1}. ${one(i)}.`).join(" ")}`};
}
export const readListAloud = (kind = "buy") => talk(listText(kind).spoken);
// Someone who asks to hear a list gets it read out even when spoken answers are off.
function readList(kind, speakIt) {
  const {open, text, spoken} = listText(kind), L = LISTS[kind];
  result(`<p class="answer">${esc(text)}</p>${open.length ? `<div class="buy-list">${open.map(i => `<div class="buy-row">
    <button class="tick" type="button" data-vtick="${esc(i.id)}" data-list="${kind}" aria-pressed="false" aria-label="${L.tickOn}: ${esc(i.name)}"></button>
    <span class="buy-name">${esc(i.name)}</span><span></span></div>`).join("")}</div><p class="hint">Tap a circle when it's ${kind === "todo" ? "done" : "bought"}.</p>` : ""}`);
  if (speakIt) talk(spoken);
}
const cleanEnd = t => String(t || "").replace(/[\s.!?।]+$/, "");
// Everything said into a list belongs on it: for shopping keep the things, for to-dos keep each job and its day.
export const thingsToBuy = t => { const s = cleanEnd(t); return buyItems(s) || splitItems(s); };
export const thingsToDo = t => todoItems(cleanEnd(t), true) || [];
// The mic inside a list: everything said there goes on that list, so nothing ends up in notes.
export function listenForList(kind, btn) {
  if (!canListen) return;
  stopSpeaking();
  btn.classList.add("on");
  const input = $(`#${kind}-input`), ph = input ? input.placeholder : "";
  if (input) input.placeholder = "Listening…";
  listen({
    lang: S.settings.voiceLang,
    onText: t => { const i = $(`#${kind}-input`); if (i) i.value = t; },
    onDone: async t => {
      btn.classList.remove("on");
      const things = kind === "todo" ? thingsToDo(t) : thingsToBuy(t);
      if (!things.length) { toast("I didn't catch that. Tap the mic and try again."); return; }
      const msg = await addToList(kind, things);
      toast(msg);
      talk(msg);
    },
    onError: code => { btn.classList.remove("on"); toast(voiceError(code)); const i = $(`#${kind}-input`); if (i) i.placeholder = ph; }
  });
}
function confirmBuy(names) {
  pending({
    html: `Add to your shopping list: <b>${esc(names.join(", "))}</b>`, label: "Add",
    run: () => addToList("buy", names),
    edit: () => { $("#voice-dlg").close(); const i = $("#buy-input"); if (i) { i.value = names.join(", "); i.focus(); } }
  });
}
function confirmTodo(todos) {
  pending({
    html: `Add to your to-do list: <b>${esc(todos.map(x => (x.remindOn ? `${x.name} (${dueWords(x.remindOn)})` : x.name)).join(", "))}</b>`, label: "Add",
    run: () => addToList("todo", todos),
    edit: () => { $("#voice-dlg").close(); const i = $("#todo-input"); if (i) { i.value = todos.map(x => x.name).join(", "); i.focus(); } }
  });
}
// Ticking off by voice: "I bought the batteries", "electricity bill done". If nothing on the list matches, it's a note after all.
function confirmTick(kind, q) {
  const r = rank(q, S.items.filter(i => i.kind === kind && !i.bought));
  const it = r.length && r[0].hit >= Math.ceil(r[0].of * 0.6) ? r[0].it : null;
  if (!it) return confirmNote({text: cap(lastText)});
  pending({
    html: `Tick off <b>${esc(it.name)}</b> as ${kind === "todo" ? "done" : "bought"}?`, label: kind === "todo" ? "Yes, done" : "Yes, bought",
    run: async () => {
      await patchEntry(it.id, {bought: true, boughtAt: new Date().toISOString()});
      return kind === "todo" ? `Ticked off ${it.name}.` : `Ticked off ${it.name}. When you put it away, tap Put away next to it.`;
    },
    edit: () => openItem(it.id)
  });
}
const confirmBought = q => confirmTick("buy", q);
function pickList(q, msg) {
  const res = searchItems(q, S.items.filter(i => i.kind === "item")).slice(0, 5);
  result(`<p class="answer">${esc(res.length ? msg : `I couldn't find “${q}”.`)}</p><div class="list">${res.map(i => row(i)).join("")}</div>`);
  say(res.length ? msg : `I couldn't find ${q}.`);
}
function confirmOut(q) {
  const it = bestItem(q, i => i.status !== "out");
  if (!it) return pickList(q, "Which one? Tap it, then choose Taking it out.");
  pending({
    html: `Mark <b>${esc(it.name)}</b> as taken out?`, label: "Yes, taken out",
    run: async () => { await patchEntry(it.id, {status: "out", outAt: new Date().toISOString()}); return `Okay. Tell me when the ${it.name} goes back.`; },
    edit: () => openItem(it.id)
  });
}
function confirmBack(cmd) {
  const it = bestItem(cmd.query, i => i.status === "out") || bestItem(cmd.query);
  if (!it) return pickList(cmd.query, "Which one? Tap it, then choose Put it back.");
  const to = cmd.where && cmd.where.where ? {room: cmd.where.room || it.room, spot: cmd.where.spot} : {room: it.room, spot: it.spot};
  pending({
    html: `Put <b>${esc(it.name)}</b> back: ${tapeHtml(to)}`, label: "Save",
    run: async () => {
      const changed = await finishMove(it, to.room || "", to.spot || "");
      return changed ? `Updated. ${it.name}: ${whereText(to)}.` : `Great, the ${it.name} is back in its place.`;
    },
    edit: () => openItem(it.id)
  });
}

function pending({html, label, run, edit, alts = []}) {
  clearPending();
  const secs = S.settings.autoSave ? 4 : 0;
  result(`<div class="pending"><p>${html}</p>${secs ? `<div class="bar"><i style="--t:${secs}s"></i></div><p class="hint">Saving in ${secs} seconds…</p>` : ""}
    <div class="row"><button class="btn primary" type="button" data-v="save">${esc(label)}</button>${alts.map((a, i) => `<button class="btn dark" type="button" data-v="alt" data-i="${i}">${esc(a.label)}</button>`).join("")}<button class="btn" type="button" data-v="edit">Edit first</button><button class="btn ghost" type="button" data-v="cancel">Cancel</button></div></div>`);
  P = {run, edit, alts, timer: secs ? setTimeout(commit, secs * 1000) : 0};
}
function clearPending() { if (P && P.timer) clearTimeout(P.timer); P = null; }
async function commit() {
  const p = P;
  clearPending();
  if (!p) return;
  try { const msg = await p.run(); result(`<p class="answer">${esc(msg)}</p>`); say(msg); }
  catch (e) { result(`<p class="err">Couldn't save that. Try again.</p>`); }
}

export function wireVoice() {
  $("#voice-mic").addEventListener("click", () => { if (!canListen) { $("#v-text").focus(); return; } if (rec) { rec.stop(); } else start(); });
  $("#voice-form").addEventListener("submit", e => { e.preventDefault(); const t = $("#v-text").value.trim(); if (!t) return; stop(); $("#v-text").value = ""; handle(t); });
  $("#voice-result").addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) { $("#voice-dlg").close(); openItem(b.dataset.open); return; }
    if (b.dataset.box) { $("#voice-dlg").close(); S.openBox(b.dataset.box); return; }
    if (b.dataset.vtick) { await patchEntry(b.dataset.vtick, {bought: true, boughtAt: new Date().toISOString()}); readList(b.dataset.list, false); return; }
    const v = b.dataset.v;
    if (v === "save") commit();
    else if (v === "cancel") { clearPending(); result(`<p class="answer">Cancelled. Nothing was saved.</p>`); }
    else if (v === "alt" && P && P.alts[b.dataset.i]) { const a = P.alts[b.dataset.i]; clearPending(); const msg = await a.run(); result(`<p class="answer">${esc(msg)}</p>`); say(msg); }
    else if (v === "edit" && P) { const ed = P.edit; clearPending(); $("#voice-dlg").close(); ed(); }
  });
  // Closing the sheet mid-countdown keeps what was said rather than dropping it.
  $("#voice-dlg").addEventListener("close", () => { stop(); stopSpeaking(); if (P && P.timer) commit(); else clearPending(); });
}
