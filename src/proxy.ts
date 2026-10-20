import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

// API routes reachable without a session (login flow)
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/me",
]);

// Routes the background worker may call with the shared CRON_SECRET
const CRON_API_ROUTES = new Set(["/api/pipeline/sync-outliers"]);

function hasValidCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (CRON_API_ROUTES.has(pathname) && hasValidCronSecret(request)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("outlr_session")?.value;
  if (token && verifySessionToken(token)) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
