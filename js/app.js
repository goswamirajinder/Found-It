// Starts the app: loads saved data, draws the home screen, and wires the header, dock and settings.
import {S, $, load, toast, saveEntry, patchEntry, saveSettings, savePlace, removePlace, reloadAll, removeEntry, addToList} from "./state.js";
import {wireBoxes, openBox, newCode} from "./boxes.js";
import {thingsToBuy, thingsToDo} from "./voice-ui.js";
import {viewHome, viewSearch, viewRoom, viewNotes} from "./views.js";
import {wireSheets, openCapture, openItem, openMove, refreshOpenItem} from "./sheets.js";
import {wireVoice, openVoice, readListAloud, listenForList} from "./voice-ui.js";
import {exportAll, importAll, wipeAll, getMeta, setMeta} from "./store.js";
import {esc, newId, today, addDays} from "./data.js";
import {canListen, canLocate, locate, locError, speak} from "./device.js";
const RATES = [[0.7, "Slow"], [0.85, "A little slow"], [1, "Normal"]];

function render() {
  const q = $("#q").value.trim();
  $("#q-clear").hidden = !q;
  $("#count").textContent = S.items.length ? `${S.items.length} saved` : "Where did I keep it?";
  $("#main").innerHTML = q ? viewSearch(q) : S.view.kind === "room" ? viewRoom(S.view.room) : S.view.kind === "notes" ? viewNotes() : viewHome();
  refreshOpenItem();
}
S.render = render;
S.goRoom = room => { $("#q").value = ""; S.view = {kind: "room", room}; render(); scrollTo(0, 0); };
const go = kind => { S.view = {kind}; render(); scrollTo(0, 0); };

