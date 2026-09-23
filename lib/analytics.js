// Sends a GA4 event. Does nothing when gtag has not loaded (no GA id, blocked, or server render).
export function track(event, params) {
  try {
    if (typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", event, params);
  } catch {}
}

// "$1" -> 1, "$1,299.00" -> 1299
export function priceNumber(price) {
  return Number(String(price).replace(/[^0-9.]/g, "")) || 0;
}
