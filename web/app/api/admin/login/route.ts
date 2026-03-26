import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  resolveSafeAdminRedirectPath,
} from "@/src/lib/adminSession";

export const runtime = "nodejs";

const readRequiredAdminPassword = () => {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "[admin.login] Missing required ADMIN_DASHBOARD_PASSWORD. Add it to web/.env.local.",
    );
  }

  return password;
};

const isSecureRequest = (request: NextRequest) =>
  request.nextUrl.protocol === "https:" ||
  request.headers.get("x-forwarded-proto") === "https" ||
  process.env.NODE_ENV === "production";

const matchesPassword = (submitted: string, expected: string) => {
  const submittedBuffer = Buffer.from(submitted, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (submittedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(submittedBuffer, expectedBuffer);
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const submittedPassword = String(formData.get("password") ?? "").trim();
    const nextPath = resolveSafeAdminRedirectPath(
      String(formData.get("next") ?? "") || null,
    );

    if (!submittedPassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("error", "invalid_password");
      url.searchParams.set("next", nextPath);
      return NextResponse.redirect(url);
    }

    if (!matchesPassword(submittedPassword, readRequiredAdminPassword())) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("error", "invalid_password");
      url.searchParams.set("next", nextPath);
      return NextResponse.redirect(url);
    }

    const token = await createAdminSessionToken();
    const response = NextResponse.redirect(new URL(nextPath, request.url));
    response.cookies.set(
      getAdminSessionCookieName(),
      token,
      getAdminSessionCookieOptions(isSecureRequest(request)),
    );
    return response;
  } catch (error) {
    console.error("[admin.login] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });

    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.set("error", "temporary_error");
    return NextResponse.redirect(url);
  }
}
