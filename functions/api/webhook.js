import { webhookSignatureIsValid, savePaidOrder, removePaidOrder } from "../../lib/shared.js";

// FastSpring calls this URL when someone pays and when an order is refunded.
// Subscribe the webhook to two events: order.completed and return.created.
export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await webhookSignatureIsValid(raw, request.headers.get("x-fs-signature"), env))) {
    return new Response("Bad signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  for (const event of payload.events || []) {
    const data = event.data || {};

    if (event.type === "order.completed") {
      const items = Array.isArray(data.items) ? data.items : [];
      const isOurProduct = items.some((i) => {
        const path = typeof i.product === "string" ? i.product : i.product && i.product.product;
        return path === env.FS_PRODUCT_PATH;
      });
      if (isOurProduct && data.completed === true) await savePaidOrder(data, env);
    }

    if (event.type === "return.created") {
      const original = data.original || {};
      const orderId =
        original.id || original.order ||
        (typeof data.order === "string" ? data.order : data.order && data.order.id);
      if (orderId) await removePaidOrder(orderId, env);
    }
  }

  // 200 tells FastSpring every event in this call was handled. If KV throws above,
  // Cloudflare answers 500 and FastSpring retries later.
  return new Response("ok", { status: 200 });
}
