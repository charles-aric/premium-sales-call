import { NextResponse } from "next/server";
import { findPaidOrder, findOrderIdByEmail } from "@/lib/store";
import { referenceMatches } from "@/lib/stripe";
import { signIn } from "@/lib/signin";

export const runtime = "nodejs";

// Body: { email, reference }. The receipt number from the Stripe receipt works as the password.
// Order references from older FastSpring purchases still work too.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.email || !body.reference) {
    return NextResponse.json({ ok: false, message: "Enter your email and receipt number." }, { status: 400 });
  }
  const email = String(body.email);
  const reference = String(body.reference);

  let found = await findPaidOrder({ email, reference });
  if (!found) {
    const orderId = await findOrderIdByEmail(email);
    if (orderId && (await referenceMatches(orderId, reference).catch(() => false))) {
      found = await findPaidOrder({ orderId });
    }
  }

  if (!found) {
    return NextResponse.json(
      { ok: false, message: "No purchase matches that email and receipt number. Check your receipt email from Stripe." },
      { status: 403 }
    );
  }
  return signIn(request, found);
}
