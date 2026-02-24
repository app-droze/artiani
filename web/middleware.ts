import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/src/i18n/locales";

const PUBLIC_FILE = /\.[\w]+$/;

const LOCALE_COOKIE = "artiani_locale";

const getPreferredLocale = (request: NextRequest) => {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }
  const header = request.headers.get("accept-language");
  if (!header) return null;
  const parts = header.split(",").map((part) => part.trim());
  for (const part of parts) {
    const locale = part.split(";")[0].toLowerCase();
    if (isLocale(locale)) return locale;
    const base = locale.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const locale = getPreferredLocale(request) ?? defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (!maybeLocale || !isLocale(maybeLocale)) {
    const locale = getPreferredLocale(request) ?? defaultLocale;
    const rest = segments.join("/");
    return NextResponse.redirect(new URL(`/${locale}/${rest}`, request.url));
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, maybeLocale, { path: "/" });
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
