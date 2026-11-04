// Reads a contacts file (.vcf) exported from a phone's Contacts app: each contact's name and best phone number.
// Copes with vCard 2.1 (Android, where Hindi names come quoted-printable), 3.0 and 4.0 (Google Contacts, iPhone).

// "=E0=A4=AE" bytes back into text.
function quotedPrintable(s, charset) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "=" && /^[0-9a-f]{2}$/i.test(s.slice(i + 1, i + 3))) { bytes.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(s.charCodeAt(i) & 255);
  }
  try { return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes)); }
  catch (e) { return new TextDecoder("utf-8").decode(new Uint8Array(bytes)); }
}
const unescape = s => s.replace(/\\([\\,;:nN])/g, (_, c) => (c === "n" || c === "N" ? " " : c));
// "Sharma;Rahul;;;" -> ["Sharma", "Rahul", "", "", ""], leaving an escaped "\;" inside a part.
const parts = s => s.replace(/\\;/g, "\u0000").split(";").map(x => x.replace(/\u0000/g, "\\;"));

// Joins folded lines (3.0/4.0 continue with a leading space) and quoted-printable soft breaks (a line ending in "=").
function logicalLines(text) {
  const raw = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n"), lines = [];
  for (let i = 0; i < raw.length; i++) {
    let l = raw[i];
    if (/^[ \t]/.test(l) && lines.length) { lines[lines.length - 1] += l.slice(1); continue; }
    while (/ENCODING=QUOTED-PRINTABLE/i.test(l.split(":")[0]) && l.endsWith("=") && i + 1 < raw.length) l = l.slice(0, -1) + raw[++i];
    lines.push(l);
  }
  return lines;
}

const cleanTel = t => {
  const s = String(t || "").replace(/^tel:/i, "").trim();
  return (s.startsWith("+") ? "+" : "") + s.replace(/\D/g, "");
};
function finish(c) {
  const [last = "", first = "", middle = ""] = parts(c.n).map(x => unescape(x).trim());
  const name = (unescape(c.fn).trim() || [first, middle, last].filter(Boolean).join(" ") || unescape(c.org).trim()).replace(/\s+/g, " ");
  // Prefer a mobile number the person marked as preferred, then any mobile, then a preferred one, then the first.
  const score = t => (t.cell ? 2 : 0) + (t.pref ? 1 : 0);
  const tels = c.tels.map(t => ({...t, tel: cleanTel(t.tel)})).filter(t => t.tel.replace(/\D/g, "").length >= 6);
  if (!name || !tels.length) return null;
  const best = tels.reduce((a, b) => (score(b) > score(a) ? b : a));
  return {name: name.slice(0, 40), tel: best.tel};
}

// [{name, tel}] for every contact that has a name and a phone number.
export function parseVcards(text) {
  const out = [];
  let card = null;
  for (const line of logicalLines(text)) {
    const m = line.match(/^(?:[\w-]+\.)?([A-Za-z][\w-]*)((?:;[^:]*)?):(.*)$/);
    if (!m) continue;
    const prop = m[1].toUpperCase(), params = m[2].toUpperCase();
    let val = m[3];
    if (prop === "BEGIN" && val.trim().toUpperCase() === "VCARD") { card = {fn: "", n: "", org: "", tels: []}; continue; }
    if (!card) continue;
    if (prop === "END") { const c = finish(card); if (c) out.push(c); card = null; continue; }
    if (/ENCODING=(?:QUOTED-PRINTABLE|Q\b)/.test(params)) val = quotedPrintable(val, (params.match(/CHARSET=([\w-]+)/) || [])[1]);
    if (prop === "FN") card.fn = val;
    else if (prop === "N") card.n = val;
    else if (prop === "ORG") card.org = parts(val)[0];
    else if (prop === "TEL") card.tels.push({tel: val, cell: /CELL|MOBILE|IPHONE/.test(params), pref: /PREF/.test(params)});
  }
  return out;
}
