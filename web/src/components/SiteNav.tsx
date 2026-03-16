"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/src/components/CartProvider";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, locales } from "@/src/i18n/locales";

type SiteNavProps = {
  lang: Locale;
  dict: Dictionary;
};

const navItems = [
  { href: "", labelKey: "nav.home" },
  { href: "biography", labelKey: "nav.biography" },
  { href: "catalogue", labelKey: "nav.catalogue" },
  { href: "cart", labelKey: "nav.cart" },
  { href: "track", labelKey: "nav.track" },
] as const;

export const SiteNav = ({ lang, dict }: SiteNavProps) => {
  const { itemCount } = useCart();
  const pathname = usePathname() ?? `/${lang}`;
  const segments = pathname.split("/").filter(Boolean);
  const currentLang = segments[0] && isLocale(segments[0]) ? segments[0] : lang;
  const restPath = segments.slice(1).join("/");

  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-white/85 backdrop-blur md:static">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <Link
              href={`/${currentLang}`}
              className="flex min-w-0 items-center gap-2.5 text-base font-semibold tracking-[0.16em] uppercase sm:gap-3 sm:text-lg sm:tracking-[0.18em]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-14 sm:w-14 lg:h-20 lg:w-20">
                <Image
                  src="/brand/sheep-seal.png"
                  alt="Artiani"
                  width={56}
                  height={56}
                  priority
                  className="h-8 w-8 object-contain sm:h-10 sm:w-10 lg:h-14 lg:w-14"
                />
              </span>
              <span className="truncate">Artiani</span>
            </Link>

            <nav className="hidden flex-wrap gap-2 text-sm lg:flex">
              {navItems.map((item) => {
                const href = item.href ? `/${currentLang}/${item.href}` : `/${currentLang}`;
                const isActive = item.href ? restPath === item.href : restPath === "";

                return (
                  <Link
                    key={item.href || "home"}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${
                      isActive ? "bg-black !text-white" : "bg-black/5 text-black/70"
                    }`}
                  >
                    {t(dict, item.labelKey)}
                    {item.href === "cart" && itemCount > 0 ? (
                      <span
                        className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                          isActive ? "bg-white/18 text-white" : "bg-black text-white"
                        }`}
                      >
                        {itemCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/60 sm:text-xs">
            <div className="flex items-center gap-1">
              {locales.map((locale) => {
                const href = restPath ? `/${locale}/${restPath}` : `/${locale}`;
                const isActive = locale === currentLang;

                return (
                  <Link
                    key={locale}
                    href={href}
                    className={`rounded-full border px-2 py-1 sm:px-2.5 ${
                      isActive
                        ? "border-black bg-black !text-white"
                        : "border-black/15 text-black/70"
                    }`}
                  >
                    {t(dict, `nav.locale.${locale}`)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
          {navItems.map((item) => {
            const href = item.href ? `/${currentLang}/${item.href}` : `/${currentLang}`;
            const isActive = item.href ? restPath === item.href : restPath === "";

            return (
              <Link
                key={item.href || "home-mobile"}
                href={href}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-sm ${
                  isActive ? "bg-black !text-white" : "bg-black/5 text-black/70"
                }`}
              >
                {t(dict, item.labelKey)}
                {item.href === "cart" && itemCount > 0 ? (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                      isActive ? "bg-white/18 text-white" : "bg-black text-white"
                    }`}
                  >
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
