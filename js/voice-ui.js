// The voice sheet: listen, work out what was meant, then answer, or save after a short countdown.
import {S, $, saveEntry, patchEntry, knownRooms, bestItem} from "./state.js";
import {esc, cap, newId, ago, fmtDateTime, fmtDate} from "./data.js";
import {parseCommand, parseWhen} from "./parse.js";
import {searchItems, guessCategory, guessOccasion} from "./search.js";
import {canListen, listen, voiceError, speak, stopSpeaking, locate, nearest} from "./device.js";
import {row, tapeHtml} from "./views.js";
import {openCapture, openItem, finishMove} from "./sheets.js";

let rec = null, P = null;
const result = html => { $("#voice-result").innerHTML = html; };
const state = text => { $("#voice-state").textContent = text; };
const say = text => { if (S.settings.speakAnswers) speak(text, S.settings.voiceLang); };
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

export function handle(text) {
  const cmd = parseCommand(text, knownRooms());
  $("#heard").textContent = `“${text}”`;
  state("Tap the mic to say something else.");
  if (cmd.intent === "find") return showFind(cmd.query || text);
  if (cmd.intent === "keep") return confirmKeep(cmd.parsed);
  if (cmd.intent === "out") return confirmOut(cmd.query);
  if (cmd.intent === "back") return confirmBack(cmd);
  if (cmd.intent === "note") return confirmNote(cmd);
  result(`<p class="answer">Say what you put where, ask where something is, or say “note” and anything else.</p>`);
}

function showFind(q) {
  const res = searchItems(q, S.items).slice(0, 5);
  if (!res.length) { const a = `I couldn't find anything for “${q}”.`; result(`<p class="answer">${esc(a)}</p>`); say(a); return; }
  const top = res[0];
  const a = top.kind === "note"
    ? `Your note from ${fmtDateTime(top.createdAt)}: ${top.name}`
    : `${top.name} is in ${whereText(top)}.${top.status === "out" ? ` It was taken out ${ago(top.outAt)}.` : ""}`;
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
    edit: () => openCapture("note", {text, remindOn})
  });
}
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

function pending({html, label, run, edit}) {
  clearPending();
  const secs = S.settings.autoSave ? 4 : 0;
  result(`<div class="pending"><p>${html}</p>${secs ? `<div class="bar"><i style="--t:${secs}s"></i></div><p class="hint">Saving in ${secs} seconds…</p>` : ""}
    <div class="row"><button class="btn primary" type="button" data-v="save">${esc(label)}</button><button class="btn" type="button" data-v="edit">Edit first</button><button class="btn ghost" type="button" data-v="cancel">Cancel</button></div></div>`);
  P = {run, edit, timer: secs ? setTimeout(commit, secs * 1000) : 0};
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
  $("#voice-result").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) { $("#voice-dlg").close(); openItem(b.dataset.open); return; }
    const v = b.dataset.v;
    if (v === "save") commit();
    else if (v === "cancel") { clearPending(); result(`<p class="answer">Cancelled. Nothing was saved.</p>`); }
    else if (v === "edit" && P) { const ed = P.edit; clearPending(); $("#voice-dlg").close(); ed(); }
  });
  // Closing the sheet mid-countdown keeps what was said rather than dropping it.
  $("#voice-dlg").addEventListener("close", () => { stop(); stopSpeaking(); if (P && P.timer) commit(); else clearPending(); });
}
