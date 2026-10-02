import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/session";
import { orderStillPaid } from "@/lib/store";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session && (await orderStillPaid(session.orderId))) redirect("/watch");
  return (
    <>
      <header className="top">
        <Link className="name" href="/">{SITE.name}</Link>
        <nav><Link href="/">Not bought yet?</Link></nav>
      </header>
      <main className="narrow">
        <span className="eyebrow plain">Sign in</span>
        <h1>Your video is tied to your email.</h1>
        <p className="lede">
          Type the email you paid with and the receipt number from your Stripe receipt email. No password to remember.
        </p>
        <LoginForm />
        <p className="fine">The receipt number looks like 1234-5678. It is in the email Stripe sent right after you paid.</p>
        <p className="fine">Bought before the move to Stripe? Use the same email with your earlier order reference.</p>
      </main>
    </>
  );
}
