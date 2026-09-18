import { Redis } from "@upstash/redis";
import { SITE } from "./site";

// Vercel's Upstash integration adds KV_REST_API_*. A direct Upstash account uses UPSTASH_*.
let client;
function redis() {
  if (!client) {
    client = new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return client;
}

const paidKey = (orderId) => `paid:${orderId}`;
const devicesKey = (orderId) => `devices:${orderId}`;
const refKey = (reference, email) =>
  `ref:${String(reference).trim().toUpperCase()}|${String(email).trim().toLowerCase()}`;

// Called by the webhook when FastSpring reports a completed order.
export async function savePaidOrder(order) {
  const orderId = order.id || order.order;
  const email = String(order.customer?.email || "").trim().toLowerCase();
  const record = { email, reference: order.reference || "", live: order.live !== false, at: Date.now() };
  await redis().set(paidKey(orderId), record);
  if (record.reference && email) await redis().set(refKey(record.reference, email), orderId);
}

// Called by the webhook when FastSpring reports a refund.
export async function removePaidOrder(orderId) {
  const record = await redis().get(paidKey(orderId));
  if (!record) return;
  await redis().del(paidKey(orderId), devicesKey(orderId));
  if (record.reference && record.email) await redis().del(refKey(record.reference, record.email));
}

// Look up by order ID, or by email + order reference. Returns { orderId, record } or null.
export async function findPaidOrder({ orderId, reference, email }) {
  if (!orderId && reference && email) orderId = await redis().get(refKey(reference, email));
  if (!orderId || !/^[A-Za-z0-9_-]{10,40}$/.test(String(orderId))) return null;
  const record = await redis().get(paidKey(orderId));
  return record ? { orderId, record } : null;
}

export async function orderStillPaid(orderId) {
  return Boolean(await redis().exists(paidKey(orderId)));
}

// True if this browser may use the order. Registers it when a slot is free.
export async function claimDeviceSlot(orderId, deviceId) {
  const key = devicesKey(orderId);
  if (await redis().sismember(key, deviceId)) return true;
  if ((await redis().scard(key)) >= SITE.maxDevices) return false;
  await redis().sadd(key, deviceId);
  return true;
}
