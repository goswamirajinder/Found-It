// Works out which phone notifications are due. The page saves this list; the service worker shows each one once.
import {OCCASIONS, nextDate, addDays, daysBetween, today, fmtDate, ymd} from "./data.js";

const where = it => `${it.room || "Somewhere"}${it.spot ? " › " + it.spot : ""}`;
const later = (a, b) => (a > b ? a : b);

export function schedule(items, t = today()) {
  const out = [], groups = {};
  for (const it of items) if (it.kind !== "note" && it.occasion && it.occasion !== "date") (groups[it.occasion] ||= []).push(it);
  for (const [key, its] of Object.entries(groups)) {
    const d = nextDate(key, t);
    if (!d) continue;
    const o = OCCASIONS[key], days = daysBetween(t, d);
    out.push({
      key: `occ:${key}:${d}`, date: later(addDays(d, -7), t),
      title: days > 0 ? `${o.label} is ${days === 1 ? "tomorrow" : `in ${days} days`}. Here's where your things are.` : `${o.label} is here. Here's where your things are.`,
      body: its.slice(0, 4).map(i => `${i.name}: ${where(i)}`).join("\n") + (its.length > 4 ? `\n+${its.length - 4} more` : "")
    });
  }
  for (const it of items) {
    if (it.expiry) out.push({key: `exp:${it.id}:${it.expiry}`, date: addDays(it.expiry, -14), title: `${it.name} expires on ${fmtDate(it.expiry)}`, body: `Kept in ${where(it)}`});
    if (it.remindOn && !it.bought) {
      const [title, body] = it.kind === "note" ? ["Reminder", it.name] : it.kind === "todo" ? ["To do today", it.name] : [`You wanted the ${it.name} today`, `Kept in ${where(it)}`];
      out.push({key: `rem:${it.id}:${it.remindOn}`, date: it.remindOn, title, body});
    }
    if (it.kind !== "note" && it.status === "out" && it.outAt) out.push({key: `out:${it.id}:${it.outAt}`, date: addDays(ymd(new Date(it.outAt)), 3), title: `Did the ${it.name} go back?`, body: "Tap to record where you put it."});
  }
  return out;
}
