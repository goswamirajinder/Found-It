// Phone features: speech in and out, and location. Each one is optional and checked before use.

const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canListen = !!SR;
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
export const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;

// One utterance per call. onText gets the words so far; onDone gets the final sentence.
export function listen({lang = "en-IN", onText, onDone, onError}) {
  const r = new SR();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let finalText = "", over = false;
  r.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    onText((finalText + " " + interim).trim());
  };
  r.onerror = e => { if (over) return; over = true; onError(e.error || "error"); };
  r.onend = () => { if (over) return; over = true; onDone(finalText.trim()); };
  try { r.start(); } catch (e) { over = true; onError("start"); }
  return {stop: () => { try { r.stop(); } catch (e) { /* already stopped */ } }, cancel: () => { over = true; try { r.abort(); } catch (e) { /* already stopped */ } }};
}
export function voiceError(code) {
  if (code === "not-allowed" || code === "service-not-allowed") return "Microphone permission is off. Allow it in your browser's site settings, or type instead.";
  if (code === "no-speech") return "I didn't hear anything. Tap the mic and try again.";
  if (code === "network") return "Voice needs an internet connection on this phone. You can type instead.";
  if (code === "audio-capture") return "No microphone was found.";
  return "Voice input stopped. Tap the mic to try again.";
}
export function speak(text, lang = "en-IN", rate = 1) {
  if (!canSpeak || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voices = speechSynthesis.getVoices();
  const v = voices.find(x => x.lang === lang) || voices.find(x => x.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
export const stopSpeaking = () => { if (canSpeak) speechSynthesis.cancel(); };

export function locate() {
  return new Promise((res, rej) => {
    if (!canLocate) return rej({code: 0});
    navigator.geolocation.getCurrentPosition(
      p => res({lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy || 0)}),
      rej, {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
  });
}
export function distanceM(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
// A saved place counts as "here" within 150 m, or within the fix's accuracy when that is worse.
export function nearest(places, pos) {
  let best = null;
  for (const p of places) {
    const d = distanceM(p, pos);
    if (d <= Math.max(150, pos.acc || 0) && (!best || d < best.d)) best = {p, d};
  }
  return best ? best.p : null;
}
export const mapsUrl = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const placeText = p => !p ? "" : p.label || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
export function locError(e) {
  if (e && e.code === 1) return "Location permission is off for this app.";
  if (e && e.code === 3) return "Couldn't get a location fix in time.";
  return "Location isn't available right now.";
}
