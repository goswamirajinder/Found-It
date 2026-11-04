// Every sentence the app says back, in English or Hinglish (Settings › Voice › Answers in).
// Hinglish is written in Roman letters, the way people type it, and read aloud with an Indian English voice.

const EN = {
  and: "and",
  due: n => (n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : null),
  dueOn: d => `on ${d}`,
  notFound: q => `I couldn't find anything for “${q}”.`,
  noteFrom: (d, t) => `Your note from ${d}: ${t}`,
  onBuy: n => `${n} is on your shopping list.`,
  boughtOn: (n, d) => `You bought ${n} on ${d}.`,
  onTodo: (n, due) => `“${n}” is on your to-do list${due ? `, ${due}` : ""}.`,
  doneOn: (n, d) => `You ticked off “${n}” on ${d}.`,
  boxIn: (code, name, where) => `Box ${code}, ${name}, is in ${where}.`,
  itemIn: (n, where, d, out) => `${n} is in ${where}, kept on ${d}.${out ? ` It was taken out ${out}.` : ""}`,
  personIs: (n, tel) => `${n}: ${tel}.`,
  listEmpty: k => `Your ${k === "todo" ? "to-do list" : "shopping list"} is empty.`,
  listCount: (k, n) => `You have ${n} thing${n === 1 ? "" : "s"} ${k === "todo" ? "to do" : "to buy"}`,
  added: (k, names) => `Added ${names} to your ${k === "todo" ? "to-do list" : "shopping list"}.`,
  saved: (n, where) => `Saved. ${n}: ${where}.`,
  noted: "Noted.",
  notedRemind: d => `Noted. I'll remind you on ${d}.`,
  tickedBuy: n => `Ticked off ${n}. When you put it away, tap Put away next to it.`,
  tickedTodo: n => `Ticked off ${n}.`,
  outOk: n => `Okay. Tell me when the ${n} goes back.`,
  backSame: n => `Great, the ${n} is back in its place.`,
  backNew: (n, where) => `Updated. ${n}: ${where}.`,
  cancelled: "Cancelled. Nothing was saved.",
  help: "I can read out your shopping list or to-do list, find where something is, or call someone. Try “read my to-do list”, “where is my passport” or “call mom”.",
  callTap: n => `Tap the button to call ${n}.`,
  callUnknown: n => `I don't have a number for ${n} yet. Pick them from your contacts or type the number.`,
  didntCatch: "I didn't catch that. Tap the mic and try again.",
  tapCircle: k => `Tap a circle when it's ${k === "todo" ? "done" : "bought"}.`
};

const HI = {
  and: "aur",
  due: n => (n === 0 ? "aaj" : n === 1 ? "kal" : n === -1 ? "kal tha" : null),
  dueOn: d => `${d} ko`,
  notFound: q => `“${q}” nahi mila.`,
  noteFrom: (d, t) => `${d} ka note: ${t}`,
  onBuy: n => `${n} shopping list mein hai.`,
  boughtOn: (n, d) => `${n} ${d} ko le aaye the.`,
  onTodo: (n, due) => `“${n}” to-do list mein hai${due ? `, ${due}` : ""}.`,
  doneOn: (n, d) => `“${n}” ${d} ko ho gaya tha.`,
  boxIn: (code, name, where) => `Box ${code}, ${name}, ${where} mein hai.`,
  itemIn: (n, where, d, out) => `${n} ${where} mein hai. ${d} ko rakha tha.${out ? " Abhi bahar nikla hua hai." : ""}`,
  personIs: (n, tel) => `${n} ka number: ${tel}.`,
  listEmpty: k => `${k === "todo" ? "To-do list" : "Shopping list"} khaali hai.`,
  listCount: (k, n) => (k === "todo" ? `${n} kaam karne hain` : `${n} cheezein leni hain`),
  added: (k, names) => `Theek hai, ${names} ${k === "todo" ? "to-do list" : "shopping list"} mein daal diya.`,
  saved: (n, where) => `Save ho gaya. ${n}: ${where}.`,
  noted: "Note save ho gaya.",
  notedRemind: d => `Note save ho gaya. ${d} ko yaad dilaya jayega.`,
  tickedBuy: n => `${n} tick ho gaya. Rakhne ke baad Put away dabaiye.`,
  tickedTodo: n => `${n} ho gaya, tick kar diya.`,
  outOk: n => `Theek hai. ${n} wapas rakhne par bata dijiye.`,
  backSame: n => `Badhiya, ${n} apni jagah wapas aa gaya.`,
  backNew: (n, where) => `Badal diya. ${n}: ${where}.`,
  cancelled: "Theek hai, kuch save nahi kiya.",
  help: "Aap pooch sakte hain: “mera passport kahan hai”, “shopping list sunao”, “kya kya karna hai” ya “mummy ko call karo”.",
  callTap: n => `${n} ko call karne ke liye button dabaiye.`,
  callUnknown: n => `${n} ka number abhi save nahi hai. Contacts se chuniye ya number likhiye.`,
  didntCatch: "Samajh nahi aaya. Mic dabakar phir boliye.",
  tapCircle: k => `${k === "todo" ? "Kaam ho jaane" : "Saamaan aa jaane"} par gola dabaiye.`
};

export const phrases = lang => (lang === "hinglish" ? HI : EN);
export const joinWith = (names, and) => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`);
