"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { clock, waveform } from "@/lib/format";

const BARS = waveform();

export default function Landing() {
  const [status, setStatus] = useState({ text: "", bad: false });
  const [lit, setLit] = useState(null); // [fromMinute, toMinute] of the hovered chapter
  const busy = useRef(false);

  // FastSpring calls this global function when the checkout popup closes.
  // data is null when the buyer closed it without paying.
  useEffect(() => {
    window.onCheckoutClosed = (data) => {
      if (data && data.id) unlock(data.id, 24);
    };
    return () => { delete window.onCheckoutClosed; };
  }, []);

  async function unlock(orderId, triesLeft) {
    busy.current = true;
    setStatus({ text: "Confirming your payment. Keep this page open.", bad: false });
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.ok) { window.location.href = "/watch"; return; }
      if (res.status === 409 && triesLeft > 0) {
        setTimeout(() => unlock(orderId, triesLeft - 1), 2500);
        return;
      }
      setStatus({ text: data.message || "Could not unlock. Try signing in.", bad: true });
    } catch {
      setStatus({ text: "Connection problem. Check your internet, then sign in with your receipt details.", bad: true });
    }
    busy.current = false;
  }

  function pay() {
    if (busy.current) return;
    if (!window.fastspring || !window.fastspring.builder) {
      setStatus({ text: "Checkout is still loading. Try again in a moment.", bad: true });
      return;
    }
    window.fastspring.builder.reset();
    window.fastspring.builder.add(SITE.productPath);
    window.fastspring.builder.checkout();
  }

  const cta = `Pay ${SITE.price} to unlock`;

  return (
    <>
      <Script
        id="fsc-api"
        src={`https://sbl.onfastspring.com/sbl/${SITE.sblVersion}/fastspring-builder.min.js`}
        strategy="afterInteractive"
        data-storefront={SITE.storefront}
        data-popup-closed="onCheckoutClosed"
      />

      <header className="top">
        <span className="name">{SITE.name}</span>
        <nav><Link href="/login">Already paid? Sign in</Link></nav>
      </header>

      <main>
        <section className="hero">
          <div className="copy">
            <h1>{SITE.headline}</h1>
            <p className="lede">{SITE.lede}</p>
            <div className="buy">
              <button className="pay" type="button" onClick={pay}>{cta}</button>
              <p className="fine">
                One-time payment. Watch as many times as you like, on up to {SITE.maxDevices} devices.
                Checkout by FastSpring, with cards and PayPal.
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
                  <button className="pay" type="button" onClick={pay}>{cta}</button>
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

        <section className="lower">
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
              On another device, sign in with the email you paid with and the order reference
              from your FastSpring receipt.
            </p>
            <Link className="small-btn" href="/login" style={{ display: "inline-block", textDecoration: "none" }}>Sign in</Link>
          </div>
        </section>
      </main>
    </>
  );
}
