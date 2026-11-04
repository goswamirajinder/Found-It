// People to call: link a name to a phone number once, then "call mom" or a to-do's call button opens the dialer.
import {S, $, toast, showErr, savePerson, findPeople, callTarget} from "./state.js";
import {esc, cap, icon} from "./data.js";
import {canPickContacts, pickContact, telHref, dial} from "./device.js";

// A real link, so tapping it opens the phone's dialer with the number filled in.
export const callLink = (p, label) => `<a class="btn primary call" href="${esc(telHref(p.tel))}">${icon("phone")}<span>${esc(label || `Call ${p.name}`)}</span></a>`;

let alias = "", dialNext = false;
// `who` is the word that was used ("mom"); it is kept as a nickname so it finds the contact next time.
// With `dialAfter` (someone asked to call), saving the number also opens the dialer.
export function openPerson(who = "", editing = null, dialAfter = false) {
  alias = editing ? "" : who || "";
  dialNext = !editing && dialAfter;
  $("#person-title").textContent = editing ? "Edit contact" : who ? `Who is “${who}”?` : "Add someone to call";
  $("#person-hint").textContent = who && !editing ? `Link “${who}” to a phone number once. After that, “call ${who}” opens the dialer.` : "Numbers are saved only on this phone.";
  $("#person-pick").hidden = !canPickContacts;
  $("#p-name").value = editing ? editing.name : cap(who || "");
  $("#p-tel").value = editing ? editing.tel : "";
  $("#person-err").hidden = true;
  $("#person-call").innerHTML = "";
  $("#person-save").textContent = dialNext ? "Save and call" : "Save";
  if (!$("#person-dlg").open) $("#person-dlg").showModal();
}
// The call button on a to-do like "Call mom": dial if it's clear who that is, ask which one if several
// people fit (the voice sheet shows them), and link a number once if nobody does.
export function callFromText(text) {
  const who = callTarget(text);
  if (!who) return false;
  const {people: ps, sure} = findPeople(who);
  if (sure) dial(ps[0].tel);
  else if (ps.length && S.chooseCall) S.chooseCall(who);
  else openPerson(who, null, true);
  return true;
}

export function wirePeople() {
  $("#person-pick").addEventListener("click", async () => {
    try {
      const c = await pickContact();
      if (!c) return;
      if (c.name) $("#p-name").value = c.name;
      if (c.tel) $("#p-tel").value = c.tel;
      else showErr("#person-err", "That contact has no phone number. Type one instead.", "#p-tel");
    } catch (e) { showErr("#person-err", "Couldn't open your contacts. Type the number instead.", "#p-tel"); }
  });
  $("#person-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#p-name").value.trim(), tel = $("#p-tel").value.replace(/[^\d+]/g, "");
    if (!name) return showErr("#person-err", "Add a name.", "#p-name");
    if (tel.replace(/\D/g, "").length < 6) return showErr("#person-err", "Add a phone number.", "#p-tel");
    $("#person-err").hidden = true;
    const p = await savePerson({name, tel, alias});
    toast(`Saved ${p.name}`);
    $("#person-call").innerHTML = callLink(p);
    // The Save tap still counts as a tap, so the dialer may open now.
    if (dialNext) { dialNext = false; $("#person-save").textContent = "Save"; dial(p.tel); }
  });
}
