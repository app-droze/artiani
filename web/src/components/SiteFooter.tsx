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
const GIORGI_LINKEDIN_URL = "https://www.linkedin.com/in/giorgi-margiani-348b30186/";
const GIORGI_FACEBOOK_URL = "https://www.facebook.com/gmargiani";

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

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.03-1.84-3.03-1.85 0-2.13 1.44-2.13 2.93v5.68H9.36V9h3.42v1.56h.05c.48-.9 1.64-1.84 3.38-1.84 3.61 0 4.28 2.38 4.28 5.48v6.25ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22 1H2C1.45 1 1 1.46 1 2.02v19.96C1 22.54 1.45 23 2 23h20c.55 0 1-.46 1-1.02V2.02C23 1.46 22.55 1 22 1Z"
      fill="#ffffff"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.12 11.93v-8.44H7.08v-3.5h3.04V9.39c0-3.02 1.79-4.69 4.54-4.69 1.32 0 2.7.24 2.7.24v2.96h-1.52c-1.5 0-1.97.94-1.97 1.89v2.27h3.35l-.54 3.5h-2.81V24C19.61 23.08 24 18.09 24 12.07Z"
      fill="#ffffff"
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
            <div className="flex items-center gap-2">
              <a
                href={GIORGI_LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Giorgi Margiani on LinkedIn"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0A66C2] transition-colors hover:bg-[#004182]"
              >
                <LinkedinIcon />
              </a>
              <a
                href={GIORGI_FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Giorgi Margiani on Facebook"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] transition-colors hover:bg-[#166fe5]"
              >
                <FacebookIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