/* ---------- settings ---------- */
const LANGS = [["en-IN", "English (India)"], ["hi-IN", "Hindi"], ["en-US", "English (US)"], ["en-GB", "English (UK)"]];
function remStatus() {
  if (!("Notification" in window)) return "This browser can't show reminders. Use the Google Calendar link on an entry instead.";
  if (Notification.permission === "denied") return "Notifications are blocked for this app. Allow them in your browser's site settings.";
  if (S.settings.reminders && Notification.permission === "granted") return S.periodic ? "On. Your phone checks about twice a day, even when the app is closed." : "On. Reminders are checked when the app opens. Installing the app lets Android check while it's closed.";
  return "Get a notification before festivals, a week before things expire, and when something taken out hasn't gone back.";
}
function drawSettings() {
  const s = S.settings;
  $("#set-body").innerHTML = `
  <section class="set-group"><h3>Voice</h3>
    ${canListen ? "" : `<p class="hint">This browser can't listen, so type your commands in the voice sheet, or use the mic on your keyboard. Chrome on Android listens.</p>`}
    <div class="field"><label for="s-lang">Language you speak in</label><select class="input" id="s-lang">${LANGS.map(([v, l]) => `<option value="${v}"${s.voiceLang === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      <p class="hint">English (India) understands Indian names and Hinglish like “passport almari mein rakha”.</p></div>
    <label class="toggle"><input type="checkbox" id="s-speak"${s.speakAnswers ? " checked" : ""}><span>Read answers aloud</span></label>
    <div class="field"><label for="s-rate">Speaking speed</label><div class="vtype"><select class="input" id="s-rate">${RATES.map(([v, l]) => `<option value="${v}"${s.speechRate === v ? " selected" : ""}>${l}</option>`).join("")}</select><button class="btn" type="button" id="s-rate-try">Try it</button></div></div>
    <label class="toggle"><input type="checkbox" id="s-auto"${s.autoSave ? " checked" : ""}><span>Save spoken entries after a 4-second countdown</span></label>
  </section>
  <section class="set-group"><h3>Location</h3>
    ${canLocate ? `<label class="toggle"><input type="checkbox" id="s-loc"${s.autoLocation ? " checked" : ""}><span>Add where I am to new entries</span></label>
    <p class="hint">Off unless you switch it on. You can also add it to one entry at a time. Locations stay on this phone.</p>
    <div class="field"><span class="lbl">Your places</span>
      ${S.places.length ? S.places.map(p => `<div class="place-row"><span>${esc(p.label)}</span><button class="btn small ghost danger" type="button" data-del-place="${esc(p.id)}">Remove</button></div>`).join("")
        : `<p class="hint">Name places you use, like Home, Office or Mummy's house. Entries saved there show that name instead of map numbers.</p>`}
      <div class="vtype"><input class="input" id="s-place" maxlength="60" autocomplete="off" placeholder="Name where you are now, e.g. Home"><button class="btn dark" type="button" id="s-place-add">Save</button></div>
      <p class="hint" id="s-place-msg" aria-live="polite"></p></div>` : `<p class="hint">Location isn't available in this browser.</p>`}
  </section>
  <section class="set-group"><h3>Phone reminders</h3>
    <p class="hint" id="s-rem-msg">${esc(remStatus())}</p>
    ${!("Notification" in window) || Notification.permission === "denied" || (S.settings.reminders && Notification.permission === "granted") ? "" : `<button class="btn" type="button" id="s-rem">Turn on reminders</button>`}
  </section>
  <section class="set-group"><h3>Box labels</h3>
    <p class="hint">Stick a QR label on a trunk, box or drawer. Scanning it with the phone's camera opens Found It at that box and shows what's inside.</p>
    <button class="btn" type="button" id="s-newbox">Make a label for a new box</button>
  </section>
  <section class="set-group"><h3>Backup</h3>
    <p class="hint">Everything is stored only on this phone${S.persisted ? ", and the browser has agreed not to clear it" : ""}. Save a backup now and then and keep it somewhere safe, like Google Drive or your email.</p>
    <div class="row"><button class="btn dark" type="button" id="s-backup">Save a backup</button><label class="btn" for="restore-file">Restore a backup</label></div>
    <p class="hint" id="s-backup-msg" aria-live="polite"></p>
  </section>
  <section class="set-group"><h3>Start over</h3><div id="s-wipe-box"><button class="btn danger" type="button" id="s-wipe">Delete everything on this phone</button></div></section>`;
}
async function enableReminders() {
  const msg = t => { $("#s-rem-msg").textContent = t; };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return msg(remStatus());
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return msg("Notifications are blocked. Allow them in your browser's site settings, then try again.");
  await saveSettings({reminders: true});
  await registerPeriodic();
  const reg = await navigator.serviceWorker.ready;
  if (reg.active) reg.active.postMessage({type: "check-reminders"});
  drawSettings();
}
async function registerPeriodic() {
  S.periodic = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return;
    const st = await navigator.permissions.query({name: "periodic-background-sync"});
    if (st.state !== "granted") return;
    await reg.periodicSync.register("reminders", {minInterval: 12 * 60 * 60 * 1000});
    S.periodic = true;
  } catch (e) { /* not supported here */ }
}
async function saveBackup() {
  const name = `found-it-backup-${today()}.json`;
  const blob = new Blob([JSON.stringify(await exportAll())], {type: "application/json"});
  const file = new File([blob], name, {type: "application/json"});
  if (navigator.canShare && navigator.canShare({files: [file]})) {
    try { await navigator.share({files: [file], title: "Found It backup"}); return "Backup shared. Keep it somewhere safe."; }
    catch (e) { if (e && e.name === "AbortError") return ""; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return `Saved ${name} to your downloads.`;
}
async function onSettingsClick(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.delPlace) { await removePlace(b.dataset.delPlace); drawSettings(); return; }
  if (b.id === "s-place-add") {
    const label = $("#s-place").value.trim(), m = $("#s-place-msg");
    if (!label) { m.textContent = "Type a name first, like Home."; $("#s-place").focus(); return; }
    b.disabled = true;
    m.textContent = "Finding where you are…";
    try {
      const p = await locate();
      await savePlace({id: newId(), label: label.slice(0, 60), lat: p.lat, lng: p.lng});
      drawSettings();
      toast(`Saved this spot as ${label}`);
    } catch (err) { m.textContent = locError(err); b.disabled = false; }
  } else if (b.id === "s-newbox") { $("#set-dlg").close(); openBox(newCode()); }
  else if (b.id === "s-rate-try") speak("You have 3 things to buy. 1. Milk. 2. Bread. 3. Batteries.", S.settings.voiceLang, S.settings.speechRate);
  else if (b.id === "s-rem") enableReminders();
  else if (b.id === "s-backup") {
    b.disabled = true;
    try { $("#s-backup-msg").textContent = await saveBackup(); } catch (err) { $("#s-backup-msg").textContent = "Couldn't make the backup. Try again."; }
    b.disabled = false;
  } else if (b.id === "s-wipe") {
    $("#s-wipe-box").innerHTML = `<div class="confirm"><p style="margin:0">Delete every entry, photo and place on this phone? Save a backup first if you might want them back.</p>
      <div class="row"><button class="btn dark" type="button" id="s-wipe-yes">Delete everything</button><button class="btn" type="button" id="s-wipe-no">Keep them</button></div></div>`;
  } else if (b.id === "s-wipe-no") drawSettings();
  else if (b.id === "s-wipe-yes") { await wipeAll(); await setMeta("seeded", true); await reloadAll(); $("#set-dlg").close(); toast("Everything was deleted"); }
}
async function onSettingsChange(e) {
  const t = e.target;
  if (t.id === "s-lang") await saveSettings({voiceLang: t.value});
  else if (t.id === "s-speak") await saveSettings({speakAnswers: t.checked});
  else if (t.id === "s-rate") await saveSettings({speechRate: Number(t.value) || 0.85});
  else if (t.id === "s-auto") await saveSettings({autoSave: t.checked});
  else if (t.id === "s-loc") {
    await saveSettings({autoLocation: t.checked});
    if (t.checked) locate().catch(err => toast(locError(err)));
  }
}

/* ---------- first run: a few marked examples so the screens make sense ---------- */
async function seedExamples() {
  if (await getMeta("seeded", false)) return;
  await setMeta("seeded", true);
  if (S.items.length) return;
  const t = today(), at = (d, h) => new Date(`${addDays(t, d)}T${h}:00`).toISOString();
  const ex = [
    {kind: "item", name: "Rangoli colours and brass diyas", room: "Loft", spot: "Blue tin trunk, left side", category: "festive", occasion: "diwali", keptAt: at(-370, "10:00")},
    {kind: "item", name: "Passports (all four)", room: "Bedroom", spot: "Steel almirah locker, top shelf", category: "documents", notes: "In the brown zip folder", keptAt: at(-260, "08:30")},
    {kind: "item", name: "BP tablets, spare strips (Telma 40)", room: "Kitchen", spot: "Medicine box, top shelf", category: "medicine", expiry: addDays(t, 42), keptAt: at(-60, "07:15")},
    {kind: "note", name: "Plumber's number is on the fridge magnet. Ask him about the geyser too.", keptAt: at(-3, "18:40")}
  ];
  for (const e of ex) await saveEntry({id: newId(), status: "kept", history: [], photoId: null, createdAt: e.keptAt, updatedAt: e.keptAt, example: true, ...e});
}

/* ---------- start ---------- */
function wire() {
  wireSheets();
  wireVoice();
  wireBoxes();
  $("#q").addEventListener("input", () => { if (!$("#q").value.trim() && S.view.kind !== "home") S.view = {kind: "home"}; render(); });
  $("#q-clear").addEventListener("click", () => { $("#q").value = ""; render(); $("#q").focus(); });
  $("#search-form").addEventListener("submit", e => { e.preventDefault(); $("#q").blur(); });
  $("#keep-btn").addEventListener("click", () => openCapture("item"));
  $("#note-btn").addEventListener("click", () => openCapture("note"));
  $("#mic-btn").addEventListener("click", () => openVoice(true));
  $("#settings-btn").addEventListener("click", () => { drawSettings(); $("#set-dlg").showModal(); });
  $("#set-body").addEventListener("click", onSettingsClick);
  $("#set-body").addEventListener("change", onSettingsChange);
  $("#restore-file").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const m = $("#s-backup-msg");
    try { const n = await importAll(JSON.parse(await f.text())); await reloadAll(); if (m) m.textContent = `Restored ${n} entries.`; toast(`Restored ${n} entries`); }
    catch (err) { if (m) m.textContent = "That file isn't a Found It backup."; }
  });
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  document.querySelectorAll("dialog.sheet").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
  window.addEventListener("scroll", () => $("#top").classList.toggle("scrolled", scrollY > 4), {passive: true});
  $("#main").addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) return openItem(b.dataset.open);
    if (b.dataset.box) return openBox(b.dataset.box);
    // Shopping and to-do lines: tick, put away (shopping only) or delete.
    const line = S.items.find(i => i.id === (b.dataset.tick || b.dataset.put || b.dataset.del));
    if (line && b.dataset.tick) return patchEntry(line.id, line.bought ? {bought: false, boughtAt: null} : {bought: true, boughtAt: new Date().toISOString()});
    if (line && b.dataset.put) return openCapture("item", {name: line.name, replaces: line.id});
    if (line && b.dataset.del) { await removeEntry(line); toast(`Deleted ${line.name}`); return; }
    if (b.dataset.room !== undefined) return S.goRoom(b.dataset.room);
    if (b.dataset.putback) { const it = S.items.find(i => i.id === b.dataset.putback); if (it) openMove(it, "putback"); return; }
    if (b.dataset.starter) return openCapture("item", {name: b.dataset.starter});
    const act = b.dataset.act;
    if (act === "home" || act === "notes") go(act);
    else if (act === "keep" || act === "note") openCapture(act === "keep" ? "item" : "note");
    else if (act === "install" && S.installEvent) { S.installEvent.prompt(); await S.installEvent.userChoice.catch(() => null); S.installEvent = null; render(); }
    else if (act === "clear-examples") { for (const it of S.items.filter(i => i.example)) await removeEntry(it); toast("Examples cleared"); }
    const kind = b.dataset.list;
    if (act === "read-list") readListAloud(kind);
    else if (act === "list-mic") listenForList(kind, b);
    else if (act === "clear-done") {
      for (const it of S.items.filter(i => i.kind === kind && i.bought)) await removeEntry(it);
      toast(kind === "todo" ? "Done jobs deleted" : "Bought things deleted");
    }
    // Delete all asks once, inside the list, before clearing it.
    else if (act === "clear-list" || act === "clear-list-no") { S.confirmClear = {...S.confirmClear, [kind]: act === "clear-list"}; render(); }
    else if (act === "clear-list-yes") {
      S.confirmClear = {...S.confirmClear, [kind]: false};
      for (const it of S.items.filter(i => i.kind === kind)) await removeEntry(it);
      render();
      toast(kind === "todo" ? "To-do list cleared" : "Shopping list cleared");
    }
  });
  // Both lists: several at once with commas; the box stays focused for the next one.
  $("#main").addEventListener("submit", async e => {
    const form = e.target.closest(".list-add");
    if (!form) return;
    e.preventDefault();
    const kind = form.dataset.list, input = $(`#${kind}-input`);
    const things = kind === "todo" ? thingsToDo(input.value) : thingsToBuy(input.value);
    if (!things.length) { input.focus(); return; }
    await addToList(kind, things);
    const again = $(`#${kind}-input`);
    if (again) again.focus();
  });
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installEvent = e; render(); });
  window.addEventListener("appinstalled", () => { S.installEvent = null; render(); toast("Installed. Open Found It from your home screen."); });
}
function handleLaunch() {
  const p = new URLSearchParams(location.search);
  const shared = [p.get("share_title"), p.get("share_text"), p.get("share_url")].filter(Boolean).join("\n");
  const action = p.get("action"), open = p.get("open"), box = p.get("box");
  if (shared) openCapture("note", {text: shared});
  else if (box) openBox(box);
  else if (open) openItem(open);
  else if (action === "note") openCapture("note");
  else if (action === "keep") openCapture("item");
  else if (action === "voice") openVoice(true);
  if (shared || action || open || box) history.replaceState(null, "", location.pathname);
}
async function init() {
  wire();
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  S.iosHint = !standalone && /iphone|ipad|ipod/i.test(navigator.userAgent);
  try { await load(); await seedExamples(); }
  catch (e) { $("#main").innerHTML = `<p class="err">This browser won't let the app store data (private mode can do this). Open it in a normal Chrome or Safari window.</p>`; return; }
  render();
  handleLaunch();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(v => { S.persisted = v; }).catch(() => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(() => { if (S.settings.reminders) registerPeriodic(); }).catch(() => {});
    navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "open" && e.data.id) openItem(e.data.id); });
  }
}
init();
