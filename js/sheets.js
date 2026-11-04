// The bottom sheets: save something (put away, or General info), one entry up close, and moved / put back.
import {S, $, toast, showErr, saveEntry, patchEntry, removeEntry, knownRooms, roomChoices, spotsIn, addToList, callTarget} from "./state.js";
import {callFromText} from "./people.js";
import {OCCASIONS, CATS, catLabel, esc, cap, isYmd, newId, nextDate, fmtDate, fmtDateTime, ymd, addDays, daysBetween, today, ago} from "./data.js";
import {guessCategory, guessOccasion} from "./search.js";
import {parseLine, buyItems, splitItems, todoItems} from "./parse.js";
import {savePhoto, deletePhoto, photoUrl} from "./store.js";
import {canLocate, locate, nearest, mapsUrl, placeText, locError} from "./device.js";

/* ---------- shared pickers ---------- */
export function drawRoomChips(sel, inputSel) {
  const cur = $(inputSel).value.trim().toLowerCase();
  $(sel).innerHTML = roomChoices().slice(0, 9).map(n => `<button type="button" class="chip" data-pick-room="${esc(n)}" aria-pressed="${n.toLowerCase() === cur}">${esc(n)}</button>`).join("");
}
export const fillSpots = (roomSel, dlSel) => { $(dlSel).innerHTML = spotsIn($(roomSel).value.trim()).map(s => `<option value="${esc(s)}"></option>`).join(""); };
export const fillRoomsDl = () => { $("#dl-rooms").innerHTML = roomChoices().map(n => `<option value="${esc(n)}"></option>`).join(""); };

/* ---------- save something ---------- */
const F = {mode: "item", editing: null, blob: null, previewUrl: "", removePhoto: false, touched: {}, cat: "other", occ: null, catTouched: false, occTouched: false, pos: null, posP: null, boxId: null, replaces: null};
const currentBox = () => (F.mode === "item" && F.boxId ? S.items.find(i => i.kind === "box" && i.code === F.boxId) || null : null);
// Putting something into a box: the box says where it is, so the room and spot fields step aside.
function syncBox() {
  const box = currentBox();
  $("#box-bar").hidden = !box;
  if (F.mode === "item") $("#where-field").hidden = !!box;
  if (box) {
    $("#box-bar-name").textContent = `${box.code}: ${box.name}`;
    $("#box-bar-where").innerHTML = `${esc(box.room || "Somewhere")}${box.spot ? `<i>›</i>${esc(box.spot)}` : ""}`;
  }
}

