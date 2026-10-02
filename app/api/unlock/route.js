import { NextResponse } from "next/server";
import { savePaidOrder } from "@/lib/store";
import { paidOrderFromSessionId } from "@/lib/stripe";
import { signIn } from "@/lib/signin";

export const runtime = "nodejs";

// Called by the landing page when Stripe sends the buyer back with ?session_id=.
// Body: { sessionId }. The payment is checked with Stripe directly, so this does not
// wait for the webhook. Saving here is harmless if the webhook already did it.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return NextResponse.json({ ok: false, message: "Missing order." }, { status: 400 });
  }

  let order;
  try {
    order = await paidOrderFromSessionId(sessionId);
  } catch (err) {
    console.error("Stripe session lookup failed:", err.message);
    return NextResponse.json(
      { ok: false, message: "We could not confirm this payment. Sign in with your email and the receipt number from Stripe." },
      { status: 502 }
    );
  }
  if (!order) {
    return NextResponse.json({ ok: false, message: "This checkout was not paid, or was refunded." }, { status: 402 });
  }

  return signIn(request, await savePaidOrder(order));
}
