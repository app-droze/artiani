"use client";

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

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link href={`/${lang}/shop`} className="text-lg font-semibold tracking-tight">
          {t(dict, "nav.brand")}
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href={`/${lang}/shop`} className="text-black/70 hover:text-black">
            {t(dict, "nav.shop")}
          </Link>
          <Link href={`/${lang}/cart`} className="text-black/70 hover:text-black">
            {t(dict, "nav.cart")} ({count})
          </Link>
          <Link
            href={`/${lang}/checkout`}
            className="text-black/70 hover:text-black"
          >
            {t(dict, "nav.checkout")}
          </Link>
          <Link
            href={switchPath}
            className="rounded-full border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
          >
            {nextLang === "en" ? t(dict, "nav.lang_en") : t(dict, "nav.lang_ka")}
          </Link>
        </nav>
      </div>
    </header>
  );
};
