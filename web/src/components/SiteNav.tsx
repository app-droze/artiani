"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const segments = pathname.split("/").filter(Boolean);
  const currentLang = segments[0] && isLocale(segments[0]) ? segments[0] : lang;
  const rest = segments.slice(1).join("/");
  const nextLang: Locale = currentLang === "en" ? "ka" : "en";
  const switchPath = rest ? `/${nextLang}/${rest}` : `/${nextLang}`;
  const isHome = rest === "";
  const isCatalogue = rest.startsWith("catalogue");
  const isCart = rest.startsWith("cart");
  const activeClassName = "text-black underline underline-offset-8";
  const inactiveClassName = "text-black/70 hover:text-black";

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f0e6]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-4 sm:items-stretch sm:justify-between">
        <div className="flex w-full flex-col items-center gap-3 sm:w-full sm:flex-row sm:items-center sm:gap-6">
          <Link
            href={`/${lang}`}
            scroll
            className="flex items-center gap-3 text-lg font-semibold tracking-[0.2em] text-black/80"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70">
              <Image
                src="/brand/sheep-seal.png"
                alt={t(dict, "nav.brand")}
                width={28}
                height={28}
                priority
              />
            </span>
            <span className="uppercase">{t(dict, "nav.wordmark")}</span>
          </Link>
          <nav className="flex w-full items-center justify-between text-sm font-medium sm:ml-2 sm:w-auto sm:flex-1">
            <div className="flex items-center gap-4">
              <Link
                href={`/${lang}`}
                scroll
                className={isHome ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.home")}
              </Link>
              <Link
                href={`/${lang}/catalogue`}
                scroll
                className={isCatalogue ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.shop")}
              </Link>
              <Link
                href={`/${lang}/cart`}
                scroll
                className={isCart ? activeClassName : inactiveClassName}
              >
                {t(dict, "nav.cart")} (<span suppressHydrationWarning>{count}</span>)
              </Link>
            </div>
            <Link
              href={switchPath}
              scroll
              className="rounded-full border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
            >
              {nextLang === "en" ? t(dict, "nav.lang_en") : t(dict, "nav.lang_ka")}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
