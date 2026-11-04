// Run with: node tests/run.mjs
import assert from "node:assert/strict";
import {parseLine, parseCommand, parseWhen} from "../js/parse.js";
import {searchItems, guessCategory, guessOccasion} from "../js/search.js";
import {nextDate, whenText, daysBetween} from "../js/data.js";
import {schedule} from "../js/reminders.js";
import {qrMatrix} from "../js/qr.js";

let n = 0;
const t = (name, fn) => { fn(); n++; };
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

t("one-line sentences", () => {
  const cases = [
    ["Diwali lights in the blue trunk on top of the bedroom almirah", "Diwali lights", "Bedroom", "Blue trunk on top of the almirah"],
    ["passport in the steel almirah locker, master bedroom", "Passport", "Master bedroom", "Steel almirah locker"],
    ["Kept mom's BP tablets in kitchen drawer", "Mom's BP tablets", "Kitchen", "Drawer"],
    ["spare car keys - hall cabinet top drawer", "Spare car keys", "Hall", "Cabinet top drawer"],
    ["the extra charger is under the TV in the living room", "Extra charger", "Living room", "Under the TV"],
    ["Woollens in bed box, kids room", "Woollens", "Kids room", "Bed box"],
    ["Car parked at B2 pillar 14", "Car", "", "B2 pillar 14"],
    ["passport almari mein rakha hai", "Passport", "", "Almari"],
    ["diwali lights blue trunk mein rakhi", "Diwali lights", "", "Blue trunk"],
    ["car keys kitchen ki drawer mein", "Car keys", "Kitchen", "Drawer"],
    ["chabi ko table ke upar rakh diya", "Chabi", "", "On top of table"]
  ];
  for (const [line, name, room, spot] of cases) assert.deepEqual(pick(parseLine(line), ["name", "room", "spot"]), {name, room, spot}, line);
  assert.equal(parseLine("photos").where, false);
});

t("spoken commands", () => {
  const c = s => parseCommand(s);
  assert.equal(c("Where are my Diwali lights?").intent, "find");
  assert.equal(c("Where are my Diwali lights?").query, "my Diwali lights");
  assert.equal(c("passport kahan hai").intent, "find");
  assert.equal(c("where did I keep the passport").query, "the passport");
  assert.equal(c("I kept the passport in the steel almirah").intent, "keep");
  assert.equal(c("I kept the passport in the steel almirah").parsed.spot, "Steel almirah");
  assert.deepEqual(pick(c("Note buy batteries for the remote"), ["intent", "items"]), {intent: "buy", items: ["Batteries for the remote"]});
  assert.equal(c("Note the gas man comes on Monday").intent, "note");
  for (const s of ["The gas man comes on Monday", "Meeting at 5 pm", "Doctor appointment on 20 November", "Plumber coming tomorrow morning at 10 am"])
    assert.equal(c(s).intent, "note", s);
  assert.equal(c("Car parked at B2 pillar 14").intent, "keep");
  assert.equal(c("Note the gas man comes on Monday").text, "The gas man comes on Monday");
  assert.equal(c("Saw a nice brass lamp at Dilli Haat for 1200 rupees").intent, "note");
  assert.equal(c("Found the remote under the sofa cushion").intent, "keep");
  assert.equal(c("The plumber's number is 98100 12345").intent, "note");
  assert.deepEqual(pick(c("I took out the extension board"), ["intent", "query"]), {intent: "out", query: "extension board"});
  assert.deepEqual(pick(c("taking the diwali lights out for the balcony"), ["intent", "query"]), {intent: "out", query: "diwali lights"});
  assert.deepEqual(pick(c("I put the extension board back"), ["intent", "query"]), {intent: "back", query: "extension board"});
  assert.equal(c("I put the lights back in the loft").where.room, "Loft");
  assert.equal(c("extension board wapas rakh diya").intent, "back");
  assert.equal(c("lights nikal liya").intent, "out");
  assert.equal(c("remind me to renew the car insurance").remind, true);
});

