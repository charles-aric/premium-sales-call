import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { claimDeviceSlot } from "./store";
import { setSessionCookie, cookieOptions } from "./session";

const MESSAGES = {
  "test-order": "That is a test order. Test orders are switched off on this site.",
  "device-limit": "This purchase is already signed in on the maximum number of devices. Contact us to reset it.",
};

// Shared last step of /api/unlock and /api/login. Applies the test-order rule and
// the device limit, then signs the browser in as the buyer's email.
export async function signIn(request, found) {
  if (!found.record.live && process.env.ALLOW_TEST_ORDERS !== "true") {
    return NextResponse.json({ ok: false, message: MESSAGES["test-order"] }, { status: 403 });
  }

  const existing = request.cookies.get("device")?.value;
  const deviceId = existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : crypto.randomUUID();
  if (!(await claimDeviceSlot(found.orderId, deviceId))) {
    return NextResponse.json({ ok: false, message: MESSAGES["device-limit"] }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, email: found.record.email });
  setSessionCookie(res, { orderId: found.orderId, email: found.record.email });
  res.cookies.set("device", deviceId, { ...cookieOptions, maxAge: 400 * 86400 });
  return res;
}
