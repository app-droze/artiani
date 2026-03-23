"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
] as const;

const localeFlags: Record<Locale, string> = {
  ka: "🇬🇪",
  en: "🇬🇧",
  ru: "🇷🇺",
};

const isPathActive = (restPath: string, href: string) =>
  href ? restPath === href || restPath.startsWith(`${href}/`) : restPath === "";

const buildLocaleHref = (locale: Locale, restPath: string) =>
  restPath ? `/${locale}/${restPath}` : `/${locale}`;

const ActionIconButton = ({
  href,
  label,
  active,
  badge,
  onClick,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) => (
  <Link
    href={href}
    aria-label={label}
    onClick={onClick}
    className={`relative inline-flex h-11 min-w-11 items-center justify-center px-2.5 text-black transition-colors sm:h-12 sm:min-w-12 sm:px-3 ${
      active
        ? "text-black"
        : "text-black/78 hover:text-black"
    }`}
  >
    {children}
    {badge}
  </Link>
);

export const SiteNav = ({ lang, dict }: SiteNavProps) => {
  const { itemCount, addFeedbackToken } = useCart();
  const pathname = usePathname() ?? `/${lang}`;
  const segments = pathname.split("/").filter(Boolean);
  const currentLang = segments[0] && isLocale(segments[0]) ? segments[0] : lang;
  const restPath = segments.slice(1).join("/");
  const cartHref = `/${currentLang}/cart`;
  const profileHref = `/${currentLang}/track`;
  const localeMenuRef = useRef<HTMLDivElement | null>(null);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMenus = () => {
    setIsLocaleMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!isLocaleMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (
        localeMenuRef.current &&
        target instanceof Node &&
        !localeMenuRef.current.contains(target)
      ) {
        setIsLocaleMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isLocaleMenuOpen]);

  const cartBadge = itemCount > 0 ? (
    <span
      key={`cart-badge-${itemCount}-${addFeedbackToken}`}
      className="absolute -right-0.5 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C43C3C] px-1.5 text-[11px] font-semibold leading-none text-white motion-safe:animate-[cart-badge-pop_220ms_ease-out]"
    >
      {itemCount}
    </span>
  ) : null;

  const mobileDrawer =
    isMobileMenuOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] lg:hidden">
            <button
              type="button"
              aria-label={t(dict, "nav.close")}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 z-[90] bg-black/28 backdrop-blur-[1px]"
            />
            <div className="absolute inset-y-0 left-0 z-[100] flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto border-r border-black/10 bg-[#fbf8f2] px-4 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
              <div className="flex items-center justify-between border-b border-black/8 pb-3">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/62">
                  {t(dict, "nav.menu")}
                </p>
                <button
                  type="button"
                  aria-label={t(dict, "nav.close")}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-11 min-w-11 items-center justify-center text-black/82 transition-colors hover:text-black"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const href = item.href ? `/${currentLang}/${item.href}` : `/${currentLang}`;
                  const isActive = isPathActive(restPath, item.href);

                  return (
                    <Link
                      key={item.href || "home-mobile"}
                      href={href}
                      onClick={closeMenus}
                      className={`flex min-h-12 items-center rounded-[1rem] px-4 text-[1rem] font-medium transition-colors ${
                        isActive
                          ? "bg-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                          : "bg-black/[0.04] text-black/78 hover:bg-black/[0.07]"
                      }`}
                    >
                      {t(dict, item.labelKey)}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-black/8 pt-4">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-black/62">
                  {t(dict, "nav.language")}
                </p>
                <div className="grid gap-2">
                  {locales.map((locale) => {
                    const isActive = locale === currentLang;

                    return (
                      <Link
                        key={`drawer-locale-${locale}`}
                        href={buildLocaleHref(locale, restPath)}
                        onClick={closeMenus}
                        className={`flex min-h-12 items-center rounded-[1rem] px-4 text-[1rem] font-medium transition-colors ${
                          isActive
                            ? "bg-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                            : "bg-black/[0.04] text-black/78 hover:bg-black/[0.07]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{localeFlags[locale]}</span>
                          <span>{t(dict, `nav.locale.${locale}`)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <header className="relative z-50 border-b border-black/8 bg-white/88 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4 lg:gap-7">
            <Link
              href={`/${currentLang}`}
              className="flex items-center gap-2.5 text-base font-semibold uppercase tracking-[0.16em] sm:gap-3 sm:text-lg sm:tracking-[0.18em]"
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

            <nav className="hidden items-center gap-2 text-sm lg:flex">
              {navItems.map((item) => {
                const href = item.href ? `/${currentLang}/${item.href}` : `/${currentLang}`;
                const isActive = isPathActive(restPath, item.href);

                return (
                  <Link
                    key={item.href || "home"}
                    href={href}
                    onClick={closeMenus}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.97rem] font-medium transition-colors ${
                      isActive
                        ? "bg-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                        : "bg-black/[0.04] text-black/74 hover:bg-black/[0.07]"
                    }`}
                  >
                    {t(dict, item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <div ref={localeMenuRef} className="relative hidden lg:block">
              <button
                type="button"
                aria-label={t(dict, "nav.language")}
                aria-expanded={isLocaleMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsLocaleMenuOpen((current) => !current)}
                className={`inline-flex h-11 items-center gap-2 px-2.5 text-[0.94rem] font-medium text-black transition-colors sm:h-12 sm:px-3 ${
                  isLocaleMenuOpen
                    ? "text-black"
                    : "text-black/78 hover:text-black"
                }`}
              >
                <span className="text-[1.32rem] leading-none">{localeFlags[currentLang]}</span>
              </button>

              {isLocaleMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] min-w-[9rem] rounded-[1.1rem] border border-black/10 bg-white p-2 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
                  <div className="space-y-1" role="menu" aria-label={t(dict, "nav.language")}>
                    {locales
                      .filter((locale) => locale !== currentLang)
                      .map((locale) => (
                        <Link
                          key={locale}
                          href={buildLocaleHref(locale, restPath)}
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex min-h-11 items-center justify-between rounded-[0.9rem] px-3 py-2 text-[0.97rem] font-medium text-black transition-colors hover:bg-black/[0.04]"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{localeFlags[locale]}</span>
                            <span>{t(dict, `nav.locale.${locale}`)}</span>
                          </span>
                        </Link>
                      ))}
                  </div>
                </div>
              ) : null}

            </div>

            <ActionIconButton
              href={profileHref}
              label={t(dict, "nav.profile")}
              active={isPathActive(restPath, "track")}
              onClick={closeMenus}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[1.35rem] w-[1.35rem]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8.2" r="3.2" />
                <path d="M5.5 19c1.4-3 4-4.7 6.5-4.7s5.1 1.7 6.5 4.7" />
              </svg>
            </ActionIconButton>

            <ActionIconButton
              href={cartHref}
              label={t(dict, "nav.cart")}
              active={isPathActive(restPath, "cart")}
              badge={cartBadge}
              onClick={closeMenus}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[1.35rem] w-[1.35rem]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="19" r="1.25" />
                <circle cx="17" cy="19" r="1.25" />
                <path d="M4.5 5.5h2.1l1.7 8.2a1 1 0 0 0 1 .8h7.9a1 1 0 0 0 1-.7l1.4-5.5H8.2" />
              </svg>
            </ActionIconButton>

            <div className="relative lg:hidden">
              <button
                type="button"
                aria-label={isMobileMenuOpen ? t(dict, "nav.close") : t(dict, "nav.menu")}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                className={`inline-flex h-11 min-w-11 items-center justify-center text-black transition-colors sm:h-12 sm:min-w-12 ${
                  isMobileMenuOpen ? "text-black" : "text-black/82 hover:text-black"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isMobileMenuOpen ? (
                    <>
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </>
                  ) : (
                    <>
                      <path d="M4 7h16" />
                      <path d="M4 12h16" />
                      <path d="M4 17h16" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileDrawer}
    </header>
  );
};
