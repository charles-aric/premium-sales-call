"use client";

import { useState } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState({ text: "", bad: false });
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    setStatus({ text: "Checking your purchase...", bad: false });
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), reference: form.get("reference") }),
      });
      const data = await res.json();
      if (data.ok) { window.location.href = "/watch"; return; }
      setStatus({ text: data.message || "Could not sign in.", bad: true });
    } catch {
      setStatus({ text: "Connection problem. Check your internet and try again.", bad: true });
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email you paid with</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="reference">Order reference</label>
        <input id="reference" name="reference" type="text" placeholder="ENA260918-1234-56789" required />
      </div>
      <button className="pay" type="submit" disabled={sending}>Sign in</button>
      <p className={`status${status.bad ? " bad" : ""}`} role="status" aria-live="polite">{status.text}</p>
    </form>
  );
}
