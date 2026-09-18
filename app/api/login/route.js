import { NextResponse } from "next/server";
import { findPaidOrder } from "@/lib/store";
import { signIn } from "@/lib/signin";

export const runtime = "nodejs";

// Body: { email, reference }. The order reference from the FastSpring receipt works as the password.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.email || !body.reference) {
    return NextResponse.json({ ok: false, message: "Enter your email and order reference." }, { status: 400 });
  }
  const found = await findPaidOrder({ email: String(body.email), reference: String(body.reference) });
  if (!found) {
    return NextResponse.json(
      { ok: false, message: "No purchase matches that email and order reference. Check your FastSpring receipt." },
      { status: 403 }
    );
  }
  return signIn(request, found);
}
