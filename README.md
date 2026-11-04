# Found It

A phone app for remembering where you put things, and anything else worth remembering.

- **Put something away**: type or say “Diwali lights in the blue trunk on the bedroom loft”, add a photo, and it fills in the item, room and spot.
- **General info**: anything else worth remembering: a number, a thought, something you saw, where you parked, “car mein paise rakhe hain”. Each entry keeps a photo, the date and, if you want, where you were.
- **Voice commands**: tap the big mic and speak. English (India) understands Hinglish too.
- **Search** forgives typos and understands Hinglish however it's spelt, and Hindi typed in Devanagari: “lihgts”, “pese kidhar hain”, “chaabhi”, “पैसे”, “bijli ka bill” (finds “electricity bill”). Words like “kahan”, “mein” and “hai” are ignored.
- **Coming up**: things tagged Diwali, Holi, Christmas, winter, summer or monsoon show on the home screen before you need them.
- **Taken out, then put back**: things you take out stay on the home screen until you record where they went back.
- **Shopping list**: things to buy stay at the top of the home screen until you tick them off; then delete them, or tap Put away to record where they went.
- **To-do list**: jobs work the same way, and a job with a day ("pay the bill tomorrow") shows under Coming up and gets a reminder.
- **Fix a line**: tap anything on the To buy or To do list to change its words (or its due day). Commas split it into separate lines.
- **Box labels**: print a QR label for a trunk, box or drawer (Settings › Box labels). Scanning it with the phone's camera shows what's inside, and lets you put something in without saying where.
- **Date kept**: every entry has the date you kept it, which you can set to an earlier day.
- **Phone reminders** for festivals, expiry dates, chosen dates and things not put back (Android, once installed).
- Works **offline** and stores everything **only on the phone**. Back it up from Settings.

## Things you can say

| Say | What happens |
|---|---|
| “I kept the passport in the steel almirah in the bedroom” | Saves it: Passport → Bedroom › Steel almirah |
| “Passport almari mein rakha hai” | Same, in Hinglish |
| “Where are the Diwali lights?” / “Passport kahan hai?” | Shows the answer and reads it aloud |
| “Note: the plumber's number is on the fridge” / “Info: …” | Saves it in General info |
| “Car parked on B2 near pillar 14” | Saves where the car is |
| “Remind me to renew the car insurance on 20 November” | Adds it to the to-do list with that day |
| “I took out the extension board” | Marks it as taken out |
| “I put the extension board back” | Puts it back in its usual place |
| “I put the lights back in the loft” | Puts it back somewhere new and keeps the old place in its history |
| “Buy AA batteries, bulbs and atta” / “Doodh aur bread lana hai” | Adds them to the shopping list |
| “We need sugar” / “Milk is finished” / “Doodh khatam ho gaya” / “Shopping list mein atta add karo” | Also add to the shopping list |
| “Bazaar se dudh laane hai, kele laane hain” / “Mujhe dudh aur bread chahiye” / “Aata paneer daliya gobhi” | Each thing becomes its own line on the list, even without commas |
| “I bought the batteries” / “Doodh le aaya” | Ticks them off the shopping list |
| “Read my shopping list” / “What do I need to buy?” / “Kya kya lana hai?” | Reads the shopping list aloud |
| “Call mom” / “Mummy ko phone lagao” | Opens the dialer with the number (link the name to a contact the first time) |
| “Car main paise rakhe hain” / “Info: Wi-Fi password is on the router” | Saves it so “paisa kahan hai?” finds it (tap **Save in General info instead** to keep the sentence as it is) |
| “I have to call mom tomorrow” / “Add pay the bill to my to-do list” / “Mummy ko call karna hai” | Adds to the to-do list, with the day if you said one |
| “What do I have to do?” / “Kya kya karna hai?” | Reads the to-do list aloud |
| “Electricity bill done” / “Plumber ko call kar diya” | Ticks it off the to-do list |

Answers can be in English or Hinglish (Settings › Voice › Answers in): “Passport bedroom mein hai”, “2 cheezein leni hain: dudh aur kele”.

**Calling**: say “call mom”, or tap the phone button on a to-do like “Call mom”. The first time, pick the person from your contacts (Chrome on Android) or type the number; it's saved on the phone and remembers the word you used. The dialer opens by itself with the number filled in; press its green call button. (Android lets an app other than the phone's own place a call only with phone permission, which a web app can't have, and opens the dialer only within a few seconds of a tap. If you paused for long before speaking, tap **Call** instead.) Manage numbers in Settings › People to call.

