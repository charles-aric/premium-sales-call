import { json, readAccess, orderStillPaid } from "../../lib/shared.js";

// Tells the page whether this browser already has access.
export async function onRequestGet({ request, env }) {
  let orderId = await readAccess(request, env);
  if (orderId && !(await orderStillPaid(orderId, env))) orderId = null;
  return json({ unlocked: Boolean(orderId), orderId: orderId || null });
}
