// Turns a typed or spoken sentence into an entry or a command.
import {ROOM_WORDS, cap, today, addDays, ymd} from "./data.js";

const POS = "on top of|underneath|under|behind|beside|next to|near|above|below|inside|into|within|on|in|at";
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ROOM_SET = new Set(ROOM_WORDS.map(r => r[0]).filter(w => !w.includes(" ")));
const STORAGE = new Set("almirah almari almira alamari cupboard wardrobe closet cabinet trunk box drawer drawers shelf rack locker bag suitcase bed loft tand peti sandook dabba thaila basket tin bucket fridge table desk".split(" "));
const ADJ = new Set("blue red green black white yellow brown grey gray silver golden steel wooden plastic iron big small large little top bottom upper lower middle left right old new purani purana nayi naya badi bada chhoti chhota upar neeche niche".split(" "));
// Hinglish postpositions come after the place: "passport almari mein rakha".
const HI_POST = {"mein": "in", "me": "in", "main": "in", "par": "on", "pe": "on", "ke andar": "inside", "ke upar": "on top of", "ke neeche": "under", "ke niche": "under", "ke peeche": "behind", "ke paas": "near"};
const HI_VERB = /\s+(?:rakh(?:a|i|e|kha)?|rakh (?:diya|di|dia|diye|dee))(?:\s+(?:hai|hain|tha|thi|the))?$|\s+(?:hai|hain)$/i;

export function tidySpot(t) {
  t = t.replace(/\s+/g, " ").replace(/\s+([,;])/g, "$1").trim();
  let prev;
  do {
    prev = t;
    t = t.replace(/^(?:[,;:-]+\s*|(?:of|in|inside|at|from|and|ki|ka|ke)\s+)/i, "").trim();
    t = t.replace(/(?:\s*[,;:-]+|\s+(?:of|in|inside|at|on|from|and|the|above|below|under|behind|near|beside|ki|ka|ke))$/i, "").trim();
  } while (t !== prev);
  return t;
}

function splitHinglish(h) {
  const ko = h.match(/^(.+?)\s+ko\s+(.+)$/i);
  if (ko) return {name: ko[1], where: ko[2]};
  const tk = h.split(" ");
  let i = tk.findIndex((w, j) => j > 0 && (STORAGE.has(w.toLowerCase()) || ROOM_SET.has(w.toLowerCase())));
  if (i < 1) return null;
  while (i > 1 && (ADJ.has(tk[i - 1].toLowerCase()) || /^(ki|ka|ke|wali|wala|wale)$/i.test(tk[i - 1]))) i--;
  return {name: tk.slice(0, i).join(" "), where: tk.slice(i).join(" ")};
}

function findRoom(where, knownRooms) {
  const cands = [...knownRooms.map(r => [r.toLowerCase(), 0, r]), ...ROOM_WORDS.map(([w, r]) => [w, r, null])];
  let best = null;
  for (const [w, rank, canonical] of cands) {
    const mm = where.toLowerCase().match(new RegExp(`(^|[^a-z])${reEsc(w)}(?=$|[^a-z])`));
    if (!mm) continue;
    const at = mm.index + mm[1].length;
    if (!best || rank < best.rank || (rank === best.rank && (at < best.at || (at === best.at && w.length > best.w.length)))) best = {w, rank, at, canonical};
  }
  return best;
}

