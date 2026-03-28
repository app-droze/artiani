import Link from "next/link";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import Image from "next/image";
import type { Locale } from "@/src/i18n/locales";

type SiteFooterProps = {
  dict: Dictionary;
  lang: Locale;
};

const CONTACT_EMAIL = "app.droze@gmail.com";

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

export const SiteFooter = ({ dict, lang }: SiteFooterProps) => (
  <footer className="border-t border-[var(--border-soft)] bg-[var(--surface)]">
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid gap-6">
        <div className="grid gap-6 text-sm text-[color:var(--text-body)] md:grid-cols-[1.1fr_1fr] md:gap-x-8">
          <div className="space-y-3">
            <p className="ui-overline">{t(dict, "footer.supportLabel")}</p>
            <p className="max-w-[26rem] text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "footer.supportBody")}
            </p>
            <div className="space-y-2 pt-1">
              <p className="ui-overline">{t(dict, "footer.contactLabel")}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex min-w-0 items-center gap-2 text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-strong)]"
              >
                <MailIcon />
                <span className="whitespace-nowrap leading-none">{CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>

          <div className="grid gap-2.5 md:justify-items-end md:text-right">
            <p className="ui-overline">{t(dict, "footer.navigateLabel")}</p>
            <Link href={`/${lang}/returns`} className="transition-colors hover:text-[color:var(--text-strong)]">
              {t(dict, "nav.returns")}
            </Link>
            <Link href={`/${lang}/delivery`} className="transition-colors hover:text-[color:var(--text-strong)]">
              {t(dict, "nav.delivery")}
            </Link>
            <Link href={`/${lang}/track`} className="transition-colors hover:text-[color:var(--text-strong)]">
              {t(dict, "nav.track")}
            </Link>
            <Link href={`/${lang}/biography`} className="transition-colors hover:text-[color:var(--text-strong)]">
              {t(dict, "nav.aboutArtiani")}
            </Link>
          </div>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-4">
          <div className="flex items-center justify-center gap-2.5 text-center sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)]">
              <Image
                src="/brand/sheep-seal.png"
                alt=""
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
              />
            </span>
            <p className="text-[12px] tracking-[0.08em] text-[color:var(--text-muted)] sm:text-[13px]">
              {t(dict, "footer.designedBy")}
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
