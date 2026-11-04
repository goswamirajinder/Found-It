// Forgiving search: typos, plurals, synonyms, and Hindi words however they're written (paise, pese, पैसे).
import {SYN, STOP, CATS, OCCASIONS, catLabel} from "./data.js";

export const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
export const toks = s => norm(s).split(" ").filter(Boolean);
export function stem(t) {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 4 && /(xes|ches|shes|sses|zes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !/(ss|us|is)$/.test(t)) return t.slice(0, -1);
  return t;
}

/* ---------- Hindi in Devanagari, written the way people type it in Roman letters ---------- */
const table = s => Object.fromEntries(s.split(" ").map(p => p.split(":")));
const DV_C = table("क:k ख:kh ग:g घ:gh ङ:n च:ch छ:chh ज:j झ:jh ञ:n ट:t ठ:th ड:d ढ:dh ण:n त:t थ:th द:d ध:dh न:n प:p फ:ph ब:b भ:bh म:m य:y र:r ल:l ळ:l व:v श:sh ष:sh स:s ह:h");
const DV_NUKTA = table("क:q ख:kh ग:g ज:z ड:d ढ:dh फ:f");
const DV_V = table("अ:a आ:aa इ:i ई:ee उ:u ऊ:oo ऋ:ri ए:e ऐ:ai ओ:o औ:au ऑ:o");
const DV_M = table("ा:aa ि:i ी:ee ु:u ू:oo ृ:ri े:e ै:ai ो:o ौ:au ॉ:o");
// "पैसे" -> "paise", "कपड़ा" -> "kapdaa", "अलमारी" -> "almaaree".
export function devToLatin(w) {
  const ch = [...String(w || "")], u = []; // [sound, vowel]; "@" is the "a" each consonant carries unless something replaces it
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (DV_C[c]) {
      let k = DV_C[c];
      if (ch[i + 1] === "़") { k = DV_NUKTA[c] || k; i++; }
      const n = ch[i + 1];
      if (n === "्") { u.push([k, ""]); i++; }
      else if (DV_M[n]) { u.push([k, DV_M[n]]); i++; }
      else u.push([k, "@"]);
    } else if (DV_V[c]) u.push(["", DV_V[c]]);
    else if (c === "ं" || c === "ँ") u.push(["n", ""]);
    else if (c === "ः") u.push(["h", ""]);
    else if (/[a-z0-9]/.test(c)) u.push([c, ""]);
    else if ("०१२३४५६७८९".includes(c)) u.push([String("०१२३४५६७८९".indexOf(c)), ""]);
  }
  // Hindi drops that "a" at the end of a word, and between two consonants when vowels sit on both sides (right to left).
  const last = u.length - 1;
  if (last > 0 && u[last][1] === "@") u[last][1] = "";
  for (let i = last - 1; i > 0; i--) if (u[i][1] === "@" && u[i][0] && u[i - 1][1] && u[i + 1][0] && u[i + 1][1]) u[i][1] = "";
  return u.map(([c, v]) => c + (v === "@" ? "a" : v)).join("");
}

// One spelling for the many ways a Hindi word gets typed: paisa, paise, pese and पैसे all become "pes";
// chaabi, chabi, chabee, chaabiyan become "chab"; dawai, davai, dawa become "dav".
export function hkey(t) {
  const s = (/[ऀ-ॿ]/.test(t) ? devToLatin(t) : String(t || "")).toLowerCase().replace(/[^a-z]/g, "");
  if (s.length < 3) return s;
  let k = s.replace(/iy(?:a|aa|o)n$/, "i")
    .replace(/chh/g, "ch").replace(/sh/g, "s").replace(/ph/g, "f").replace(/c(?!h)/g, "k")
    .replace(/w/g, "v").replace(/z/g, "j").replace(/q/g, "k").replace(/x/g, "ks")
    .replace(/ee|ii|ie/g, "i").replace(/oo|uu/g, "u").replace(/aa/g, "a").replace(/ai|ay|ei|ey/g, "e").replace(/au|ou/g, "o")
    .replace(/(.)\1+/g, "$1").replace(/([aeiou])h$/, "$1");
  if (k.length >= 5) k = k.replace(/(?:on|en)$/, "");
  const bare = k.replace(/[aeiouy]+$/, "");
  return bare.length >= 3 ? bare : k;
}