// "Diwali lights in the blue trunk on the bedroom loft" -> {name, room, spot}. `where` is "" when no place was said.
export function parseLine(line, knownRooms = []) {
  let s = String(line || "").replace(/\s+/g, " ").trim().replace(/[.!]+$/, "");
  if (!s) return null;
  s = s.replace(/^(?:i\s+(?:have\s+|'ve\s+|just\s+)?)?(?:kept|keep|put|placed|stored|hid|left|keeping|putting|parked)\s+/i, "").replace(/^the\s+/i, "");
  let name = s, where = "", prep = "";
  const ex = s.match(/^(.+?)\s*(?:\s-\s|:|->|→|=)\s*(.+)$/);
  const m = ex ? null : s.match(new RegExp(`^(.+?)\\s+(?:(?:is|are|was|were)\\s+)?(?:(?:kept|put|placed|stored|parked|lying)\\s+)?(${POS})\\s+(.+)$`, "i"));
  const h = s.replace(HI_VERB, "");
  const hm = h.match(/^(.+?)\s+(mein|me|main|par|pe|ke andar|ke upar|ke neeche|ke niche|ke peeche|ke paas)$/i);
  const hs = hm && !ex && !m ? splitHinglish(hm[1]) : null;
  if (ex) { name = ex[1]; where = ex[2]; }
  else if (m) { name = m[1]; prep = m[2].toLowerCase(); where = m[3]; }
  else if (hs) { name = hs.name; where = hs.where; prep = HI_POST[hm[2].toLowerCase()]; }
  else { const c = s.match(/^(.+?),\s*(.+)$/); if (c) { name = c[1]; where = c[2]; } }
  name = name.replace(/\s+(?:is|are|was|were|parked|kept|placed|stored|lying)$/i, "").replace(/\s+ko$/i, "").trim();
  let room = "", spot = where;
  if (where) {
    const best = findRoom(where, knownRooms);
    if (best) {
      room = best.canonical || cap(best.w);
      spot = where.slice(0, best.at) + " " + where.slice(best.at + best.w.length);
    }
    spot = tidySpot(spot);
    if (prep && spot && !/^(in|inside|into|at|within)$/.test(prep)) spot = `${prep} ${spot}`;
    else spot = spot.replace(/^the\s+/i, "");
  }
  return {name: cap(name).slice(0, 120), room: room.slice(0, 60), spot: cap(spot).slice(0, 140), where: !!(room || spot)};
}

// Pulls a spoken date out of a note: "tomorrow", "next week", "in 3 days", "on 20 November", "on Nov 20".
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export function parseWhen(text, t = today()) {
  const s = String(text || "");
  const out = (date, re) => ({date, rest: tidyRest(s.replace(re, " ")), tomorrow: addDays(t, 1)});
  let m;
  if ((m = s.match(/\b(?:on\s+)?the day after tomorrow\b|\bday after tomorrow\b/i))) return out(addDays(t, 2), m[0]);
  if ((m = s.match(/\b(?:on\s+)?tomorrow\b/i))) return out(addDays(t, 1), m[0]);
  if ((m = s.match(/\b(?:later\s+)?today\b|\btonight\b/i))) return out(t, m[0]);
  if ((m = s.match(/\bnext week\b/i))) return out(addDays(t, 7), m[0]);
  if ((m = s.match(/\bin (\d{1,3}) days?\b/i))) return out(addDays(t, +m[1]), m[0]);
  const dm = s.match(/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
    || s.match(/\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (dm) {
    const day = +(/\d/.test(dm[1]) ? dm[1] : dm[2]), mon = MONTHS.indexOf((/\d/.test(dm[1]) ? dm[2] : dm[1]).toLowerCase().slice(0, 3));
    const y = +t.slice(0, 4);
    let date = ymd(new Date(y, mon, day));
    if (date < t) date = ymd(new Date(y + 1, mon, day));
    return out(date, dm[0]);
  }
  return {date: null, rest: s, tomorrow: addDays(t, 1)};
}
const tidyRest = s => s.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").replace(/(?:\s+(?:on|by|for|at))+$/i, "").trim();

const FIND_RE =/^(?:where(?:'s|s)?\b|find\b|search\b|show\b|look(?:ing)? for\b|have you seen\b|do you know where\b|any idea where\b)/i;
const FIND_HI = /(?:^|\s)(?:kahan|kaha|kahaan|kidhar)(?:\s|$)|कहाँ|कहां|किधर/i;
export function findQuery(text) {
  return text.replace(/\?+$/, "")
    .replace(/^(?:where (?:is|are|was|were|did|do|have)|where(?:'s|s)?|find|search(?: for)?|show(?: me)?|look(?:ing)? for|have you seen|do you know where|any idea where)\s+/i, "")
    .replace(/^(?:i|we)\s+(?:kept|keep|put|placed|left|stored)\s+/i, "")
    .replace(/\s+(?:kept|placed|stored|lying)$/i, "")
    .trim();
}

// One sentence in, one intent out: find | keep | note | out | back | none.
export function parseCommand(raw, knownRooms = []) {
  const text = String(raw || "").replace(/\s+/g, " ").trim().replace(/^(?:ok(?:ay)?|hey|hi|hello|please|found it)[,.!\s]+/i, "");
  if (!text) return {intent: "none", text};
  let m = text.match(/^(?:note(?: down| that)?|make a note(?: that| of)?|remember(?: that)?|remind me(?: to| that| about)?|idea|reminder|yaad rakhna|yaad rakho)\b[:,\s-]*(.*)$/i);
  if (m && m[1]) return {intent: "note", text: cap(m[1]), remind: /^remind me/i.test(text)};
  if (FIND_RE.test(text) || FIND_HI.test(text) || /\?$/.test(text)) return {intent: "find", query: findQuery(text), text};
  m = text.match(/^(?:i\s+(?:have\s+|just\s+|am\s+)?)?(?:put|placed|kept|keep|putting)\s+(?:the\s+)?(.+?)\s+back\b(?:\s+(?:in|on|at|into|inside)\s+(.+))?$/i)
    || text.match(/^(?:i\s+(?:have\s+)?)?(?:returned|put back|kept back)\s+(?:the\s+)?(.+?)(?:\s+(?:in|on|at|into|inside)\s+(.+))?$/i);
  if (m) return {intent: "back", query: m[1], where: m[2] ? parseLine(`x in ${m[2]}`, knownRooms) : null, text};
  m = text.match(/^(.+?)\s+wapas\s+rakh(?:\s+(?:diya|di|dia|diye))?(?:\s+hai)?$/i);
  if (m) return {intent: "back", query: m[1].replace(/\s+ko$/i, ""), where: null, text};
  m = text.match(/^(?:i\s+(?:have\s+|just\s+|am\s+)?)?(?:took|take|taking|taken|removed?|removing)\s+(?:out\s+)?(?:the\s+)?(.+?)(?:\s+out)?(?:\s+(?:for|to)\s+.+)?$/i);
  if (m) return {intent: "out", query: m[1], text};
  m = text.match(/^(.+?)\s+(?:nikala|nikali|nikale|nikal liya|nikal li|nikaal liya|nikaala)(?:\s+hai)?$/i);
  if (m) return {intent: "out", query: m[1].replace(/\s+ko$/i, ""), text};
  // Sightings and passing thoughts are notes even when they mention a place.
  if (/^(?:i\s+)?(?:saw|seen|spotted|noticed|liked|loved|met|heard|thinking|idea)\b/i.test(text)) return {intent: "note", text: cap(text)};
  const p = parseLine(text, knownRooms);
  if (p && p.where && p.name) return {intent: "keep", parsed: p, text};
  if (/^(?:i\s+(?:have\s+|'ve\s+|just\s+)?)?(?:kept|put|placed|stored|hid)\b/i.test(text) && p) return {intent: "keep", parsed: p, text};
  return {intent: "note", text: cap(text)};
}
