"use client";

import { ArtistLinks } from "@/src/components/ArtistLinks";
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
  { href: "catalogue", labelKey: "nav.catalogue" },
  { href: "biography", labelKey: "nav.aboutArtiani" },
] as const;

const localeFlags: Record<Locale, string> = {
  ka: "🇬🇪",
  en: "🇬🇧",
  ru: "🇷🇺",
};

const CONTACT_EMAIL = "app.droze@gmail.com";
const CONTACT_PHONE = "+995598194117";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M4 6.75h16a1.25 1.25 0 0 1 1.25 1.25v8A1.25 1.25 0 0 1 20 17.25H4A1.25 1.25 0 0 1 2.75 16V8A1.25 1.25 0 0 1 4 6.75Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="m3.5 8 8.5 6 8.5-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M7.8 4.75h1.9c.3 0 .57.18.69.45l1.06 2.63a.76.76 0 0 1-.17.82l-1.34 1.34a13.1 13.1 0 0 0 4.07 4.07l1.34-1.34a.76.76 0 0 1 .82-.17l2.63 1.06c.27.12.45.39.45.69v1.9a1.1 1.1 0 0 1-1.1 1.1h-.8C10.7 19.25 4.75 13.3 4.75 5.85v-.8a1.1 1.1 0 0 1 1.1-1.1Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

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
  const drawerPrimaryLinks = [
    { href: `/${currentLang}`, label: t(dict, "nav.home"), active: isPathActive(restPath, "") },
    { href: profileHref, label: t(dict, "nav.profile"), active: isPathActive(restPath, "track") },
    { href: cartHref, label: t(dict, "nav.cart"), active: isPathActive(restPath, "cart") },
  ];
  const drawerCategoryLinks = [
    {
      href: `/${currentLang}/catalogue?type=tablecloth`,
      label: t(dict, "nav.category.tablecloths"),
    },
    {
      href: `/${currentLang}/catalogue?type=table_runner-small`,
      label: t(dict, "nav.category.runners"),
    },
    {
      href: `/${currentLang}/catalogue?type=table_runner-large`,
      label: t(dict, "nav.category.longRunners"),
    },
    {
      href: `/${currentLang}/catalogue?type=pillow`,
      label: t(dict, "nav.category.pillows"),
    },
    {
      href: `/${currentLang}/catalogue?type=headscarf`,
      label: t(dict, "nav.category.scarves"),
    },
  ];

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
            <div className="absolute inset-y-0 right-0 z-[100] flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto border-l border-black/10 bg-[#fbf8f2] px-4 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
              <div className="flex items-center justify-end border-b border-black/8 pb-3">
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

              <div className="border-b border-black/8 pb-3">
                <div className="flex items-center justify-center gap-3">
                  {locales.map((locale) => {
                    const isActive = locale === currentLang;

                    return (
                      <Link
                        key={`drawer-locale-${locale}`}
                        href={buildLocaleHref(locale, restPath)}
                        onClick={closeMenus}
                        aria-label={t(dict, `nav.locale.${locale}`)}
                        className={`inline-flex h-11 min-w-11 items-center justify-center text-[1.35rem] transition-opacity ${
                          isActive ? "opacity-100" : "opacity-62 hover:opacity-100"
                        }`}
                      >
                        <span
                          className={`border-b pb-0.5 leading-none ${
                            isActive ? "border-black/85" : "border-transparent"
                          }`}
                        >
                          {localeFlags[locale]}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 border-b border-black/8 pb-3">
                {drawerPrimaryLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className={`flex min-h-11 items-center text-[0.98rem] font-medium transition-colors ${
                      item.active ? "text-black" : "text-black/76 hover:text-black"
                    }`}
                  >
                    <span
                      className={`border-b pb-0.5 ${
                        item.active ? "border-black/85" : "border-transparent"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              <nav className="grid gap-2">
                {drawerCategoryLinks.map((item) => {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className={`flex min-h-12 items-center px-1 text-[1rem] font-medium transition-colors ${
                        "text-black/76 hover:text-black"
                      }`}
                    >
                      <span className="border-b border-transparent pb-0.5">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-1">
                <Link
                  href={`/${currentLang}/biography`}
                  onClick={closeMenus}
                  className={`flex min-h-11 items-center px-1 text-[0.98rem] font-medium transition-colors ${
                    isPathActive(restPath, "biography") ? "text-black" : "text-black/76 hover:text-black"
                  }`}
                >
                  <span
                    className={`border-b pb-0.5 ${
                      isPathActive(restPath, "biography") ? "border-black/85" : "border-transparent"
                    }`}
                  >
                    {t(dict, "nav.aboutArtiani")}
                  </span>
                </Link>
              </div>

              <div className="mt-auto border-t border-black/8 pt-4 text-sm text-black/72">
                <div className="space-y-2.5">
                  <div className="space-y-2">
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-black"
                    >
                      <MailIcon />
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                  <div className="space-y-2">
                    <a
                      href={`tel:${CONTACT_PHONE}`}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-black"
                    >
                      <PhoneIcon />
                      {CONTACT_PHONE}
                    </a>
                  </div>
                  <ArtistLinks
                    dict={dict}
                    showTitle={false}
                    showLabels
                    iconClassName="h-5 w-5"
                    facebookLabel="facebook.com/LevanMargianiArt"
                    instagramLabel="instagram.com/levanmargiani_art"
                    linksClassName="flex flex-wrap items-center gap-x-4 gap-y-1.5"
                    linkClassName="text-[13px] font-medium text-black/72 hover:text-black"
                  />
                  <p className="pt-1 text-[12px] tracking-[0.08em] text-black/48">
                    {t(dict, "footer.designedBy")}
                  </p>
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
        <div className="relative flex items-center justify-between gap-3">
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

            <nav className="hidden items-center justify-center gap-8 text-sm lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2">
              {navItems.map((item) => {
                const href = item.href ? `/${currentLang}/${item.href}` : `/${currentLang}`;
                const isActive = isPathActive(restPath, item.href);

                return (
                  <Link
                    key={item.href || "home"}
                    href={href}
                    onClick={closeMenus}
                    className={`inline-flex min-h-11 items-center justify-center text-center text-[0.97rem] font-medium transition-colors ${
                      isActive
                        ? "text-black"
                        : "text-black/72 hover:text-black"
                    }`}
                  >
                    <span
                      className={`border-b pb-0.5 ${
                        isActive ? "border-black/85" : "border-transparent"
                      }`}
                    >
                      {t(dict, item.labelKey)}
                    </span>
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
