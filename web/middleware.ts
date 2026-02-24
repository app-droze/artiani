import { NextRequest, NextResponse } from "next/server";

const locales = ["ka", "en"] as const;
type Locale = (typeof locales)[number];
const defaultLocale: Locale = "ka";
const LOCALE_COOKIE = "NEXT_LOCALE";
const PUBLIC_FILE = /\.[\w]+$/;

const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (maybeLocale && isLocale(maybeLocale)) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, maybeLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  return NextResponse.redirect(new URL(`/${locale}${pathname}${request.nextUrl.search}`, request.url));
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
