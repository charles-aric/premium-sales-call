import {
  json, findPaidOrder, makeAccessCookie,
  getDeviceId, makeDeviceCookie, claimDeviceSlot,
} from "../../lib/shared.js";

const MESSAGES = {
  "pending": "We have not received confirmation of this payment yet. If you just paid, wait a minute and try again.",
  "not-found": "We could not find a payment with those details. Check the email and order reference on your receipt.",
  "test-order": "That is a test order. Test orders are switched off on this site.",
  "device-limit": "This purchase is already in use on the maximum number of devices. Contact us if you need it reset.",
};

// Body is either { orderId } right after checkout or from the access link,
// or { email, reference } from the "Already paid?" form.
// Paid orders are written to KV by /api/webhook. This route only reads them.
export async function onRequestPost({ request, env }) {
  if (!env.ACCESS_KV) return json({ ok: false, message: "Server setup is incomplete. The ACCESS_KV binding is missing." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Bad request." }, 400);
  }

  const byId = Boolean(body.orderId);
  if (!byId && !(body.email && body.reference)) {
    return json({ ok: false, message: "Enter your email and order reference." }, 400);
  }

  const found = await findPaidOrder(
    byId ? { orderId: String(body.orderId) } : { reference: String(body.reference), email: String(body.email) },
    env
  );

  if (!found) {
    // Right after checkout the webhook may still be on its way, so the page retries on 409.
    const reason = byId ? "pending" : "not-found";
    return json({ ok: false, reason, message: MESSAGES[reason] }, byId ? 409 : 403);
  }
  if (!found.record.live && env.ALLOW_TEST_ORDERS !== "true") {
    return json({ ok: false, reason: "test-order", message: MESSAGES["test-order"] }, 403);
  }

  const deviceId = getDeviceId(request);
  if (!(await claimDeviceSlot(found.orderId, deviceId, env))) {
    return json({ ok: false, reason: "device-limit", message: MESSAGES["device-limit"] }, 403);
  }
  return json({ ok: true, orderId: found.orderId }, 200, [
    await makeAccessCookie(found.orderId, env),
    makeDeviceCookie(deviceId),
  ]);
}
