import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSessionCookieName,
  verifyAdminSessionToken,
} from "@/src/lib/adminSession";

const locales = ["ka", "en"] as const;
const defaultLocale = "ka";
const localeCookieName = "NEXT_LOCALE";

const isLocale = (value: string): value is (typeof locales)[number] =>
  (locales as readonly string[]).includes(value);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const leadingSegment = segments[0];

  if (leadingSegment === "admin") {
    const hasAdminSession = await verifyAdminSessionToken(
      request.cookies.get(getAdminSessionCookieName())?.value,
    );

    if (segments.length === 1) {
      if (hasAdminSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/dashboard";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (!hasAdminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (leadingSegment === "ru") {
    const redirectedSegments = segments.slice(1);
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${redirectedSegments.length > 0 ? `/${redirectedSegments.join("/")}` : ""}`;
    return NextResponse.redirect(url);
  }

  if (leadingSegment && isLocale(leadingSegment)) {
    const response = NextResponse.next();
    response.cookies.set(localeCookieName, leadingSegment, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const resolvedLocale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${resolvedLocale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