function setMode(mode) {
  F.mode = mode;
  $("#mode-item").setAttribute("aria-selected", mode === "item");
  $("#mode-note").setAttribute("aria-selected", mode === "note");
  document.querySelectorAll("#cap-dlg [data-for]").forEach(el => { el.hidden = el.dataset.for !== mode; });
  $("#cap-title").textContent = F.editing ? "Edit" : mode === "item" ? "Put something away" : "General info";
  $("#photo-hint").textContent = mode === "item" ? "A picture of the shelf or box beats any description." : "Something you saw, a label, a visiting card, a parking sign.";
  $("#date-lbl").textContent = mode === "item" ? "Date you kept it" : "Date";
  syncRemind();
  syncBox();
}
function syncRemind() { $("#remind-field").hidden = !(F.mode === "note" || F.occ === "date"); }
function drawOccChips() {
  const keys = ["diwali", "holi", "christmas", "winter", "summer", "monsoon", "date"];
  $("#occ-chips").innerHTML = keys.map(k => `<button type="button" class="chip" data-occ="${k}" aria-pressed="${F.occ === k}">${esc(OCCASIONS[k].label)}</button>`).join("")
    + `<button type="button" class="chip" data-occ="" aria-pressed="${!F.occ}">Not sure</button>`;
  const d = F.occ && F.occ !== "date" ? nextDate(F.occ) : null;
  $("#occ-note").textContent = F.occ === "date" ? "Pick the day below. It shows up on the home screen before then."
    : d ? `It shows up on the home screen in the weeks before ${OCCASIONS[F.occ].label} (${fmtDate(d)}).`
    : "Pick one and it shows up on the home screen when the time comes.";
  syncRemind();
}
const drawCatChips = () => { $("#cat-chips").innerHTML = CATS.map(([id, label]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${F.cat === id}">${esc(label)}</button>`).join(""); };
function autoGuess() {
  const n = $("#f-name").value;
  if (!F.catTouched) { F.cat = guessCategory(n); drawCatChips(); }
  if (!F.occTouched) { F.occ = guessOccasion(n); drawOccChips(); }
  if (F.cat === "medicine" || F.cat === "documents") $("#more").open = true;
}
function showPhoto(src) {
  const img = $("#photo-prev");
  img.hidden = !src;
  if (src) img.src = src; else img.removeAttribute("src");
  $("#photo-pick").hidden = !!src;
  $("#photo-actions").hidden = !src;
  $("#photo-box").classList.toggle("has", !!src);
}
function locStatus(text) { $("#loc-status").textContent = text; }
function startLocate() {
  F.pos = null;
  locStatus("Finding where you are…");
  F.posP = locate().then(p => {
    const named = nearest(S.places, p);
    F.pos = {...p, label: named ? named.label : ""};
    locStatus(named ? `Here: ${named.label}` : `Here: ${placeText(F.pos)} (within ${p.acc} m). Name places like Home in Settings.`);
    return F.pos;
  }).catch(e => { F.pos = null; locStatus(locError(e)); return null; });
}

export function openCapture(mode = "item", pre = {}, editing = null) {
  Object.assign(F, {editing, blob: null, removePhoto: false, touched: {}, catTouched: !!editing, occTouched: !!editing, pos: null, posP: null,
    boxId: pre.boxId || (editing && editing.boxId) || null, replaces: pre.replaces || null});
  if (F.previewUrl) { URL.revokeObjectURL(F.previewUrl); F.previewUrl = ""; }
  const e = editing || {};
  $("#cap-mode").hidden = !!editing;
  $("#f-quick").value = "";
  $("#quick-got").textContent = "";
  $("#f-text").value = editing && editing.kind === "note" ? e.name : (pre.text || "");
  $("#f-name").value = editing && editing.kind === "item" ? e.name : (pre.name || "");
  $("#f-room").value = e.room || pre.room || "";
  $("#f-spot").value = e.spot || pre.spot || "";
  $("#f-expiry").value = e.expiry || "";
  $("#f-notes").value = e.notes || "";
  $("#f-remind").value = e.remindOn || pre.remindOn || "";
  F.cat = editing ? e.category : guessCategory($("#f-name").value);
  F.occ = editing ? e.occasion : guessOccasion($("#f-name").value);
  $("#more").open = !!(e.expiry || e.notes) || F.cat === "medicine" || F.cat === "documents";
  $("#cap-err").hidden = true;
  showPhoto(editing ? photoUrl(e.photoId) : "");
  fillRoomsDl();
  drawRoomChips("#room-chips", "#f-room");
  fillSpots("#f-room", "#dl-spots");
  drawOccChips();
  drawCatChips();
  setMode(editing ? editing.kind : mode);
  $("#f-date").max = today();
  $("#f-date").value = e.keptAt ? ymd(new Date(e.keptAt)) : today();
  const loc = $("#f-loc");
  loc.closest(".toggle").hidden = !canLocate;
  loc.checked = !editing && canLocate && S.settings.autoLocation;
  locStatus(editing && e.place ? `Location saved: ${placeText(e.place)}. Switch on to replace it with where you are now.` : "");
  if (loc.checked) startLocate();
  if (pre.quick) { $("#f-quick").value = pre.quick; onQuick(); }
  $("#cap-dlg").showModal();
  $("#cap-dlg .sh-body").scrollTop = 0;
  if (matchMedia("(pointer: fine)").matches) (F.mode === "note" ? $("#f-text") : pre.name ? $("#f-room") : $("#f-quick")).focus();
}
function onQuick() {
  const p = parseLine($("#f-quick").value, knownRooms());
  if (!p) { $("#quick-got").textContent = ""; return; }
  if (!F.touched.name) $("#f-name").value = p.name;
  if (!F.touched.room) $("#f-room").value = p.room;
  if (!F.touched.spot) $("#f-spot").value = p.spot;
  autoGuess();
  drawRoomChips("#room-chips", "#f-room");
  fillSpots("#f-room", "#dl-spots");
  const room = $("#f-room").value, spot = $("#f-spot").value;
  $("#quick-got").innerHTML = room || spot
    ? `Got it: <b>${esc($("#f-name").value)}</b> <span class="tape">${esc(room || "Somewhere")}${spot ? `<i>›</i>${esc(spot)}` : ""}</span>`
    : `Got it: <b>${esc($("#f-name").value)}</b>. Now say where, like “in the kitchen drawer”.`;
}
async function downscale(file, max, q) {
  let src;
  try { src = await createImageBitmap(file, {imageOrientation: "from-image"}); }
  catch (e) { src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, "image/jpeg", q));
}
async function placeForSave() {
  if (!$("#f-loc").checked) return F.editing ? F.editing.place : null;
  if (F.posP) await Promise.race([F.posP, new Promise(r => setTimeout(r, 6000))]);
  return F.pos || (F.editing ? F.editing.place : null);
}
async function saveCapture(ev) {
  ev.preventDefault();
  const btn = $("#cap-save"), now = new Date().toISOString(), ed = F.editing;
  let body;
  if (F.mode === "note") {
    const text = $("#f-text").value.trim();
    if (!text && !F.blob && !(ed && ed.photoId && !F.removePhoto)) return showErr("#cap-err", "Write something or add a photo.", "#f-text");
    body = {kind: "note", name: text || "Photo", remindOn: isYmd($("#f-remind").value) ? $("#f-remind").value : null};
  } else {
    const box = currentBox(), name = $("#f-name").value.trim();
    const room = box ? box.room : cap($("#f-room").value.trim());
    const spot = box ? (box.spot ? `${box.name}, ${box.spot}` : box.name) : cap($("#f-spot").value.trim());
    if (!name) return showErr("#cap-err", "Add what it is, like “Diwali lights”.", "#f-name");
    if (!room && !spot) return showErr("#cap-err", "Add where you're putting it: a room, a spot, or both.", "#f-room");
    if (F.occ === "date" && !isYmd($("#f-remind").value)) return showErr("#cap-err", "Pick the date you'll want it.", "#f-remind");
    body = {kind: "item", name, room, spot, boxId: box ? box.code : null, category: F.cat, occasion: F.occ || null, remindOn: F.occ === "date" ? $("#f-remind").value : null,
      expiry: isYmd($("#f-expiry").value) ? $("#f-expiry").value : null, notes: $("#f-notes").value.trim()};
  }
  // The date the person picked; today keeps the real time, an earlier day is stored at midday.
  const day = isYmd($("#f-date").value) && $("#f-date").value <= today() ? $("#f-date").value : today();
  body.keptAt = ed && ed.keptAt && ymd(new Date(ed.keptAt)) === day ? ed.keptAt : day === today() ? now : new Date(`${day}T12:00:00`).toISOString();
  $("#cap-err").hidden = true;
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    body.place = await placeForSave();
    if (F.blob) body.photoId = await savePhoto(F.blob);
    else if (F.removePhoto) body.photoId = null;
    if (ed) {
      await saveEntry({...ed, ...body, updatedAt: now});
      if ((F.blob || F.removePhoto) && ed.photoId) await deletePhoto(ed.photoId);
      toast("Saved");
    } else {
      await saveEntry({id: newId(), status: "kept", history: [], photoId: null, keptAt: now, createdAt: now, updatedAt: now, ...body});
      if (F.replaces) { const b = S.items.find(i => i.id === F.replaces); if (b) await removeEntry(b); }
      toast(body.kind === "note" ? "Saved in General info" : `Saved: ${body.name} → ${body.room || "Somewhere"}${body.spot ? " › " + body.spot : ""}`);
    }
    $("#cap-dlg").close();
    if (body.boxId && S.openBox) S.openBox(body.boxId);
  } catch (err) {
    showErr("#cap-err", err && err.name === "QuotaExceededError" ? "This phone is out of space for the app. Delete some photos or entries." : "Couldn't save. Try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save";
  }
}

/* ---------- one entry up close ---------- */
let openId = null, openSig = "";
const sigOf = it => JSON.stringify(it);
export function openItem(id) {
  const it = S.items.find(i => i.id === id);
  if (!it) return;
  openId = id;
  openSig = sigOf(it);
  drawItem(it);
  if (!$("#item-dlg").open) $("#item-dlg").showModal();
  $("#item-body").scrollTop = 0;
}
export function refreshOpenItem() {
  if (!$("#item-dlg").open || !openId) return;
  const it = S.items.find(i => i.id === openId);
  if (!it) { $("#item-dlg").close(); return; }
  if (sigOf(it) !== openSig) { openSig = sigOf(it); drawItem(it); }
}
function calLink(it) {
  const o = OCCASIONS[it.occasion];
  let start, label;
  if (it.remindOn) {
    if (daysBetween(today(), it.remindOn) < 0) return "";
    start = it.remindOn; label = `on ${fmtDate(start)}`;
  } else if (o && it.occasion !== "date") {
    let d = nextDate(it.occasion);
    if (d && daysBetween(today(), d) < 8) d = nextDate(it.occasion, addDays(d, o.after + 1));
    if (!d) return "";
    start = addDays(d, -7); label = `on ${fmtDate(start)}, a week before ${o.label}`;
  } else return "";
  const what = it.kind === "note" ? it.name : `${it.name} is in ${it.room || "Somewhere"}${it.spot ? " › " + it.spot : ""}.`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(it.kind === "note" ? it.name.slice(0, 80) : "Find: " + it.name)}&dates=${start.replace(/-/g, "")}/${addDays(start, 1).replace(/-/g, "")}&details=${encodeURIComponent(what + " (Saved in Found It)")}`;
  return `<a class="cal" href="${esc(url)}" target="_blank" rel="noopener">Add a reminder ${esc(label)} to Google Calendar</a>`;
}
function drawItem(it) {
  // Shopping and to-do lines share one layout; `buy` covers both, `todo` picks the words.
  const note = it.kind === "note", todo = it.kind === "todo", buy = it.kind === "buy" || todo, src = photoUrl(it.photoId);
  $("#item-title").textContent = note ? "General info" : buy ? (todo ? "To do" : "To buy") : it.name;
  const day = iso => (iso ? fmtDate(ymd(new Date(iso))) : "Unknown");
  const facts = [[note ? "Date" : buy ? "Added" : "Kept on", day(it.keptAt)]];
  if (buy && it.bought) facts.push([todo ? "Done" : "Bought", day(it.boughtAt)]);
  if (it.place) facts.push(["Where you were", placeText(it.place)]);
  if (it.seenAt) facts.push(["Last seen there", day(it.seenAt)]);
  if (!note && !buy) facts.push(["Kind", catLabel(it.category)]);
  if (!note && it.occasion && it.occasion !== "date") facts.push(["Needed for", OCCASIONS[it.occasion].label]);
  if (it.remindOn) facts.push(["Reminder", fmtDate(it.remindOn)]);
  if (it.expiry) facts.push(["Expires", fmtDate(it.expiry)]);
  if (it.notes) facts.push(["Notes", it.notes]);
  const hist = (it.history || []).filter(h => h.room || h.spot);
  const acts = todo ? (it.bought ? [["buy-undo", "Not done yet", ""]] : [["buy-done", "Mark as done", "primary"], ...(callTarget(it.name) ? [["call", "Call", "dark"]] : [])])
    : buy ? (it.bought ? [["buy-put", "Put it away", "primary"], ["buy-undo", "Not bought yet", ""]] : [["buy-done", "Mark as bought", "primary"]])
    : note ? [["to-buy", "Move to To buy", "dark"], ["to-todo", "Move to To do", "dark"], ["to-item", "Turn into Put away", ""], ["edit", "Edit", ""], ...(navigator.share ? [["share", "Share", ""]] : [])]
    : it.status === "out" ? [["putback", "Put it back", "primary"], ["edit", "Edit details", ""]]
    : [["seen", "Found it here", "dark"], ["out", "Taking it out", ""], ["moved", "It's somewhere else", ""], ["edit", "Edit details", ""]];
  // A line on a list is changed right here: fix what the phone heard, or split it into several with commas.
  const edit = !buy ? "" : `<form class="d-edit" id="d-edit" novalidate>
      <div class="field"><label for="d-name">${todo ? "What to do" : "What to buy"}</label>
        <input class="input" id="d-name" maxlength="300" autocomplete="off" enterkeyhint="done" value="${esc(it.name)}"></div>
      ${todo ? `<div class="field"><label for="d-due">Due on</label><div class="vtype"><input class="input" type="date" id="d-due" value="${esc(it.remindOn || "")}">
        <button class="btn" type="button" data-act="due-clear">No date</button></div></div>` : ""}
      <p class="hint">Commas make separate lines, like ${todo ? "“pay the bill, call the plumber”" : "“milk, bread”"}.</p>
      <p class="err" id="d-err" role="alert" hidden></p>
      <button class="btn dark" type="submit" id="d-save" disabled>Save changes</button></form>`;
  $("#item-body").innerHTML = `
    ${src ? `<img class="d-photo" src="${esc(src)}" alt="">` : ""}
    ${note ? `<p class="d-text">${esc(it.name)}</p>` : buy ? edit : `<div class="d-where"><span class="k">${it.status === "out" ? "Usually kept in" : "Kept in"}</span>
      ${it.boxId ? `<button class="btn small" type="button" data-box="${esc(it.boxId)}" style="justify-self:start">In box ${esc(it.boxId)}: open it</button>` : ""}
      <button type="button" class="tape big" data-room="${esc(it.room || "Somewhere")}" aria-label="See everything in ${esc(it.room || "this place")}">${esc(it.room || "Somewhere")}${it.spot ? `<i>›</i>${esc(it.spot)}` : ""}</button>
      ${it.status === "out" ? `<span class="pill out" style="justify-self:start">Taken out ${esc(ago(it.outAt))}</span>` : ""}</div>`}
    <div class="actions">${acts.map(([k, l, c]) => `<button class="btn ${c}" type="button" data-act="${k}">${l}</button>`).join("")}</div>
    <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    ${it.place ? `<a class="cal" href="${esc(mapsUrl(it.place))}" target="_blank" rel="noopener">Open this location in Maps</a>` : ""}
    ${calLink(it)}
    ${hist.length ? `<div class="field"><span class="lbl">Earlier places</span><ul class="hist">${hist.map(h => `<li>${esc(h.room || "Somewhere")}${h.spot ? " › " + esc(h.spot) : ""}${h.until ? ` (until ${esc(fmtDate(ymd(new Date(h.until))))})` : ""}</li>`).join("")}</ul></div>` : ""}
    <div id="d-confirm"><button class="btn ghost danger small" type="button" data-act="delete">Delete this entry</button></div>`;
}
async function onItemClick(e) {
  const b = e.target.closest("button");
  const it = S.items.find(i => i.id === openId);
  if (!b || !it) return;
  const dlg = $("#item-dlg");
  if (b.dataset.room !== undefined) { dlg.close(); S.goRoom(b.dataset.room); return; }
  if (b.dataset.box) { dlg.close(); S.openBox(b.dataset.box); return; }
  const act = b.dataset.act;
  try {
    if (act === "buy-done") { await patchEntry(it.id, {bought: true, boughtAt: new Date().toISOString()}); toast(`Ticked off: ${it.name}`); }
    else if (act === "buy-undo") await patchEntry(it.id, {bought: false, boughtAt: null});
    else if (act === "call") { dlg.close(); callFromText(it.name); }
    else if (act === "buy-put") { dlg.close(); openCapture("item", {name: it.name, replaces: it.id}); }
    // A note that was really a shopping list, a job to do, or "where I put something".
    else if (act === "to-buy" || act === "to-todo") {
      const t = it.name.replace(/[\s.!?।]+$/, "");
      const msg = act === "to-buy" ? await addToList("buy", buyItems(t) || splitItems(t)) : await addToList("todo", todoItems(t, true) || [t]);
      await removeEntry(it);
      dlg.close();
      toast(msg);
    }
    else if (act === "to-item") { dlg.close(); openCapture("item", {quick: it.name, replaces: it.id}); }
    else if (act === "seen") { await patchEntry(it.id, {seenAt: new Date().toISOString()}); toast("Noted: still there today."); }
    else if (act === "out") { await patchEntry(it.id, {status: "out", outAt: new Date().toISOString()}); dlg.close(); toast("Marked as taken out. Tap Put back when it goes back."); }
    else if (act === "putback" || act === "moved") { dlg.close(); openMove(it, act); }
    else if (act === "edit") { dlg.close(); openCapture(it.kind, {}, it); }
    else if (act === "share") { navigator.share({title: "Found It", text: it.name}).catch(() => {}); }
    else if (act === "delete") {
      $("#d-confirm").innerHTML = `<div class="confirm"><p style="margin:0">Delete “${esc(it.name.slice(0, 80))}”${it.photoId ? " and its photo" : ""}? This can't be undone.</p>
        <div class="row"><button class="btn dark" type="button" data-act="delete-yes">Delete</button><button class="btn" type="button" data-act="delete-no">Keep it</button></div></div>`;
      $("#d-confirm").scrollIntoView({block: "nearest"});
    }
    else if (act === "delete-no") drawItem(it);
    else if (act === "delete-yes") { await removeEntry(it); dlg.close(); toast("Deleted"); }
    else if (act === "due-clear") { $("#d-due").value = ""; $("#d-save").disabled = false; }
  } catch (err) { toast("Couldn't save that. Try again."); }
}
// Saving a changed list line. Commas split it into several lines, the same as when adding.
async function saveLine(e) {
  if (!e.target.closest("#d-edit")) return;
  e.preventDefault();
  const it = S.items.find(i => i.id === openId);
  if (!it) return;
  const parts = $("#d-name").value.split(/\s*[,;]\s*/).map(x => cap(x.replace(/\s+/g, " ").trim())).filter(Boolean);
  if (!parts.length) return showErr("#d-err", it.kind === "todo" ? "Type what needs doing." : "Type what to buy.", "#d-name");
  const due = $("#d-due") ? (isYmd($("#d-due").value) ? $("#d-due").value : null) : it.remindOn;
  try {
    await patchEntry(it.id, {name: parts[0], remindOn: due});
    if (parts.length > 1) await addToList(it.kind, parts.slice(1).map(name => ({name, remindOn: it.kind === "todo" ? due : null})));
    $("#item-dlg").close();
    toast(parts.length > 1 ? `Saved, and added ${parts.slice(1).join(", ")}` : "Saved");
  } catch (err) { showErr("#d-err", "Couldn't save. Try again."); }
}

/* ---------- moved it, or put it back ---------- */
const M = {it: null};
export function openMove(it, mode) {
  M.it = it;
  $("#move-title").textContent = mode === "putback" ? `Where did the ${it.name} go?` : `Where is the ${it.name} now?`;
  $("#move-same").innerHTML = mode === "putback"
    ? `<button class="btn dark" type="button" id="move-same-btn"><span>Same place as before</span><span class="tape">${esc(it.room || "Somewhere")}${it.spot ? `<i>›</i>${esc(it.spot)}` : ""}</span></button>` : "";
  $("#move-lbl").textContent = mode === "putback" ? "Or somewhere new" : "New place";
  $("#m-room").value = "";
  $("#m-spot").value = "";
  $("#move-err").hidden = true;
  fillRoomsDl();
  drawRoomChips("#move-room-chips", "#m-room");
  fillSpots("#m-room", "#dl-spots-m");
  $("#move-dlg").showModal();
}
export async function finishMove(it, room, spot) {
  const now = new Date().toISOString();
  const changed = room.toLowerCase() !== (it.room || "").toLowerCase() || spot.toLowerCase() !== (it.spot || "").toLowerCase();
  const patch = {status: "kept", outAt: null, keptAt: now, seenAt: null};
  if (changed) Object.assign(patch, {room, spot, history: [{room: it.room, spot: it.spot, until: now}, ...(it.history || [])].slice(0, 10)});
  await patchEntry(it.id, patch);
  return changed;
}
async function moveDone(room, spot) {
  const changed = await finishMove(M.it, room, spot);
  $("#move-dlg").close();
  toast(changed ? `Updated: ${M.it.name} → ${room || "Somewhere"}${spot ? " › " + spot : ""}` : `${M.it.name} is back in its place.`);
}

/* ---------- wiring ---------- */
export function wireSheets() {
  $("#cap-form").addEventListener("submit", saveCapture);
  $("#cap-mode").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
  $("#f-quick").addEventListener("input", onQuick);
  $("#f-quick").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });
  ["name", "room", "spot"].forEach(k => $("#f-" + k).addEventListener("input", () => { F.touched[k] = true; }));
  $("#f-name").addEventListener("input", autoGuess);
  $("#f-room").addEventListener("input", () => { drawRoomChips("#room-chips", "#f-room"); fillSpots("#f-room", "#dl-spots"); });
  $("#f-loc").addEventListener("change", e => { if (e.target.checked) startLocate(); else { F.pos = null; F.posP = null; locStatus(""); } });
  $("#f-photo").addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await downscale(file, 1600, .8);
      if (!blob) throw new Error("no image");
      F.blob = blob;
      F.removePhoto = false;
      if (F.previewUrl) URL.revokeObjectURL(F.previewUrl);
      F.previewUrl = URL.createObjectURL(blob);
      showPhoto(F.previewUrl);
    } catch (err) { showErr("#cap-err", "That photo couldn't be opened. Try another one."); }
  });
  $("#photo-remove").addEventListener("click", () => { F.blob = null; F.removePhoto = true; showPhoto(""); });
  $("#box-bar-clear").addEventListener("click", () => { F.boxId = null; syncBox(); $("#f-room").focus(); });
  $("#cap-dlg").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pickRoom !== undefined) {
      $("#f-room").value = b.dataset.pickRoom;
      F.touched.room = true;
      drawRoomChips("#room-chips", "#f-room");
      fillSpots("#f-room", "#dl-spots");
      $("#f-spot").focus();
    } else if (b.dataset.occ !== undefined) {
      F.occ = b.dataset.occ || null;
      F.occTouched = true;
      drawOccChips();
      if (F.occ === "date") $("#f-remind").focus();
    } else if (b.dataset.cat) {
      F.cat = b.dataset.cat;
      F.catTouched = true;
      drawCatChips();
    }
  });
  $("#item-dlg").addEventListener("click", onItemClick);
  $("#item-dlg").addEventListener("submit", saveLine);
  $("#item-dlg").addEventListener("input", e => { if (e.target.closest("#d-edit")) $("#d-save").disabled = false; });
  $("#move-dlg").addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "move-same-btn") {
      b.disabled = true;
      try { await moveDone(M.it.room || "", M.it.spot || ""); } catch (err) { showErr("#move-err", "Couldn't save. Try again."); } finally { b.disabled = false; }
    } else if (b.dataset.pickRoom !== undefined) {
      $("#m-room").value = b.dataset.pickRoom;
      drawRoomChips("#move-room-chips", "#m-room");
      fillSpots("#m-room", "#dl-spots-m");
      $("#m-spot").focus();
    }
  });
  $("#m-room").addEventListener("input", () => { drawRoomChips("#move-room-chips", "#m-room"); fillSpots("#m-room", "#dl-spots-m"); });
  $("#move-form").addEventListener("submit", async e => {
    e.preventDefault();
    const room = cap($("#m-room").value.trim()).slice(0, 60), spot = cap($("#m-spot").value.trim()).slice(0, 140);
    if (!room && !spot) return showErr("#move-err", "Add the room, the spot, or both.", "#m-room");
    $("#move-save").disabled = true;
    try { await moveDone(room, spot); } catch (err) { showErr("#move-err", "Couldn't save. Try again."); } finally { $("#move-save").disabled = false; }
  });
}
