"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/src/components/CartProvider";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import { type Locale, isLocale } from "@/src/i18n/locales";

type SiteNavProps = {
  lang: Locale;
  dict: Dictionary;
};

export const SiteNav = ({ lang, dict }: SiteNavProps) => {
  const { count } = useCart();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const currentLang = segments[0] && isLocale(segments[0]) ? segments[0] : lang;
  const rest = segments.slice(1).join("/");
  const nextLang: Locale = currentLang === "en" ? "ka" : "en";
  const switchPath = rest ? `/${nextLang}/${rest}` : `/${nextLang}`;
  const queryString = searchParams.toString();
  const switchHref = queryString ? `${switchPath}?${queryString}` : switchPath;

  const isHome = rest === "";
  const isCatalogue = rest.startsWith("catalogue");
  const isCart = rest.startsWith("cart");
  const isTrack = rest.startsWith("track");
  const activeClassName = "text-black underline underline-offset-10";
  const inactiveClassName = "text-black/70 hover:text-black";

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f7f0e6] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between md:hidden">
          <Link
            href={`/${currentLang}`}
            scroll
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-black/80"
          >
            <span className="flex h-12 w-12 items-center justify-center">
              <Image
                src="/brand/sheep-seal.png"
                alt={t(dict, "nav.brand")}
                width={38}
                height={38}
                priority
              />
            </span>
            <span>{t(dict, "nav.wordmark")}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/${currentLang}/cart`}
              scroll
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black/75"
            >
              <span>{t(dict, "nav.cart")}</span>
              <span className="rounded-full bg-black px-1.5 py-0.5 text-[10px] text-white" suppressHydrationWarning>
                {count}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 text-black/75"
              aria-label={menuOpen ? t(dict, "product.close") : t(dict, "nav.menu")}
              aria-expanded={menuOpen}
            >
              <span className="text-base leading-none">{menuOpen ? "×" : "☰"}</span>
            </button>
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${currentLang}`}
            scroll
            className="flex items-center gap-3 text-lg font-semibold tracking-[0.2em] text-black/80"
          >
            <span className="flex h-14 w-14 items-center justify-center">
              <Image
                src="/brand/sheep-seal.png"
                alt={t(dict, "nav.brand")}
                width={46}
                height={46}
                priority
              />
            </span>
            <span className="uppercase">{t(dict, "nav.wordmark")}</span>
          </Link>

          <nav className="ml-2 flex flex-1 items-center justify-between text-base font-medium">
            <div className="flex items-center gap-4">
              <Link
                href={`/${currentLang}`}
                scroll
                className={isHome ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.home")}
              </Link>
              <Link
                href={`/${currentLang}/catalogue`}
                scroll
                className={isCatalogue ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.shop")}
              </Link>
              <Link
                href={`/${currentLang}/cart`}
                scroll
                className={isCart ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.cart")} (<span suppressHydrationWarning>{count}</span>)
              </Link>
              <Link
                href={`/${currentLang}/track`}
                scroll
                className={isTrack ? activeClassName : inactiveClassName}
              >
                {t(dict, "track.linkLabel")}
              </Link>
            </div>
            <Link
              href={switchHref}
              scroll
              className="rounded-full border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
            >
              {nextLang === "en" ? t(dict, "nav.lang_en") : t(dict, "nav.lang_ka")}
            </Link>
          </nav>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            onClick={() => setMenuOpen(false)}
            aria-label={t(dict, "product.close")}
          />
          <div className="absolute right-0 top-0 h-full w-[82vw] max-w-xs border-l border-black/10 bg-[#f8f6f2] p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
                {t(dict, "nav.menu")}
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-black/15 px-2 py-1 text-xs text-black/70"
              >
                {t(dict, "product.close")}
              </button>
            </div>

            <nav className="space-y-2 text-sm font-medium">
              <Link
                href={`/${currentLang}`}
                scroll
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-black/80 hover:bg-black/5"
              >
                {t(dict, "nav.home")}
              </Link>
              <Link
                href={`/${currentLang}/catalogue`}
                scroll
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-black/80 hover:bg-black/5"
              >
                {t(dict, "nav.shop")}
              </Link>
              <Link
                href={`/${currentLang}/cart`}
                scroll
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-black/80 hover:bg-black/5"
              >
                {t(dict, "nav.cart")} (<span suppressHydrationWarning>{count}</span>)
              </Link>
              <Link
                href={`/${currentLang}/track`}
                scroll
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-black/80 hover:bg-black/5"
              >
                {t(dict, "track.linkLabel")}
              </Link>
              <Link
                href={`/${currentLang}/about`}
                scroll
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-black/80 hover:bg-black/5"
              >
                {t(dict, "nav.about")}
              </Link>
            </nav>

            <div className="mt-5 border-t border-black/10 pt-4">
              <Link
                href={switchHref}
                scroll
                onClick={() => setMenuOpen(false)}
                className="inline-flex rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-black/70"
              >
                {nextLang === "en" ? t(dict, "nav.lang_en") : t(dict, "nav.lang_ka")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
