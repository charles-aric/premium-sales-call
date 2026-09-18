import crypto from "node:crypto";
import { SITE } from "@/lib/site";
import { savePaidOrder, removePaidOrder } from "@/lib/store";

export const runtime = "nodejs";

// FastSpring calls this URL when someone pays and when an order is refunded.
// Subscribe the webhook to two events: order.completed and return.created.
export async function POST(request) {
  const raw = await request.text();
  const given = request.headers.get("x-fs-signature") || "";
  const expected = crypto
    .createHmac("sha256", process.env.FS_WEBHOOK_SECRET || "")
    .update(raw)
    .digest("base64");
  const valid =
    process.env.FS_WEBHOOK_SECRET &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) return new Response("Bad signature", { status: 401 });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  for (const event of payload.events || []) {
    const data = event.data || {};

    if (event.type === "order.completed" && data.completed === true) {
      const items = Array.isArray(data.items) ? data.items : [];
      const isOurProduct = items.some((i) => {
        const path = typeof i.product === "string" ? i.product : i.product?.product;
        return path === SITE.productPath;
      });
      if (isOurProduct) await savePaidOrder(data);
    }

    if (event.type === "return.created") {
      const original = data.original || {};
      const orderId =
        original.id || original.order || (typeof data.order === "string" ? data.order : data.order?.id);
      if (orderId) await removePaidOrder(orderId);
    }
  }

  // 200 tells FastSpring the events were handled. A crash above returns 500 and FastSpring retries.
  return new Response("ok");
}
