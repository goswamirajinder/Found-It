// Forgiving search: typos, plurals, Hindi and Hinglish words, synonyms.
import {SYN, STOP, CATS, OCCASIONS, catLabel} from "./data.js";

export const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
export const toks = s => norm(s).split(" ").filter(Boolean);
export function stem(t) {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 4 && /(xes|ches|shes|sses|zes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !/(ss|us|is)$/.test(t)) return t.slice(0, -1);
  return t;
}

const SYNMAP = new Map();
SYN.forEach((g, i) => g.split(" ").forEach(w => { const s = stem(w); if (!SYNMAP.has(s)) SYNMAP.set(s, new Set()); SYNMAP.get(s).add(i); }));
function related(a, b) {
  const A = SYNMAP.get(a), B = SYNMAP.get(b);
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

const IDX = new WeakMap();
function indexOf(it) {
  let x = IDX.get(it);
  if (x) return x;
  const f = (s, w) => toks(s).map(t => [stem(t), w]);
  const occ = OCCASIONS[it.occasion];
  x = [...f(it.name, it.kind === "note" ? 2 : 3), ...f(it.room, 2), ...f(it.spot, 2), ...f(it.notes, 1),
    ...f(it.kind === "note" ? "note" : catLabel(it.category), 1), ...f(occ && occ.label, 1), ...f(it.place && it.place.label, 1)];
  IDX.set(it, x);
  return x;
}
function matchScore(q, t) {
  if (q === t) return 1;
  if (related(q, t)) return .85;
  if (q.length >= 2 && t.startsWith(q)) return .8;
  if (q.length >= 4) { const m = q.length >= 7 ? 2 : 1; if (lev(q, t, m) <= m) return .6; }
  if (q.length >= 3 && t.includes(q)) return .45;
  return 0;
}
export const queryTerms = query => [...new Set(toks(query).filter(t => !STOP.has(t)).map(stem))];

// Returns [{it, hit, score}] best first; `hit` is how many query words matched.
export function rank(query, items) {
  const qs = queryTerms(query);
  if (!qs.length) return [];
  const out = [];
  for (const it of items) {
    let score = 0, hit = 0;
    for (const q of qs) {
      let best = 0;
      for (const [t, w] of indexOf(it)) { const s = matchScore(q, t) * w; if (s > best) best = s; }
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