const groups = key => {
  const m = new Map();
  SYN.forEach((g, i) => g.split(" ").forEach(w => { const s = key(w); if (s.length < 3 && key !== stem) return; if (!m.has(s)) m.set(s, new Set()); m.get(s).add(i); }));
  return m;
};
const SYNMAP = groups(stem), HSYN = groups(w => hkey(stem(w)));
function share(map, a, b) {
  const A = map.get(a), B = map.get(b);
  if (!A || !B) return false;
  for (const x of A) if (B.has(x)) return true;
  return false;
}
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Every word an entry can be found by, with its weight and its spelling-free key.
const IDX = new WeakMap();
function indexOf(it) {
  let x = IDX.get(it);
  if (x) return x;
  const f = (s, w) => toks(s).map(t => { const st = stem(t); return [st, w, hkey(st)]; });
  const occ = OCCASIONS[it.occasion];
  x = [...f(it.name, it.kind === "note" ? 2 : 3), ...f(it.room, 2), ...f(it.spot, 2), ...f(it.notes, 1),
    ...f(it.kind === "note" ? "general info information jaankari note" : catLabel(it.category), 1), ...f(occ && occ.label, 1), ...f(it.place && it.place.label, 1)];
  IDX.set(it, x);
  return x;
}
function matchScore(q, t, qk, tk) {
  if (q === t) return 1;
  if (share(SYNMAP, q, t)) return .85;
  if (q.length >= 2 && t.startsWith(q)) return .8;
  if (qk.length >= 3) {
    if (qk === tk) return .75;                  // the same word spelt another way: pese, paise, पैसे
    if (share(HSYN, qk, tk)) return .7;         // a word that means the same, spelt any way: pese, money
  }
  if (q.length >= 4) { const m = q.length >= 7 ? 2 : 1; if (lev(q, t, m) <= m) return .6; }
  if (qk.length >= 4 && tk.length >= 4 && lev(qk, tk, 1) <= 1) return .5;
  if (q.length >= 3 && t.includes(q)) return .45;
  return 0;
}
// The words of a search that say something about the thing ("paise kahan rakhe hain" -> "paise").
export const queryTerms = query => [...new Set(toks(query).filter(t => !STOP.has(t)).map(stem))];

// Returns [{it, hit, score}] best first; `hit` is how many query words matched.
export function rank(query, items) {
  const qs = queryTerms(query).map(q => [q, hkey(q)]);
  if (!qs.length) return [];
  const out = [];
  for (const it of items) {
    let score = 0, hit = 0;
    for (const [q, qk] of qs) {
      let best = 0;
      for (const [t, w, tk] of indexOf(it)) { const s = matchScore(q, t, qk, tk) * w; if (s > best) best = s; }
      if (best > 0) { hit++; score += best; }
    }
    if (hit) out.push({it, hit, score, of: qs.length});
  }
  return out.sort((a, b) => b.hit - a.hit || b.score - a.score || String(b.it.keptAt).localeCompare(String(a.it.keptAt)));
}
export const searchItems = (query, items) => rank(query, items).slice(0, 40).map(r => r.it);

export function guessCategory(name) {
  const ts = toks(name);
  let best = "other", n = 0;
  for (const [id, , words] of CATS) {
    const ws = words.split(" ");
    const c = ts.filter(t => ws.includes(t)).length;
    if (c > n) { best = id; n = c; }
  }
  return best;
}
export function guessOccasion(name) {
  const ts = toks(name);
  for (const [k, o] of Object.entries(OCCASIONS)) if (o.words && o.words.split(" ").some(w => ts.includes(w))) return k;
  return null;
}
