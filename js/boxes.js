// Boxes with QR labels: scan a label to see what's inside, or to put something in without saying where.
import {S, $, toast, showErr, saveEntry, patchEntry} from "./state.js";
import {esc, cap} from "./data.js";
import {qrMatrix, qrSvg} from "./qr.js";
import {row, inBox} from "./views.js";
import {drawRoomChips, fillRoomsDl, openCapture, openItem} from "./sheets.js";

// The label opens the app at ?box=CODE, so a phone's own camera can scan it.
export const boxUrl = code => new URL(`./?box=${encodeURIComponent(code)}`, document.baseURI).href;
const findBox = code => S.items.find(i => i.kind === "box" && i.code === code);
// Codes skip look-alike characters (0/O, 1/I) so they can also be read out or typed.
export function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do { c = Array.from({length: 4}, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (findBox(c));
  return c;
}

let cur = null, editing = false;
export function openBox(code) {
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
  if (!code) return;
  cur = code;
  editing = !findBox(code);
  drawBox();
  if (!$("#box-dlg").open) $("#box-dlg").showModal();
  $("#box-body").scrollTop = 0;
}
S.openBox = openBox;

const whereHtml = b => `${esc(b.room || "Somewhere")}${b.spot ? `<i>›</i>${esc(b.spot)}` : ""}`;
const labelHtml = (code, box) => `<div class="label">${qrSvg(boxUrl(code))}<b>BOX ${esc(code)}</b><span>${esc(box ? box.name : "Found It")} · scan to see what's inside</span></div>`;

function drawBox() {
  const box = findBox(cur);
  $("#box-title").textContent = box ? box.name : `New box ${cur}`;
  if (editing) {
    $("#box-body").innerHTML = `
      ${box ? "" : `<p class="hint">This label isn't linked to a box yet. Name the box and say where it's kept. From then on, scanning the label shows what's inside.</p>`}
      <div class="field"><label for="b-name">Box name</label><input class="input" id="b-name" maxlength="60" autocomplete="off" placeholder="Blue tin trunk" value="${esc(box ? box.name : "")}"></div>
      <div class="field"><span class="lbl">Where is the box kept?</span><div class="chips" id="b-room-chips"></div>
        <div class="two">
          <div class="field"><label class="hint" for="b-room">Room</label><input class="input" id="b-room" list="dl-rooms" maxlength="60" autocomplete="off" value="${esc(box ? box.room : "")}"></div>
          <div class="field"><label class="hint" for="b-spot">Exact spot</label><input class="input" id="b-spot" maxlength="140" autocomplete="off" placeholder="Loft above the kitchen door" value="${esc(box ? box.spot : "")}"></div>
        </div></div>
      <p class="err" id="b-err" hidden></p>
      <div class="row"><button class="btn primary" type="button" data-b="save">${box ? "Save" : "Save box"}</button>${box ? `<button class="btn" type="button" data-b="cancel">Cancel</button>` : ""}</div>
      ${box ? "" : labelHtml(cur, null)}`;
    fillRoomsDl();
    drawRoomChips("#b-room-chips", "#b-room");
    return;
  }
  const its = inBox(cur);
  $("#box-body").innerHTML = `
    <div class="d-where"><span class="k">Box ${esc(cur)} is kept in</span><span class="tape big">${whereHtml(box)}</span></div>
    <div class="actions"><button class="btn primary" type="button" data-b="add">Put something in</button><button class="btn" type="button" data-b="move">Moved or renamed</button></div>
    <section class="sec"><h2><span>Inside (${its.length})</span></h2>
      ${its.length ? `<div class="list">${its.map(i => row(i, {noTape: true})).join("")}</div>` : `<p class="empty-note">Nothing recorded in this box yet. Tap Put something in.</p>`}</section>
    <section class="sec"><h2><span>Label</span></h2>${labelHtml(cur, box)}
      <div class="row" style="margin-top:10px"><button class="btn" type="button" data-b="share">Share or print the label</button></div></section>`;
}

async function saveBox() {
  const name = cap($("#b-name").value.trim()), room = cap($("#b-room").value.trim()), spot = cap($("#b-spot").value.trim());
  if (!name) return showErr("#b-err", "Give the box a name, like Blue tin trunk.", "#b-name");
  if (!room && !spot) return showErr("#b-err", "Say where the box is kept: a room, a spot, or both.", "#b-room");
  const box = findBox(cur), now = new Date().toISOString();
  if (!box) {
    await saveEntry({id: `box-${cur}`, kind: "box", code: cur, name, room, spot, status: "kept", history: [], photoId: null, keptAt: now, createdAt: now, updatedAt: now});
    toast(`Box ${cur} is set up`);
  } else {
    const moved = room !== box.room || spot !== box.spot, its = inBox(cur);
    await saveEntry({...box, name, room, spot, updatedAt: now});
    // Everything inside goes wherever the box goes.
    for (const it of its) {
      await patchEntry(it.id, {room, spot: spot ? `${name}, ${spot}` : name,
        ...(moved ? {history: [{room: it.room, spot: it.spot, until: now}, ...(it.history || [])].slice(0, 10)} : {})});
    }
    toast(moved && its.length ? `Box moved. ${its.length} thing${its.length === 1 ? "" : "s"} inside updated.` : "Saved");
  }
  editing = false;
  drawBox();
}

async function shareLabel() {
  const box = findBox(cur), {size, modules} = qrMatrix(boxUrl(cur));
  const px = 12, q = 4, w = (size + q * 2) * px, c = document.createElement("canvas");
  c.width = w;
  c.height = w + 110;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#000";
  modules.forEach((r, y) => r.forEach((on, x) => { if (on) g.fillRect((x + q) * px, (y + q) * px, px, px); }));
  g.textAlign = "center";
  g.font = "800 44px 'Bricolage Grotesque', sans-serif";
  g.fillText(`BOX ${cur}`, w / 2, w + 30);
  g.font = "28px 'Atkinson Hyperlegible', sans-serif";
  g.fillText(box ? box.name : "Found It", w / 2, w + 76);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const file = new File([blob], `found-it-box-${cur}.png`, {type: "image/png"});
  if (navigator.canShare && navigator.canShare({files: [file]})) {
    try { await navigator.share({files: [file], title: `Box ${cur} label`}); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function wireBoxes() {
  $("#box-body").addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pickRoom !== undefined) { $("#b-room").value = b.dataset.pickRoom; drawRoomChips("#b-room-chips", "#b-room"); $("#b-spot").focus(); return; }
    if (b.dataset.open) { $("#box-dlg").close(); openItem(b.dataset.open); return; }
    const a = b.dataset.b;
    try {
      if (a === "save") { b.disabled = true; await saveBox(); }
      else if (a === "cancel") { editing = false; drawBox(); }
      else if (a === "move") { editing = true; drawBox(); }
      else if (a === "add") { $("#box-dlg").close(); openCapture("item", {boxId: cur}); }
      else if (a === "share") await shareLabel();
    } catch (err) { toast("Couldn't save that. Try again."); }
    finally { b.disabled = false; }
  });
  $("#box-body").addEventListener("input", e => { if (e.target.id === "b-room") drawRoomChips("#b-room-chips", "#b-room"); });
}
