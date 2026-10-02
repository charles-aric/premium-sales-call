"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { clock, waveform } from "@/lib/format";
import { track, pixel, priceNumber } from "@/lib/analytics";

const BARS = waveform();

export default function Landing() {
  const [status, setStatus] = useState({ text: "", bad: false });
  const [lit, setLit] = useState(null); // [fromMinute, toMinute] of the hovered chapter
  const busy = useRef(false);

  // Stripe Checkout sends the buyer back here with ?session_id= after paying,
  // or with ?checkout=canceled when they leave the checkout page without paying.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      // GA4 dedupes on transaction_id and Meta on eventID, so a reload of this URL is not counted twice.
      track("purchase", {
        transaction_id: sessionId,
        value: priceNumber(SITE.price),
        currency: "USD",
        items: [{ item_id: SITE.productPath, item_name: SITE.headline }],
      });
      pixel("Purchase", {
        value: priceNumber(SITE.price),
        currency: "USD",
        content_ids: [SITE.productPath],
        content_type: "product",
      }, sessionId);
      unlock(sessionId);
    } else if (params.get("checkout") === "canceled") {
      track("checkout_abandon");
      window.history.replaceState(null, "", "/");
    }

    // Pressing Back on the Stripe page can restore this page mid-"Opening checkout". Reset it.
    const onShow = (e) => {
      if (!e.persisted) return;
      busy.current = false;
      setStatus({ text: "", bad: false });
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function unlock(sessionId) {
    busy.current = true;
    setStatus({ text: "Confirming your payment. Keep this page open.", bad: false });
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.ok) {
        track("purchase_confirmed", { transaction_id: sessionId });
        window.location.href = "/watch";
        return;
      }
      track("unlock_failed", { transaction_id: sessionId, reason: data.message || `status_${res.status}` });
      setStatus({ text: data.message || "Could not unlock. Try signing in.", bad: true });
    } catch (err) {
      track("unlock_failed", { transaction_id: sessionId, reason: (err && err.message) || "network_error" });
      setStatus({ text: "Connection problem. Check your internet, then sign in with your receipt details.", bad: true });
    }
    busy.current = false;
  }

  async function pay(location) {
    if (busy.current) return;
    busy.current = true;
    track("cta_click", { cta_location: location, cta_text: cta, price: SITE.price });
    setStatus({ text: "Opening checkout...", bad: false });
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!data.url) throw new Error(data.message || `status_${res.status}`);
      track("checkout_open", { cta_location: location });
      pixel("InitiateCheckout", {
        value: priceNumber(SITE.price),
        currency: "USD",
        content_ids: [SITE.productPath],
        content_type: "product",
      });
      window.location.href = data.url;
      return;
    } catch (err) {
      track("checkout_error", { cta_location: location, reason: (err && err.message) || "network_error" });
      setStatus({ text: "Checkout could not start. Try again in a moment.", bad: true });
    }
    busy.current = false;
  }

  const cta = `Pay ${SITE.price} to unlock`;

  return (
    <>
      <header className="top">
        <span className="name">{SITE.name}</span>
        <nav><Link href="/login" onClick={() => track("login_click")}>Already paid? Sign in</Link></nav>
      </header>

      <main>
        <section className="hero">
          <div className="copy">
            <h1>{SITE.headline}</h1>
            <p className="lede">{SITE.lede}</p>
            <div className="buy">
              <button className="pay" type="button" onClick={() => pay("hero")}>{cta}</button>
              <p className="fine">
                One-time payment. Watch as many times as you like, on up to {SITE.maxDevices} devices.
                Secure checkout by Stripe.
              </p>
            </div>
            <p className={`status${status.bad ? " bad" : ""}`} role="status" aria-live="polite">{status.text}</p>
          </div>

          <div className="player-col">
            <div className="player">
              <div className="locked">
                <div className="mid">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                  </svg>
                  <button className="pay" type="button" onClick={() => pay("player")}>{cta}</button>
                  <p>The full recording plays right after payment.</p>
                </div>
                <div className="wave" aria-hidden="true">
                  <svg viewBox={`0 0 ${BARS.length * 4} 64`} preserveAspectRatio="none">
                    {BARS.map((h, i) => {
                      const minute = (i / BARS.length) * SITE.durationMinutes;
                      const on = lit && minute >= lit[0] && minute < lit[1];
                      return <rect key={i} className={on ? "on" : ""} x={i * 4} y={(64 - h) / 2} width="2.4" height={h} rx="1.2" />;
                    })}
                  </svg>
                </div>
                <div className="timebar" aria-hidden="true">
                  <span>0:00</span><span>{clock(SITE.durationMinutes * 60)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section className="lower">
          <div>
            <h2>What happens in the recording</h2>
            <ol className="chapters">
              {SITE.chapters.map((c, i) => {
                const next = SITE.chapters[i + 1] ? SITE.chapters[i + 1].at : SITE.durationMinutes;
                return (
                  <li key={c.at}>
                    <button
                      type="button"
                      onMouseEnter={() => setLit([c.at, next])}
                      onMouseLeave={() => setLit(null)}
                      onFocus={() => setLit([c.at, next])}
                      onBlur={() => setLit(null)}
                    >
                      <time>{clock(c.at * 60)}</time><span>{c.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="already">
            <h2>How access works</h2>
            <p>
              After you pay, the video opens right away and this browser stays signed in.
              On another device, sign in with the email you paid with and the receipt number
              from your Stripe receipt.
            </p>
            <Link className="small-btn" href="/login" style={{ display: "inline-block", textDecoration: "none" }}>Sign in</Link>
          </div>
        </section> */}
      </main>
    </>
  );
}
