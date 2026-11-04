// Reference data and small helpers shared by every screen. No DOM access at import time.

// Lunar festival dates checked against panchang listings; seasons use a fixed start day.
export const OCCASIONS = {
  diwali:   {label: "Diwali", dates: ["2026-11-08", "2027-10-29", "2028-10-17"], after: 2, words: "diwali deepavali deepawali dipawali depawali diya diyas diye rangoli jhalar ladi lantern kandil lakshmi toran fairy"},
  holi:     {label: "Holi", dates: ["2027-03-22", "2028-03-10"], after: 1, words: "holi pichkari pichkaari gulal abeer"},
  christmas:{label: "Christmas", md: "12-25", after: 1, words: "christmas xmas santa bauble baubles"},
  winter:   {label: "Winter", md: "11-01", after: 45, season: true, words: "winter sweater sweaters woollen woollens woolen woolens jacket jackets shawl shawls quilt quilts razai rajai blanket blankets heater thermal thermals muffler gloves kambal"},
  summer:   {label: "Summer", md: "04-01", after: 30, season: true, words: "summer cooler coolers sunscreen"},
  monsoon:  {label: "Monsoon", md: "06-15", after: 30, season: true, words: "monsoon umbrella umbrellas raincoat raincoats gumboots chhata chhatri"},
  date:     {label: "On a date"}
};

export const CATS = [
  ["medicine", "Medicine & health", "medicine medicines meds tablet tablets pill pills capsule capsules syrup dawai dawa inhaler ointment drops bandage thermometer glucometer oximeter bp insulin vitamin vitamins prescription prescriptions parchi report reports xray"],
  ["documents", "Documents", "passport passports aadhaar aadhar pan certificate certificates papers paper document documents file files deed registry will policy insurance marksheet marksheets degree licence license rc warranty warranties bill bills receipt receipts invoice invoices cheque cheques chequebook passbook fd agreement kagaz"],
  ["photos", "Photos & albums", "photo photos photograph photographs album albums picture pictures frame frames negatives"],
  ["festive", "Festive & seasonal", "diwali diya diyas rangoli lights jhalar lantern kandil holi pichkari christmas xmas decoration decorations toran garland rakhi puja pooja thali idol murti"],
  ["electronics", "Electronics", "charger chargers cable cables adapter adaptor remote phone mobile laptop headphones earphones earbuds battery batteries camera harddisk pendrive usb router extension powerbank torch bulb bulbs"],
  ["keys", "Keys", "key keys chabi chaabi chabhi kunji keychain keyring lock locks tala taala"],
  ["valuables", "Money & valuables", "money cash paisa paise rupees rupaye nakad jewellery jewelry gold sona silver chandi necklace ring rings angoothi bangles earrings chain watch ghadi coins gehne zevar locker"],
  ["clothes", "Clothes & bedding", "saree sarees sari lehenga suit suits kurta kurtas dupatta sweater sweaters woollens woolens jacket shawl quilt quilts razai blanket blankets bedsheet bedsheets curtains shoes chappal joote kapde kapda clothes uniform"],
  ["tools", "Tools & repair", "tool tools toolkit toolbox screwdriver hammer pliers spanner wrench drill glue fevicol nails screws ladder fuse"],
  ["kitchen", "Kitchen", "cooker mixer grinder utensils crockery tiffin flask kadhai tawa spices masala"],
  ["other", "Other", ""]
];
export const catLabel = id => (CATS.find(c => c[0] === id) || CATS[CATS.length - 1])[1];

