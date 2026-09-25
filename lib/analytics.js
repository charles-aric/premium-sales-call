// Sends a GA4 event. Does nothing when gtag has not loaded (no GA id, blocked, or server render).
export function track(event, params) {
  try {
    if (typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", event, params);
  } catch {}
}

// Sends a Meta Pixel standard event. eventID lets Meta dedupe it against a server-side event later.
export function pixel(event, params, eventID) {
  try {
    if (typeof window === "undefined" || !window.fbq) return;
    if (eventID) window.fbq("track", event, params, { eventID });
    else window.fbq("track", event, params);
  } catch {}
}

// "$1" -> 1, "$1,299.00" -> 1299
export function priceNumber(price) {
  return Number(String(price).replace(/[^0-9.]/g, "")) || 0;
}
