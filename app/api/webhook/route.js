import { savePaidOrder, removePaidOrder } from "@/lib/store";
import { stripe, orderFromSession } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe calls this URL when someone pays and when a payment is refunded.
// Subscribe the endpoint to checkout.session.completed,
// checkout.session.async_payment_succeeded and charge.refunded.
export async function POST(request) {
  const raw = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      raw,
      request.headers.get("stripe-signature") || "",
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch {
    return new Response("Bad signature", { status: 401 });
  }

  const data = event.data.object;

  // Covers buyers who pay and close the tab before Stripe sends them back to the site.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const order = orderFromSession(data);
    if (order) await savePaidOrder(order);
  }

  // Only a full refund ends access. A partial refund leaves charge.refunded false.
  if (event.type === "charge.refunded" && data.refunded) {
    const orderId = typeof data.payment_intent === "string" ? data.payment_intent : data.payment_intent?.id;
    if (orderId) await removePaidOrder(orderId);
  }

  // 200 tells Stripe the event was handled. A crash above returns 500 and Stripe retries.
  return new Response("ok");
}