// Words that mean the same thing, in English and in Hindi as people type it. Spelling variants (pese, chaabee, दवाई) are matched by search.js.
export const SYN = [
  "light lighting jhalar ladi fairy string led bulb serial", "diya diye deepak lamp candle",
  "diwali deepavali deepawali dipawali depawali divali", "almirah almira almari alamari cupboard wardrobe closet cabinet godrej",
  "loft tand parchhatti parchatti attic dochatti", "trunk box bakas baksa sandook sanduk peti tin suitcase dabba dibba",
  "drawer daraaz draz", "medicine meds tablet pill capsule syrup dawai dawa dava davai strip goli",
  "prescription parchi parcha rx", "bp pressure hypertension", "sugar diabetes glucometer",
  "document docs paper kagaz kaagaz kagzat file folder certificate", "passport visa", "aadhaar aadhar adhaar",
  "photo photograph picture pic album tasveer tasvir", "key chabi chaabi chabhi chaabhi keychain keyring kunji",
  "charger cable adapter adaptor wire", "scissor kainchi kenchi", "torch flashlight", "extension spike multiplug",
  "jewellery jewelry jewel gold ornament gehne gehna zevar sona", "warranty guarantee bill receipt invoice",
  "sweater woollen woolen jacket shawl muffler thermal", "quilt razai rajai blanket kambal comforter duvet",
  "umbrella chhata chhatri chata raincoat", "tool toolkit toolbox screwdriver hammer plier spanner wrench",
  "saree sari lehenga kurta dupatta", "kitchen rasoi", "puja pooja mandir temple", "living hall drawing lounge",
  "store storeroom storage godown", "spectacle glass specs chashma chasma ainak", "wallet purse batua",
  "paisa paise paison money cash rupee rupees rupaye rupaiye rupya naqad nakad rokda", "mom mummy mumma mummyji maa mother mammi mamma", "dad papa pitaji father daddy",
  "brother bhai bhaiya", "sister didi behen", "wife biwi patni", "husband pati", "son beta", "daughter beti",
  "cheque chequebook checkbook passbook", "insurance policy lic mediclaim bima", "christmas xmas",
  "holi pichkari pichkaari gulal", "battery cell", "car gaadi gadi", "parking parked park",
  "silver chandi chaandi", "ring angoothi anguthi", "earring jhumka jhumki kundal", "bangle chudi choodi kangan", "watch ghadi",
  "clothes clothing kapde kapda kapre kapra", "shoe joota joote juta chappal slipper sandal", "bag thaila thaili jhola", "book kitab kitaab",
  "bed palang bistar", "pillow takiya", "bottle botal", "mirror sheesha shisha aaina", "door darwaza darwaja", "window khidki khirki",
  "roof chhat", "stairs staircase ladder seedhi sidhi", "table mez mej", "chair kursi", "bucket balti", "fridge refrigerator",
  "electricity bijli bijlee", "water paani pani", "milk doodh dudh", "gas cylinder lpg", "number phone mobile contact",
  "password passcode pin", "rent kiraya", "doctor daktar", "hospital aspatal", "school vidyalaya", "market bazaar bazar mandi",
  "shop dukaan dukan", "house home ghar makaan makan", "office daftar", "scooter scooty activa", "bike motorcycle motorbike",
  "cycle bicycle saikil", "wedding marriage shaadi shadi vivah", "birthday janamdin", "gift tohfa", "sweets mithai",
  "rice chawal", "flour atta aata", "sugar cheeni chini shakkar", "salt namak", "oil tel", "tea chai", "vegetable sabzi sabji",
  "fruit phal", "tv television", "fan pankha", "lock tala taala", "bathroom washroom toilet", "neighbour neighbor padosi",
  "loan karz karza", "salary tankhwah tankha", "account khata", "information info jaankari jankari"
];

// Words a search or a spoken question carries that say nothing about the thing itself (English, Hinglish and Hindi).
export const STOP = new Set(("a an the my our your his her their of for to in on at is are was were where did do does i we you me it its kept keep put placed place " +
  "find found search look looking whats what which some any all with and or there here have has had been be can could should would please tell show " +
  "ko ka ki ke se ne mera meri mere kahan kaha kahaan kidhar hai hain rakha rakhi rakhe tha thi the gaya gayi maine humne " +
  "mein main mai mei par pe tak liye wala wali wale waala waali waale apna apni apne hamara hamari hamare tera teri tere tumhara tumhari " +
  "uska uski uske unka unki unke yeh ye woh wo vo kya kyaa kaun kab kaise kitna kitni kitne kis kisne kahin kahi he h ho hoga hogi " +
  "hua hui hue huye raha rahi rahe rakkha rakkhi rakkhe rakh pada padi pade liya aur ya bhi hi batao bataiye bata dikhao " +
  "dhundo dhoondo khojo karo kar karna kiya koi kuch abhi " +
  "मेरा मेरी मेरे कहाँ कहां किधर है हैं रखा रखी रखे था थी में मे पर पे का की के को से ने क्या कौन कब कैसे वाला वाली वाले और भी तो ही हुए हुआ हुई").split(" "));

