import { redirect } from "next/navigation";
import Landing from "@/components/Landing";
import { getSession } from "@/lib/session";
import { orderStillPaid } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Signed-in buyers skip the sales page.
  const session = await getSession();
  if (session && (await orderStillPaid(session.orderId))) redirect("/watch");
  return <Landing />;
}
