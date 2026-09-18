import { redirect } from "next/navigation";
import WatchPlayer from "@/components/WatchPlayer";
import { getSession } from "@/lib/session";
import { orderStillPaid } from "@/lib/store";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watch" };

export default async function WatchPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // A refunded order disappears from the store, which ends access here.
  if (!(await orderStillPaid(session.orderId))) redirect("/login");

  return (
    <>
      <header className="top">
        <span className="name">{SITE.name}</span>
        <nav>
          <form action="/api/logout" method="post">
            <button className="linklike" type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="watch">
        <WatchPlayer />
        <p className="signed" style={{ marginTop: -40, paddingBottom: 64 }}>Signed in as {session.email}</p>
      </main>
    </>
  );
}