**All your contacts at once**: Chrome's contact picker lets you tick several people in one go but has no “select all” (on purpose, for privacy). To bring in everyone, export your contacts to a file from the phone's Contacts app (Google Contacts: Fix & manage › Export to file; Samsung Contacts: Manage contacts › Import or export contacts › Export), then in Found It tap Settings › People to call › **Import all contacts** and choose the .vcf file. Numbers you already saved keep their names, and the contact's name becomes a nickname. With many contacts, “call Rahul” lists every Rahul with its own Call button instead of guessing, and search shows contacts in their own group after your saved things. **Remove all** takes them out again; the phone's own contacts are never changed.

Spoken entries save after a 4-second countdown that you can cancel or edit. You can switch the countdown off in Settings. If something you meant to buy is about to be saved in General info, tap **Add to To buy instead**. The mic inside the To buy list adds everything you say straight to the list. Answers are read a little slower than normal speech; change the speed in Settings › Voice.

## Put it on your phone

The app is a set of plain files with no build step. A phone will only install it, and let it use the mic and location, when it comes from an **https** address. Two free ways to get one:

**Netlify Drop (about two minutes, no coding)**
1. Open https://app.netlify.com/drop on a computer and sign in.
2. Drag the whole `found-it-app` folder onto the page.
3. Netlify gives you an address like `https://something.netlify.app`. Open it on your phone.

**GitHub Pages**
1. Put this folder in a GitHub repository.
2. In the repository, open Settings › Pages, choose “Deploy from a branch”, pick the branch and folder, and save.
3. Open the `https://<you>.github.io/<repo>/` address on your phone.

Then install it:
- **Android (Chrome)**: tap **Install** on the app's home screen, or the browser menu › “Install app”. Long-press the icon for the Speak, General info and Put away shortcuts. Found It also appears in the Share menu, so you can share a link or text into General info.
- **iPhone (Safari)**: tap Share › “Add to Home Screen”.

## What works where

| Feature | Android Chrome | iPhone Safari |
|---|---|---|
| Install, offline, photos, search | Yes | Yes |
| Voice commands | Yes (needs internet; Google does the speech recognition) | Usually; if not, use the mic on the keyboard |
| Reading answers aloud | Yes | Yes |
| Location | Yes, after you allow it | Yes, after you allow it |
| Reminders when the app is closed | Yes, after you install the app and turn reminders on. Android decides when to check, about twice a day. | No. Use the Google Calendar link on an entry. |
| Share into Found It | Yes | No |

## Privacy

Entries, photos and places are stored in the browser's storage on the phone and are never uploaded. Voice input uses the phone's speech service (on Android that is Google's). Location is only read when you switch it on. Clearing the browser's site data, or uninstalling, deletes everything, so save a backup from Settings and keep the file somewhere safe.

## For developers

```
npm start        # serves the folder on http://localhost:5179
npm test         # parser, search, dates and reminder tests
npm run icons    # redraws the PNG icons
npm run label -- B001   # makes labels/box-B001.svg (to print) and .png for one box
```

- `js/parse.js`: sentence → item, room, spot; spoken command → intent; spoken dates
- `js/search.js`: typo- and synonym-tolerant search, with one key per Hindi word however it's spelt (Roman or Devanagari)
- `js/store.js`: IndexedDB storage, backup and restore
- `js/device.js`: speech recognition, speech output, location, contact picker and dialer
- `js/vcard.js`: reads a contacts file (.vcf) from Android, Google Contacts or iPhone; `js/people.js`: people to call
- `js/phrases.js`: every spoken answer, in English and Hinglish
- `js/reminders.js`: works out which notifications are due; `sw.js` shows them and keeps the app working offline
- `js/qr.js`: QR code generator for box labels (checked against an independent decoder); `js/boxes.js`: the box sheet
- `js/state.js`, `js/views.js`, `js/sheets.js`, `js/voice-ui.js`, `js/app.js`: the screens

When you change any file, bump `CACHE` in `sw.js` so installed phones pick up the new version.

Festival dates (Diwali to 2028, Holi to 2028) are in `js/data.js`. Add the next years there.
