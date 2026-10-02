"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { clock, waveform } from "@/lib/format";
import { track, pixel, priceNumber } from "@/lib/analytics";

const Check = () => (
  <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const Arrow = () => (
  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Instagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const Spinner = () => <span className="spinner" aria-hidden="true" />;

const BARS = waveform();

export default function Landing() {
  const [status, setStatus] = useState({ text: "", bad: false });
  const [lit, setLit] = useState(null); // [fromMinute, toMinute] of the hovered chapter
  const [returning, setReturning] = useState(false); // true when Stripe has just sent the buyer back
  const [opening, setOpening] = useState(null); // which button started checkout, while Stripe's page loads
  const busy = useRef(false);

  // Stripe Checkout sends the buyer back here with ?session_id= after paying,
  // or with ?checkout=canceled when they leave the checkout page without paying.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      setReturning(true);
      // GA4 dedupes on transaction_id and Meta on eventID, so a reload of this URL is not counted twice.
      track("purchase", {
        transaction_id: sessionId,
        value: priceNumber(SITE.price),
        currency: "USD",
        items: [{ item_id: SITE.productPath, item_name: SITE.productName }],
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
      setOpening(null);
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
    setOpening(location);
    setStatus({ text: "", bad: false });
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
      setOpening(null);
      setStatus({ text: "Checkout could not start. Try again in a moment.", bad: true });
    }
    busy.current = false;
  }

  const cta = `Unlock it for ${SITE.price}`;
  const days = SITE.guaranteeDays;
  const chapters = SITE.showChapters ? SITE.chapters : [];
  const accessAnswer = SITE.maxDevices > 1
    ? `Sign in with the email you paid with and the receipt number from your Stripe receipt. One purchase works on up to ${SITE.maxDevices} devices.`
    : "This browser stays signed in after you pay. If you get signed out, use the email you paid with and the receipt number from your Stripe receipt.";
  const terms = ["One time", "Lifetime access", days ? `${days} day money back` : null, "Card payment by Stripe"].filter(Boolean).join(". ") + ".";
  const statusLine = <p className={`status${status.bad ? " bad" : ""}`} role="status" aria-live="polite">{status.text}</p>;
  // One pay button. While checkout opens, the pressed one shows a spinner and the rest are disabled.
  const PayButton = ({ location, className = "", children }) => {
    const active = opening === location;
    return (
      <button className={`pay ${className}${active ? " busy" : ""}`} type="button" disabled={opening !== null} onClick={() => pay(location)}>
        {active ? <><Spinner />Opening checkout</> : children}
      </button>
    );
  };

  // Stripe has just sent the buyer back. Show the confirmation instead of the sales page.
  if (returning) {
    return (
      <>
        <header className="top"><span className="name">{SITE.name}</span></header>
        <main className="narrow">
          {status.bad ? (
            <>
              <span className="eyebrow plain">Almost there</span>
              <h1>We could not open the video yet.</h1>
              <p className="lede">{status.text}</p>
              <Link className="pay block" href="/login">Sign in with your receipt</Link>
              <p className="fine">Your payment is safe. The receipt email from Stripe has the receipt number you sign in with.</p>
            </>
          ) : (
            <>
              <div className="done" aria-hidden="true"><Check /></div>
              <h1>Paid. Your video is unlocking.</h1>
              <p className="lede">Confirming your payment with Stripe. Keep this page open, the video opens by itself in a few seconds.</p>
              <p className="fine" role="status" aria-live="polite">Stripe is emailing your receipt. Keep it, the receipt number signs you in on another device.</p>
            </>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <header className="top">
        <span className="name">{SITE.name}</span>
        <nav>
          <a className="quiet" href="#pricing">Pricing</a>
          <Link href="/login" onClick={() => track("login_click")}>Already paid? Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="copy">
            <span className="eyebrow"><i />{SITE.eyebrow}</span>
            <h1>{SITE.headline}</h1>
            <p className="lede">{SITE.lede}</p>
            <div className="buy">
              <PayButton location="hero" className="big">{cta}<Arrow /></PayButton>
            </div>
            <p className="fine">{terms}</p>
            {statusLine}
          </div>

          <div className="player">
            <div className="locked">
              <div className="mid">
                <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                </svg>
                <PayButton location="player">Pay {SITE.price} to unlock</PayButton>
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
        </section>

        {SITE.proof.length > 0 && (
          <section className="proof" aria-label="Track record">
            {SITE.proof.map((p) => (
              <div key={p.label}><strong>{p.figure}</strong><span>{p.label}</span></div>
            ))}
          </section>
        )}

        <section className="split">
          <div>
            <h2>What is inside</h2>
            <ul className="inside">
              {SITE.inside.map(([bold, rest]) => (
                <li key={bold}><Check /><span><strong>{bold}</strong> {rest}</span></li>
              ))}
            </ul>
          </div>
          {chapters.length > 0 ? (
            <div>
              <h2>Minute by minute</h2>
              <ol className="chapters">
                {chapters.map((c, i) => {
                  const next = chapters[i + 1] ? chapters[i + 1].at : SITE.durationMinutes;
                  return (
                    <li
                      key={c.at}
                      tabIndex={0}
                      onMouseEnter={() => setLit([c.at, next])}
                      onMouseLeave={() => setLit(null)}
                      onFocus={() => setLit([c.at, next])}
                      onBlur={() => setLit(null)}
                    >
                      <time>{clock(c.at * 60)}</time><span>{c.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="card who">
              <span className="label">Who this is for</span>
              <p>{SITE.whoFor}</p>
              <p className="dim">{SITE.whoNot}</p>
            </div>
          )}
        </section>

        {chapters.length > 0 && (
          <section className="single">
            <div className="card who">
              <span className="label">Who this is for</span>
              <p>{SITE.whoFor}</p>
              <p className="dim">{SITE.whoNot}</p>
            </div>
          </section>
        )}

        <section className={`pair${days ? "" : " solo"}`}>
          <div className="card about">
            <div className="avatar" aria-hidden="true">SG</div>
            <div>
              <h3>{SITE.name}</h3>
              <p>{SITE.about}</p>
              <a className="social" href={SITE.instagram} target="_blank" rel="noopener noreferrer" onClick={() => track("instagram_click")}>
                <Instagram />@sharan.gohar on Instagram
              </a>
            </div>
          </div>
          {days > 0 && (
            <div className="card guarantee">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
              </svg>
              <div>
                <h3>Watch it. If it was not worth it, say so.</h3>
                <p>Reply to your receipt within {days} days and you get the money back. No form, no questions.</p>
              </div>
            </div>
          )}
        </section>

        <section id="pricing" className="pricing">
          <div className="card">
            <div className="price-row">
              <div><span className="price">{SITE.price}</span><span className="dim">one time</span></div>
              <span className="dim small">Opens right after payment</span>
            </div>
            <ul className="ticks">
              {SITE.includes.map((line) => (
                <li key={line}><Check />{line}</li>
              ))}
              {days > 0 && <li><Check />{days} day money back</li>}
            </ul>
            <PayButton location="pricing" className="big block">Pay {SITE.price} and watch now</PayButton>
            <p className="dim small center">Secure card checkout by Stripe.</p>
            {statusLine}
          </div>
        </section>

        <section className="single bottom">
          <h2>How access works</h2>
          <div className="card access">
            <p>After you pay, the video opens right away and this browser stays signed in.</p>
            <p className="dim">{accessAnswer}</p>
            <Link className="ghost" href="/login" onClick={() => track("login_click")}>Sign in</Link>
          </div>
        </section>
      </main>

      <div className="sticky">
        <div><strong>{SITE.price}</strong><span>one time, lifetime access</span></div>
        <PayButton location="sticky">Unlock now</PayButton>
      </div>

      {opening !== null && (
        <div className="overlay" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>Opening secure checkout</p>
          <span>Card payments by Stripe. This takes a few seconds.</span>
        </div>
      )}
    </>
  );
}
