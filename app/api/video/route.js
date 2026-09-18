import { issueSignedToken, presignUrl } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { orderStillPaid } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATHNAME = process.env.VIDEO_PATHNAME || "video.mp4";
const LINK_HOURS = 6;
const HOUR = 3600 * 1000;

// The signing token comes from Vercel's Blob API. It is reused between requests
// so that pressing play does not wait on an extra network call each time.
let cached = null;
async function signingToken() {
  if (!cached || cached.validUntil - Date.now() < (LINK_HOURS + 1) * HOUR) {
    cached = await issueSignedToken({
      pathname: PATHNAME,
      operations: ["get"],
      validUntil: Date.now() + 24 * HOUR,
    });
  }
  return cached;
}

// Signed-in buyers get redirected to a temporary link into the private Blob store.
// The browser streams straight from Vercel Blob. The store has no public URLs,
// and the link stops working after LINK_HOURS.
export async function GET() {
  const session = await getSession();
  if (!session || !(await orderStillPaid(session.orderId))) {
    return new Response("Payment required", { status: 402 });
  }

  const { presignedUrl } = await presignUrl(await signingToken(), {
    operation: "get",
    pathname: PATHNAME,
    access: "private",
    validUntil: Date.now() + LINK_HOURS * HOUR,
  });

  return new Response(null, { status: 302, headers: { location: presignedUrl, "cache-control": "no-store" } });
}
