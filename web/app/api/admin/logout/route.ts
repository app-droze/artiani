import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
} from "@/src/lib/adminSession";

export const runtime = "nodejs";

const isSecureRequest = (request: NextRequest) =>
  request.nextUrl.protocol === "https:" ||
  request.headers.get("x-forwarded-proto") === "https" ||
  process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(isSecureRequest(request)),
    maxAge: 0,
  });
  return response;
}
