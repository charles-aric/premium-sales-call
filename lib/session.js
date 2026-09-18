import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "session";
const DAYS = 30;

function hmac(text) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "").update(text).digest("base64url");
}

export function createSessionToken({ orderId, email }) {
  const payload = Buffer.from(
    JSON.stringify({ orderId, email, exp: Date.now() + DAYS * 86400 * 1000 })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function readSessionToken(token) {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// For server components and route handlers.
export async function getSession() {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

export function setSessionCookie(res, session) {
  res.cookies.set(COOKIE, createSessionToken(session), { ...cookieOptions, maxAge: DAYS * 86400 });
}

export function clearSessionCookie(res) {
  res.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
