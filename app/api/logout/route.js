import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(request) {
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  clearSessionCookie(res);
  return res;
}
