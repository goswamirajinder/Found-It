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

const HI_PLACE_FIRST = /^(.+?)\s+(mein|me|main|par|pe|ke andar|ke upar|ke neeche|ke niche|ke peeche|ke paas)\s+(.+?)\s+(?:rakh[aie]|rakkh[aie]|pad[aie]|hai|hain)(?:\s+(?:hua|hue|hui|hai|hain|tha|the|thi))?$/i;

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
  // Hinglish that names the place first: "car main paise rakhe hain", "almari mein passport rakha hai".
  const pf = ex || m || hs ? null : s.match(HI_PLACE_FIRST);
  if (ex) { name = ex[1]; where = ex[2]; }
  else if (m) { name = m[1]; prep = m[2].toLowerCase(); where = m[3]; }
  else if (hs) { name = hs.name; where = hs.where; prep = HI_POST[hm[2].toLowerCase()]; }
  else if (pf) { name = pf[3]; where = pf[1]; prep = HI_POST[pf[2].toLowerCase()]; }
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
// With `hi`, Hinglish days count too ("kal" = tomorrow, as it means in a to-do).
export function parseWhen(text, t = today(), hi = false) {
  const s = String(text || "");
  const out = (date, re) => ({date, rest: tidyRest(s.replace(re, " ")), tomorrow: addDays(t, 1)});
  let m;
  if ((m = s.match(/\b(?:on\s+)?the day after tomorrow\b|\bday after tomorrow\b/i))) return out(addDays(t, 2), m[0]);
  if ((m = s.match(/\b(?:on\s+)?tomorrow\b/i))) return out(addDays(t, 1), m[0]);
  if ((m = s.match(/\b(?:later\s+)?today\b|\btonight\b/i))) return out(t, m[0]);
  if (hi && (m = s.match(/\bparson\b/i))) return out(addDays(t, 2), m[0]);
  if (hi && (m = s.match(/\bkal\b/i))) return out(addDays(t, 1), m[0]);
  if (hi && (m = s.match(/\baaj\b/i))) return out(t, m[0]);
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

// "atta, rice and dal" -> ["Atta", "Rice", "Dal"]
export function splitList(s) {
  return String(s || "").split(/\s*(?:,|;|&|\band\b|\baur\b|\bplus\b)\s*/i)
    .map(x => x.trim().replace(/^(?:some|a|an|the|more|kuch)\s+/i, "").replace(/[.!]+$/, "")).filter(Boolean).map(cap);
}
// Every way people say "put it on the shopping list", in English, Hinglish and Hindi. The first capture is the things.
const LISTW = "(?:(?:shopping|grocery|groceries|buying|to-buy|to buy|purchase|buy)(?:\\s+list)?|(?:market|saman|samaan|kharidari)\\s+list)";
const TO = "(?:to|in|on|into|onto)\\s+(?:the\\s+|my\\s+|our\\s+)?";
const BUY_RES = [
  new RegExp(`^(?:add|put|write|include|daal|dalo|daalo|likho|jodo)\\s+(.+?)\\s+${TO}${LISTW}$`, "i"),
  new RegExp(`^(?:add|put|write)\\s+${TO}${LISTW}[:,\\s-]+(.+)$`, "i"),
  new RegExp(`^(.+?)\\s+${TO}${LISTW}$`, "i"),
  new RegExp(`^${LISTW}\\s+(?:mein|me|main|par|pe)\\s+(.+?)(?:\\s+(?:add|daal|dalo|daalo|likho|likh do|jodo)(?:\\s+(?:karo|kar do|do|dena))?)?$`, "i"),
  /^(?:i\s+|we\s+)?(?:need to buy|have to buy|must buy|should buy|want to buy|to buy|buy|purchase|order|bring|pick up)\b[:,\s-]+(.+)$/i,
  /^(?:shopping list|shopping|grocery list|groceries|market list|to buy list|buy list)\b[:,\s-]+(.+)$/i,
  /^get\s+(?!.*\b(?:out|from|of|for|at|in|on|to|back|up|ready|done|home)\b)(.{1,40})$/i,
  /^(?:i|we)\s+need\s+(?!to\b)(.+)$/i,
  /^(?:we(?:'re| are)|i(?:'m| am))\s+(?:out of|running out of|running low on)\s+(.+)$/i,
  /^(.+?)\s+(?:is|are|has|have)\s+(?:finished|over|empty|run out|running out|running low|got over)$/i,
  /^(.+?)\s+(?:to buy|to be bought|needed)$/i,
  /^(.+?)\s+(?:khatam|khatm|khtm)\s+(?:ho gaya|ho gayi|ho gaye|ho gya|ho gyi|hai|ho raha hai)$/i,
  /^(.+?)\s+(?:खरीदना|ख़रीदना|खरीदनी|लाना|लानी|ले आना|मंगाना|मँगाना)(?:\s+(?:है|हैं))?$/,
  /^(.+?)\s+(?:खत्म|ख़त्म)\s+(?:हो गया|हो गई|हो गयी)(?:\s+है)?$/
];

// Hinglish as the phone's speech service writes it: "Mazar se dudh laane Hai kele laane Hain amrud Jaane Hain".
// Each "laane hai" ends one thing, "bazaar" is often heard as "mazar", and "laane" as "jaane".
const BUY_VERB_HI = "(?:laane|lane|lana|lani|laana|laani|lao|le aana|le aao|le ana|lekar aana|le kar aana|lete aana|lete aao|lena|leni|lene|kharidna|kharidni|kharidne|kharid lo|kharido|kharid lena|mangana|mangwana|mangani|mangwani|manga lo|mangwa lo|chahiye|chahie|chaiye)(?:\\s+(?:hai|hain|he|h|ho))?";
const HI_BUY = new RegExp(`\\s${BUY_VERB_HI}(?=[\\s,]|$)`, "i");
const HI_BUY_ALL = new RegExp(`\\s${BUY_VERB_HI}(?=[\\s,]|$)|\\s(?:jaane|jane|jaana|jana)\\s+(?:hai|hain|he)(?=[\\s,]|$)|\\s(?:la|le)$`, "gi");
const MARKET_SE = /\b(?:bazaar|bazar|bajar|bajaar|mazar|market|mandi|dukaan|dukan|shop|store|supermarket)\s+(?:se|say|sey)\b/gi;
const FOR_WHOM = /\b(?:mujhe|muje|hume|humein|hamein|hamko|mere liye|ghar ke liye)\b/gi;
const cleanBuy = s => s.replace(MARKET_SE, " ").replace(HI_BUY_ALL, ",").replace(FOR_WHOM, " ").replace(/\s+/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");

// Everyday grocery and household words, so a spoken list with no commas ("aata paneer daliya gobhi") splits into things.
const GROCERY = ("aata atta ata chawal rice dal daal daliya dalia paneer dudh doodh milk dahi curd yogurt makhan butter ghee tel oil cheeni chini sugar " +
  "namak salt chai tea coffee bread pav anda ande egg eggs sabzi sabji aloo alu potato potatoes pyaz pyaaz onion onions tamatar tomato tomatoes " +
  "gobhi gobi cauliflower cabbage bhindi okra matar peas palak spinach methi gajar carrot carrots mooli baingan brinjal lauki tori karela " +
  "capsicum mirch chilli chillies adrak ginger lahsun garlic dhaniya coriander pudina mint nimbu lemon lemons kela kele banana bananas seb apple apples " +
  "santra orange oranges angoor grapes aam mango mangoes amrud guava papita papaya anar pomegranate tarbooz watermelon kharbooja nariyal coconut " +
  "besan suji sooji rava maida poha rajma chana chole moong masoor urad arhar toor haldi turmeric jeera cumin rai saunf elaichi laung masala " +
  "biscuit biscuits namkeen maggi noodles pasta ketchup jam cheese cream juice cornflakes oats honey shahad " +
  "sabun soap shampoo detergent surf toothpaste brush harpic phenyl tissue tissues foil agarbatti matchbox batteries battery bulb bulbs candles").split(" ");
const GSET = new Set(GROCERY);
const GMULTI = ["chai patti", "shimla mirch", "hari mirch", "lal mirch", "green chilli", "kali mirch", "sarson tel", "sarson ka tel", "olive oil",
  "brown bread", "toned milk", "dish wash", "dishwash bar", "washing powder", "toilet cleaner", "garbage bags", "gas cylinder"].map(p => p.split(" "));
const UNIT = /^(?:\d+(?:\.\d+)?|half|aadha|aadhi|ek|do|teen|char|paanch|one|two|three|four|five|six|dozen|darjan|kg|kilo|kilos|g|gm|gram|grams|l|ltr|litre|litres|liter|liters|ml|packet|packets|pack|packs|piece|pieces|pcs|bottle|bottles|dabba|bag|bags|bunch|gaddi)$/i;
const low = w => w.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "");
function vocabSplit(part) {
  const w = part.split(/\s+/).filter(Boolean), lw = w.map(low);
  if (lw.filter(x => GSET.has(x)).length < 2) return [part];
  const items = [];
  let pre = [];
  for (let i = 0; i < w.length;) {
    let len = GSET.has(lw[i]) ? 1 : 0;
    for (const mw of GMULTI) if (mw.length > len && mw.every((t, k) => lw[i + k] === t)) len = mw.length;
    if (len) { items.push([...pre, ...w.slice(i, i + len)]); pre = []; i += len; continue; }
    // "dudh 2 litre": amounts belong to the thing before them; other words lead into the next thing ("brown bread").
    if (UNIT.test(lw[i]) && items.length && !pre.length) items[items.length - 1].push(w[i]);
    else pre.push(w[i]);
    i++;
  }
  if (pre.length) { if (items.length) items[items.length - 1].push(...pre); else items.push(pre); }
  return items.map(x => x.join(" "));
}
export const splitItems = s => splitList(s).flatMap(vocabSplit).map(cap);
// Only grocery words (and amounts): a spoken list with nothing else, like "aata paneer daliya gobhi".
function groceryOnly(t) {
  const ws = t.split(/[\s,]+/).map(low).filter(x => x && !/^(?:and|aur|plus)$/.test(x));
  const known = ws.filter(x => GSET.has(x)).length;
  return known >= 2 && ws.every(x => GSET.has(x) || UNIT.test(x) || GMULTI.some(m => m.includes(x))) ? splitItems(t) : null;
}

// The things to buy in a sentence, or null when it isn't about shopping.
export function buyItems(t) {
  for (const re of BUY_RES) {
    const m = t.match(re);
    if (m) { const items = splitItems(cleanBuy(m[1])); if (items.length) return items; }
  }
  if (HI_BUY.test(t)) { const items = splitItems(cleanBuy(t)); if (items.length) return items; }
  return null;
}
const BOUGHT = /^(?:i\s+(?:have\s+|just\s+)?|we\s+(?:have\s+)?)?(?:bought|purchased|got)\s+(?:the\s+)?(.+?)(?:\s+(?:from|at)\s+.+)?$/i;
const BOUGHT_HI = /^(.+?)\s+(?:le aaya|le aayi|le aaye|le aya|le ayi|kharid liya|kharid li|kharid liye)(?:\s+(?:hai|hain))?$/i;

// Asking to hear the list: "speak out my shopping list", "what do I need to buy?", "kya kya lana hai".
const LIST_ASK = /^(?:please\s+)?(?:speak|read|tell|show|say|give|list|open|what|which|sunao|suna|batao|bata|dikhao|bolo)\b|\b(?:sunao|suna do|batao|bata do|dikhao|bolo)$/i;
const LIST_WHAT = /\b(?:shopping|grocery|groceries|market|to[- ]?buy|buying)(?:\s+list)?\b|\b(?:need|have|got) to buy\b|\bshould (?:i|we) buy\b/i;
const LIST_HI = /\bkya(?:\s+kya)?\s+(?:lana|lani|laana|kharidna|kharidni)\s+(?:hai|hain|he)\b/i;
const WHEN_RE = /^(?:the\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tonight|tomorrow|morning|evening|night|afternoon|weekend|next\s+\w+|this\s+\w+|\d{1,2}(?::\d{2})?\s*(?:am|pm|o'?clock|baje)|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\b/i;
// To-dos: "add call the plumber to my to-do list", "I have to pay the bill tomorrow", "mummy ko call karna hai".
const TODOW = "(?:to[- ]?do|todo|tasks?|kaam)(?:\\s+list)?";
const TODO_RES = [
  new RegExp(`^(?:add|put|write|include|daal|dalo|daalo|likho|jodo)\\s+(.+?)\\s+${TO}${TODOW}$`, "i"),
  new RegExp(`^(?:add|put|write)\\s+${TO}${TODOW}[:,\\s-]+(.+)$`, "i"),
  new RegExp(`^(.+?)\\s+${TO}${TODOW}$`, "i"),
  new RegExp(`^${TODOW}\\s+(?:mein|me|main)\\s+(.+?)(?:\\s+(?:add|daal|dalo|daalo|likho|likh do|jodo)(?:\\s+(?:karo|kar do|do|dena))?)?$`, "i"),
  /^(?:to[- ]?do|todo|tasks?)\b[:,\s-]+(.+)$/i,
  /^(?:i|we)\s+(?:have to|need to|must|should|ought to|got to|gotta)\s+(?!buy\b)(.+)$/i,
  /^(?:remind me to|don't forget to|do not forget to|remember to|reminder to)\s+(?!buy\b)(.+)$/i,
  /^(.+?\s+\S+(?:na|ni|ne))\s+(?:hai|hain|he)$/i
];
const splitTodos = s => String(s || "").split(/\s*(?:[,;]|\band then\b|\bthen\b|\bphir\b|\buske baad\b)\s*/i).map(x => x.trim()).filter(Boolean);
// The jobs in a sentence, each with the day it's due if one was said; null when it isn't a to-do (unless `any`).
export function todoItems(t, any = false) {
  let body = null;
  for (const re of TODO_RES) { const m = t.match(re); if (m) { body = m[1]; break; } }
  if (body === null) { if (!any) return null; body = t; }
  const out = splitTodos(body).map(x => { const w = parseWhen(x, today(), true); return {name: cap(w.date ? w.rest : x), remindOn: w.date}; }).filter(x => x.name);
  return out.length ? out : null;
}
const DONE_RES = [
  /^(?:done|finished|completed|mark|tick off|tick|cross off|strike off)\s+(?:the\s+)?(.+?)(?:\s+(?:as\s+)?(?:done|complete|completed|finished|off))?$/i,
  /^(?:i|we)\s+(?:have\s+)?(?:done|finished|completed)\s+(?:the\s+)?(.+)$/i,
  /^(.+?)\s+(?:is\s+|are\s+|has been\s+)?(?:done|completed|finished|ho gaya|ho gayi|ho gaye|kar diya|kar di|kar liya|kar li|kar dia)$/i
];
// Asking to hear the to-do list: "read my to-do list", "what do I have to do?", "kya kya karna hai".
const TODO_WHAT = /\b(?:to[- ]?do|todo|tasks?)(?:\s+list)?\b|\bwhat (?:do|should|must) (?:i|we) (?:have to )?do\b|\bwhat(?:'s| is) (?:on )?(?:my|the) (?:agenda|schedule|plan)\b/i;
const TODO_HI = /\bkya(?:\s+kya)?\s+karna\s+(?:hai|hain)\b|\bkaam\s+(?:batao|sunao|bolo)\b/i;
// A request to the app that matched nothing else must not end up saved as a note.
const APP_ASK =/^(?:please\s+)?(?:speak|read|tell me|show|open|play|sunao|batao|dikhao)\b.*\b(?:list|notes|boxes|everything)\b/i;

// One sentence in, one intent out: find | keep | note | out | back | buy | bought | list | todo | todo-list | done | help | none.
export function parseCommand(raw, knownRooms = []) {
  const said = String(raw || "").replace(/\s+/g, " ").trim().replace(/^(?:ok(?:ay)?|hey|hi|hello|please|found it)[,.!\s]+/i, "");
  // Phones often add a full stop or question mark; remember the question, then match on the bare words.
  const asked = /\?\s*$/.test(said), text = said.replace(/[\s.!?।]+$/, "");
  if (!text) return {intent: "none", text};
  let m = text.match(/^(?:note(?: down| that)?|make a note(?: that| of)?|remember(?: that)?|remind me(?: to| that| about)?|idea|reminder|general information|general info|general jaankari|info|information|jaankari|jankari|yaad rakhna|yaad rakho)\b[:,\s-]*(.*)$/i);
  // "Call mom", "mummy ko phone lagao": ring someone now. With a day it's a job for later.
  const call = text.match(/^(?:call|phone|ring|dial|give a call to|make a call to)\s+(?:to\s+)?(.+?)(?:\s+(?:now|abhi))?$/i) || text.match(/^(.+?)\s+ko\s+(?:call|phone|fone|ring)\s+(?:karo|kar do|lagao|laga do|milao|mila do)$/i);
  if (call && !m) {
    const when = parseWhen(text, today(), true);
    if (when.date) return {intent: "todo", items: [{name: cap(when.rest), remindOn: when.date}], text};
    return {intent: "call", who: call[1].replace(/^(?:the|my)\s+/i, "").trim(), text};
  }
  if (m && m[1]) {
    // "Note: buy milk" and "remind me to buy batteries" belong on the shopping list, unless a date was said.
    const items = buyItems(m[1]) || (/^remind me to buy\b/i.test(text) ? splitItems(m[1].replace(/^buy\s+/i, "")) : null);
    if (items && !parseWhen(m[1]).date) return {intent: "buy", items, text};
    // "Remind me to call mom tomorrow" is a job to do, with its day.
    if (/^(?:remind me to|remember to|reminder to)\b/i.test(text) || (/^remind me\b/i.test(text) && parseWhen(m[1]).date)) {
      const todos = todoItems(m[1], true);
      if (todos) return {intent: "todo", items: todos, text};
    }
    return {intent: "note", text: cap(m[1]), remind: /^remind me/i.test(text)};
  }
  if (LIST_HI.test(text) || (LIST_WHAT.test(text) && (LIST_ASK.test(text) || asked || /^(?:my\s+|the\s+)?(?:shopping|grocery|market)\s+list$/i.test(text)))) return {intent: "list", text};
  if (TODO_HI.test(text) || (TODO_WHAT.test(text) && (LIST_ASK.test(text) || asked || /^(?:my\s+|the\s+)?(?:to[- ]?do|todo|tasks?)(?:\s+list)?$/i.test(text)))) return {intent: "todo-list", text};
  if (/^(?:i\s+)?(?:saw|seen|spotted|noticed|liked|loved|met|heard|thinking|idea)\b/i.test(text)) return {intent: "note", text: cap(text)};
  const items = buyItems(text);
  if (items) return {intent: "buy", items, text};
  m = text.match(BOUGHT) || text.match(BOUGHT_HI);
  if (m) return {intent: "bought", query: m[1], text};
  if (FIND_RE.test(text) || FIND_HI.test(text) || asked) return {intent: "find", query: findQuery(text), text};
  const todos = todoItems(text);
  if (todos) return {intent: "todo", items: todos, text};
  for (const re of DONE_RES) { m = text.match(re); if (m) return {intent: "done", query: m[1], text}; }
  m = text.match(/^(?:i\s+(?:have\s+|just\s+|am\s+)?)?(?:put|placed|kept|keep|putting)\s+(?:the\s+)?(.+?)\s+back\b(?:\s+(?:in|on|at|into|inside)\s+(.+))?$/i)
    || text.match(/^(?:i\s+(?:have\s+)?)?(?:returned|put back|kept back)\s+(?:the\s+)?(.+?)(?:\s+(?:in|on|at|into|inside)\s+(.+))?$/i);
  if (m) return {intent: "back", query: m[1], where: m[2] ? parseLine(`x in ${m[2]}`, knownRooms) : null, text};
  m = text.match(/^(.+?)\s+wapas\s+rakh(?:\s+(?:diya|di|dia|diye))?(?:\s+hai)?$/i);
  if (m) return {intent: "back", query: m[1].replace(/\s+ko$/i, ""), where: null, text};
  m = text.match(/^(?:i\s+(?:have\s+|just\s+|am\s+)?)?(?:took|take|taking|taken|removed?|removing)\s+(?:out\s+)?(?:the\s+)?(.+?)(?:\s+out)?(?:\s+(?:for|to)\s+.+)?$/i);
  if (m) return {intent: "out", query: m[1], text};
  m = text.match(/^(.+?)\s+(?:nikala|nikali|nikale|nikal liya|nikal li|nikaal liya|nikaala)(?:\s+hai)?$/i);
  if (m) return {intent: "out", query: m[1].replace(/\s+ko$/i, ""), text};
  if (APP_ASK.test(text)) return {intent: "help", text};
  const p = parseLine(text, knownRooms);
  // "The gas man comes on Monday": a day or a time is not a place, so that's a note.
  if (p && p.where && !p.room && WHEN_RE.test(p.spot.replace(/^(?:on|at|in|by)\s+/i, ""))) return {intent: "note", text: cap(text)};
  if (p && p.where && p.name) return {intent: "keep", parsed: p, text};
  if (/^(?:i\s+(?:have\s+|'ve\s+|just\s+)?)?(?:kept|put|placed|stored|hid)\b/i.test(text) && p) return {intent: "keep", parsed: p, text};
  const groceries = groceryOnly(text);
  if (groceries) return {intent: "buy", items: groceries, text};
  return {intent: "note", text: cap(text)};
}