t("shopping list", () => {
  const c = s => parseCommand(s);
  assert.deepEqual(pick(c("Add milk and eggs to the shopping list"), ["intent", "items"]), {intent: "buy", items: ["Milk", "Eggs"]});
  assert.deepEqual(c("buy AA batteries, bulbs and atta").items, ["AA batteries", "Bulbs", "Atta"]);
  assert.deepEqual(c("bazaar se doodh aur bread lana hai").items, ["Doodh", "Bread"]);
  assert.deepEqual(c("need to buy a new pressure cooker").items, ["New pressure cooker"]);
  assert.deepEqual(pick(c("I bought the batteries"), ["intent", "query"]), {intent: "bought", query: "batteries"});
  assert.deepEqual(pick(c("doodh le aaya"), ["intent", "query"]), {intent: "bought", query: "doodh"});
  assert.equal(c("I put the milk in the fridge").intent, "keep");
  for (const s of ["speak out my shopping list", "Read my shopping list", "What's on my shopping list?", "What do I need to buy?",
    "shopping list", "Tell me what to buy", "shopping list sunao", "kya kya lana hai", "Show me things to buy"]) assert.equal(c(s).intent, "list", s);
  assert.equal(c("shopping list: milk, eggs").intent, "buy");
  assert.equal(c("I need to buy milk").intent, "buy");
  assert.equal(c("Read my notes list").intent, "help");
  assert.equal(c("Tell Ramesh to fix the tap").intent, "note");
  const buys = [
    ["Add milk to the shopping list.", ["Milk"]], ["add to my shopping list eggs and bread", ["Eggs", "Bread"]],
    ["Put sugar on the shopping list", ["Sugar"]], ["Milk to buy", ["Milk"]], ["We need sugar and tea", ["Sugar", "Tea"]],
    ["We're out of tea.", ["Tea"]], ["Milk is finished", ["Milk"]], ["doodh khatam ho gaya", ["Doodh"]],
    ["shopping list mein atta add karo", ["Atta"]], ["Note buy batteries", ["Batteries"]], ["Remind me to buy a gift", ["Gift"]],
    ["Get bread and eggs", ["Bread", "Eggs"]], ["Bring 2 kg onions", ["2 kg onions"]], ["Buy AA batteries!", ["AA batteries"]],
    ["sabzi mangwani hai", ["Sabzi"]], ["दूध खरीदना है", ["दूध"]], ["Order a new gas cylinder", ["New gas cylinder"]]
  ];
  for (const [s, items] of buys) assert.deepEqual(pick(c(s), ["intent", "items"]), {intent: "buy", items}, s);
  assert.equal(c("Remind me to buy a gift on 20 November").intent, "note");
  assert.equal(c("Saw a nice lamp in the market").intent, "note");
  assert.notEqual(c("Get the passport out of the locker").intent, "buy");
  assert.deepEqual(pick(c("I got the milk"), ["intent", "query"]), {intent: "bought", query: "milk"});
  assert.equal(c("What do I need to buy").intent, "list");
  assert.equal(c("Where is my passport.").intent, "find");
});

t("box labels decode to the same text", () => {
  const {version, size} = qrMatrix("https://goswamirajinder.github.io/Found-It/?box=B001");
  assert.equal(version, 4);
  assert.equal(size, 33);
});

t("dates said out loud", () => {
  assert.deepEqual(pick(parseWhen("renew the car insurance tomorrow", "2026-11-03"), ["date", "rest"]), {date: "2026-11-04", rest: "renew the car insurance"});
  assert.equal(parseWhen("call the electrician in 3 days", "2026-11-03").date, "2026-11-06");
  assert.equal(parseWhen("pay school fees on 20 November", "2026-11-03").date, "2026-11-20");
  assert.equal(parseWhen("dentist on Jan 5th", "2026-11-03").date, "2027-01-05");
  assert.equal(parseWhen("buy batteries", "2026-11-03").date, null);
});

t("search", () => {
  const items = [
    {id: "1", kind: "item", name: "Diwali lights (2 sets)", room: "Loft", spot: "Blue tin trunk", notes: "", category: "festive", occasion: "diwali", keptAt: "2025-10-25"},
    {id: "2", kind: "item", name: "Telma 40 spare strips", room: "Kitchen", spot: "Medicine box", notes: "BP tablets", category: "medicine", keptAt: "2026-09-01"},
    {id: "3", kind: "item", name: "Passports", room: "Bedroom", spot: "Steel almirah locker", notes: "", category: "documents", keptAt: "2026-01-01"},
    {id: "4", kind: "note", name: "Car parked at B2 pillar 14", room: "", spot: "", notes: "", place: {label: "Ambience Mall"}, keptAt: "2026-11-01"}
  ];
  const top = q => (searchItems(q, items)[0] || {}).id;
  assert.equal(top("where are my diwali lihgts"), "1");
  assert.equal(top("jhalar"), "1");
  assert.equal(top("bp medicine"), "2");
  assert.equal(top("pasport"), "3");
  assert.equal(top("mera passport kahan hai"), "3");
  assert.equal(top("where did i park the car"), "4");
  assert.equal(top("ambience"), "4");
  assert.equal(guessCategory("Diwali lights and extension board"), "festive");
  assert.equal(guessOccasion("Kids' sweaters"), "winter");
});

t("festival dates", () => {
  assert.equal(nextDate("diwali", "2026-11-03"), "2026-11-08");
  assert.equal(nextDate("diwali", "2026-11-11"), "2027-10-29");
  assert.equal(whenText("winter", daysBetween("2026-11-03", nextDate("winter", "2026-11-03"))), "is here");
});

t("reminder schedule", () => {
  const items = [
    {id: "a", kind: "item", name: "Diwali lights", room: "Loft", spot: "Trunk", occasion: "diwali", status: "kept"},
    {id: "b", kind: "item", name: "BP tablets", room: "Kitchen", spot: "Box", expiry: "2026-12-15", status: "kept"},
    {id: "c", kind: "item", name: "Extension board", room: "Store room", spot: "", status: "out", outAt: "2026-11-01T09:00:00.000Z"},
    {id: "d", kind: "note", name: "Renew car insurance", remindOn: "2026-11-20"}
  ];
  const s = schedule(items, "2026-11-03");
  const by = k => s.find(x => x.key.startsWith(k));
  assert.equal(by("occ:diwali").date, "2026-11-03");
  assert.equal(by("exp:b").date, "2026-12-01");
  assert.equal(by("out:c").date, "2026-11-04");
  assert.equal(by("rem:d").date, "2026-11-20");
});

console.log(`${n} test groups passed`);
