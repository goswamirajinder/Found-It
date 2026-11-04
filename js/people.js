// People to call: link a name to a phone number once, then "call mom" or a to-do's call button opens the dialer.
import {$, toast, showErr, savePerson, findPerson, callTarget} from "./state.js";
import {esc, cap, icon} from "./data.js";
import {canPickContacts, pickContact, telHref} from "./device.js";

// A real link, so tapping it opens the phone's dialer with the number filled in.
export const callLink = (p, label) => `<a class="btn primary call" href="${esc(telHref(p.tel))}">${icon("phone")}<span>${esc(label || `Call ${p.name}`)}</span></a>`;

let alias = "";
// `who` is the word that was used ("mom"); it is kept as a nickname so it finds the contact next time.
export function openPerson(who = "", editing = null) {
  alias = editing ? "" : who || "";
  $("#person-title").textContent = editing ? "Edit contact" : who ? `Who is “${who}”?` : "Add someone to call";
  $("#person-hint").textContent = who && !editing ? `Link “${who}” to a phone number once. After that, “call ${who}” opens the dialer.` : "Numbers are saved only on this phone.";
  $("#person-pick").hidden = !canPickContacts;
  $("#p-name").value = editing ? editing.name : cap(who || "");
  $("#p-tel").value = editing ? editing.tel : "";
  $("#person-err").hidden = true;
  $("#person-call").innerHTML = "";
  if (!$("#person-dlg").open) $("#person-dlg").showModal();
}
// The call button on a to-do like "Call mom": dial if we know who that is, otherwise ask once.
export function callFromText(text) {
  const who = callTarget(text);
  if (!who) return false;
  const p = findPerson(who);
  if (p) location.href = telHref(p.tel);
  else openPerson(who);
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
  });
}
