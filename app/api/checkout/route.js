import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";
import { stripe } from "@/lib/stripe";
import { priceNumber } from "@/lib/analytics";

export const runtime = "nodejs";

// Starts a Stripe Checkout Session for the video and returns its URL.
// The price comes from SITE.price, so there is no product to set up in Stripe.
export async function POST(request) {
  const origin = new URL(request.url).origin;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(priceNumber(SITE.price) * 100),
          product_data: { name: SITE.productName },
        },
      }],
      metadata: { product: SITE.productPath },
      payment_intent_data: { metadata: { product: SITE.productPath } },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("Stripe checkout failed:", err.message);
    return NextResponse.json({ ok: false, message: "Checkout could not start. Try again in a moment." }, { status: 502 });
  }
}
