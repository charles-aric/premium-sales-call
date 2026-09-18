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
        <Link className="name" href="/" style={{ textDecoration: "none", color: "var(--ink)" }}>{SITE.name}</Link>
        <nav><Link href="/">Not bought yet?</Link></nav>
      </header>
      <main className="narrow">
        <h1>Sign in to watch</h1>
        <p className="lede">
          Use the email you paid with. Your order reference is in the receipt email from FastSpring.
        </p>
        <LoginForm />
      </main>
    </>
  );
}