// Room words the one-line parser recognises; rank 1 wins over 2 and 3 (a loft is usually inside a named room).
export const ROOM_WORDS = [["master bedroom", 1], ["guest bedroom", 1], ["guest room", 1], ["kids room", 1], ["kids bedroom", 1], ["children room", 1], ["bedroom", 1], ["bed room", 1], ["living room", 1], ["drawing room", 1], ["sitting room", 1], ["hall", 1], ["lounge", 1], ["kitchen", 1], ["dining room", 1], ["dining", 1], ["puja room", 1], ["pooja room", 1], ["mandir", 1], ["prayer room", 1], ["study room", 1], ["study", 1], ["store room", 1], ["storeroom", 1], ["storage room", 1], ["balcony", 1], ["verandah", 1], ["bathroom", 1], ["washroom", 1], ["garage", 1], ["office", 2], ["loft", 2], ["attic", 2], ["terrace", 2], ["car", 3]];
export const DEFAULT_ROOMS = ["Bedroom", "Kitchen", "Living room", "Puja room", "Store room", "Study", "Loft", "Balcony"];
export const STARTERS = ["Diwali lights", "Passports", "Spare keys", "Warranty cards", "BP tablets", "Old photo albums", "Woollens", "Prescription file"];

const PATHS = {
  medicine: '<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M5 4h14v4H5zM9 14.5h6M12 11.5v6"/>',
  documents: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  photos: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/>',
  festive: '<path d="M4 15c0 2.5 3.6 4 8 4s8-1.5 8-4z"/><path d="M12 13c-1.6-1-2-2.6-1-4.4.5-.9 1-1.6 1-2.6 1.6 1.2 2.6 2.7 2 4.6-.3 1.1-1 1.8-2 2.4z"/>',
  electronics: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  keys: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  valuables: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M12 20 9 9l1.5-5M12 20l3-11-1.5-5"/>',
  clothes: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 4.7 8 3z"/>',
  tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  kitchen: '<path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5"/>',
  other: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cart: '<circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/><path d="M3 4h2.2l2.3 11h11l2-8H6.3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  todo: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
  phone: '<path d="M6.5 3.5h3l1.6 4.4-2.1 1.3a10.5 10.5 0 0 0 5.8 5.8l1.3-2.1 4.4 1.6v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.5 5.6a2 2 0 0 1 2-2.1z"/>',
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>'
};
export const icon = (c, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[c] || PATHS.other}</svg>`;

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = n => String(n).padStart(2, "0");
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
export const fmtDate = s => parseYmd(s).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});
export const fmtDateTime = iso => iso ? new Date(iso).toLocaleString(undefined, {day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"}) : "";
export const shortDate = iso => iso ? new Date(iso).toLocaleDateString(undefined, {day: "numeric", month: "short"}) : "";
export function ago(iso) {
  if (!iso) return "";
  const d = daysBetween(ymd(new Date(iso)), today());
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 365) return `${Math.round(d / 30.4)} months ago`;
  const y = Math.round(d / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}
export function nextDate(key, t = today()) {
  const o = OCCASIONS[key];
  if (!o) return null;
  if (o.dates) return o.dates.find(d => daysBetween(t, d) >= -o.after) || null;
  if (o.md) {
    const y = +t.slice(0, 4);
    for (const yy of [y - 1, y, y + 1]) { const d = `${yy}-${o.md}`; if (daysBetween(t, d) >= -o.after) return d; }
  }
  return null;
}
export function whenText(key, days) {
  const o = OCCASIONS[key];
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  if (days === 0) return "today";
  return o && o.season ? "is here" : `${-days} day${days === -1 ? "" : "s"} ago`;
}
