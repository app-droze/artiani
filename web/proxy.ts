import { NextRequest, NextResponse } from "next/server";

const locales = ["ka", "en", "ru"] as const;
const defaultLocale = "ka";
const localeCookieName = "NEXT_LOCALE";

const isLocale = (value: string): value is (typeof locales)[number] =>
  (locales as readonly string[]).includes(value);

export function proxy(request: NextRequest) {
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
