import { NextResponse } from "next/server";
import { findPaidOrder } from "@/lib/store";
import { signIn } from "@/lib/signin";

export const runtime = "nodejs";

// Called by the landing page right after the FastSpring popup closes.
// Body: { orderId }. The order is in Redis once the webhook has arrived.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.orderId) return NextResponse.json({ ok: false, message: "Missing order." }, { status: 400 });

  const found = await findPaidOrder({ orderId: String(body.orderId) });
  if (!found) {
    // The webhook can trail the popup by a few seconds. The page retries on 409.
    return NextResponse.json(
      { ok: false, message: "We have not received confirmation of this payment yet. Wait a minute, then sign in with your email and order reference." },
      { status: 409 }
    );
  }
  return signIn(request, found);
}
