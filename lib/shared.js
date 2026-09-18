// Shared helpers for the three API routes.
// Everything here runs on Cloudflare Pages Functions, no npm packages needed.

const COOKIE_NAME = "access";
const COOKIE_DAYS = 30;

export function json(body, status = 200, cookies = []) {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

/* ---------- signed cookie ---------- */

const enc = new TextEncoder();

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(text, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeAccessCookie(orderId, env) {
  const expires = Date.now() + COOKIE_DAYS * 86400 * 1000;
  const payload = b64url(enc.encode(`${orderId}|${expires}`));
  const sig = await sign(payload, env.COOKIE_SECRET);
  return `${COOKIE_NAME}=${payload}.${sig}; Path=/; Max-Age=${COOKIE_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

// Returns the order ID if the visitor holds a valid, unexpired cookie. Otherwise null.
export async function readAccess(request, env) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(COOKIE_NAME + "="));
  if (!match) return null;
  const [payload, sig] = match.slice(COOKIE_NAME.length + 1).split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await sign(payload, env.COOKIE_SECRET))) return null;
  try {
    const text = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const [orderId, expires] = text.split("|");
    return Number(expires) > Date.now() ? orderId : null;
  } catch {
    return null;
  }
}

/* ---------- device limit ---------- */

// Each browser gets a random device ID in a long-lived cookie. For every order we
// keep the list of device IDs in Cloudflare KV and refuse new ones past the limit.
// This is what stops a shared link or shared receipt from unlocking the video for a crowd.

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return match ? match.slice(name.length + 1) : null;
}

export function getDeviceId(request) {
  const existing = readCookie(request, "device");
  return existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : crypto.randomUUID();
}

export function makeDeviceCookie(deviceId) {
  return `device=${deviceId}; Path=/; Max-Age=${400 * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

// Returns true if this device may watch. Registers the device if there is a free slot.
export async function claimDeviceSlot(orderId, deviceId, env) {
  const max = Number(env.MAX_DEVICES) || 3;
  const key = `order:${orderId}`;
  const record = (await env.ACCESS_KV.get(key, "json")) || { devices: [] };
  if (record.devices.includes(deviceId)) return true;
  if (record.devices.length >= max) return false;
  record.devices.push(deviceId);
  await env.ACCESS_KV.put(key, JSON.stringify(record));
  return true;
}

/* ---------- FastSpring webhook ---------- */

// FastSpring signs every webhook with HMAC-SHA256 of the raw body, base64 encoded,
// in the X-FS-Signature header. The key is the secret you type into the webhook settings.
export async function webhookSignatureIsValid(rawBody, signature, env) {
  if (!signature || !env.FS_WEBHOOK_SECRET) return false;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(env.FS_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  let bin = "";
  for (const b of mac) bin += String.fromCharCode(b);
  return safeEqual(btoa(bin), signature.trim());
}

/* ---------- paid orders in KV ---------- */

const paidKey = (orderId) => `paid:${orderId}`;
const refKey = (reference, email) =>
  `ref:${String(reference).trim().toUpperCase()}|${String(email).trim().toLowerCase()}`;

export async function savePaidOrder(order, env) {
  const orderId = order.id || order.order;
  const email = (order.customer && order.customer.email) || "";
  const record = { reference: order.reference || "", email, live: order.live !== false, at: Date.now() };
  await env.ACCESS_KV.put(paidKey(orderId), JSON.stringify(record));
  if (record.reference && email) await env.ACCESS_KV.put(refKey(record.reference, email), orderId);
}

export async function removePaidOrder(orderId, env) {
  const record = await env.ACCESS_KV.get(paidKey(orderId), "json");
  if (!record) return;
  await env.ACCESS_KV.delete(paidKey(orderId));
  if (record.reference && record.email) await env.ACCESS_KV.delete(refKey(record.reference, record.email));
}

// Returns { orderId, record } or null.
export async function findPaidOrder({ orderId, reference, email }, env) {
  if (!orderId && reference && email) orderId = await env.ACCESS_KV.get(refKey(reference, email));
  if (!orderId || !/^[A-Za-z0-9_-]{10,40}$/.test(orderId)) return null;
  const record = await env.ACCESS_KV.get(paidKey(orderId), "json");
  return record ? { orderId, record } : null;
}

// True while the order is still in KV. A refund removes it, which cuts access
// even for browsers that already hold a cookie.
export async function orderStillPaid(orderId, env) {
  return Boolean(await env.ACCESS_KV.get(paidKey(orderId)));
}
