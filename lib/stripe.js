import Stripe from "stripe";
import { SITE } from "./site";

let client;
export function stripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  return client;
}

// Turns a Checkout Session into the order record the store keeps, or null when the
// session is for another product or has not been paid. The PaymentIntent ID is the order ID,
// because refunds arrive on the charge, which points back to it.
export function orderFromSession(session) {
  if (session.metadata?.product !== SITE.productPath) return null;
  if (session.payment_status !== "paid") return null;
  const pi = session.payment_intent;
  const orderId = typeof pi === "string" ? pi : pi?.id;
  if (!orderId) return null;
  return { orderId, email: session.customer_details?.email || "", live: session.livemode };
}

// Asks Stripe directly whether a Checkout Session was paid and not refunded since.
export async function paidOrderFromSessionId(sessionId) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });
  if (session.payment_intent?.latest_charge?.refunded) return null;
  return orderFromSession(session);
}

// True when the reference is the receipt number from the Stripe receipt email
// (like 1234-5678) or the payment ID (pi_...) shown in the Stripe dashboard.
export async function referenceMatches(orderId, reference) {
  const given = String(reference).trim().replace(/^#/, "");
  if (given === orderId) return true;
  const pi = await stripe().paymentIntents.retrieve(orderId, { expand: ["latest_charge"] });
  const receipt = pi.latest_charge?.receipt_number;
  return Boolean(receipt) && receipt.toUpperCase() === given.toUpperCase();
}
