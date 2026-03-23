import { FacebookIcon, InstagramIcon } from "@/src/components/ArtistLinks";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import Image from "next/image";
import type { Locale } from "@/src/i18n/locales";

type SiteFooterProps = {
  dict: Dictionary;
  lang: Locale;
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

export const SiteFooter = ({ dict }: SiteFooterProps) => (
  <footer className="border-t border-[var(--border-soft)] bg-[var(--surface)]">
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid gap-6">
        <div className="grid gap-4 text-sm text-[color:var(--text-body)] sm:grid-cols-2 sm:gap-x-6">
          <div className="grid gap-2.5">
            <a
              href="https://www.facebook.com/LevanMargianiArt"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-0 items-start gap-1.5 align-middle transition-colors hover:text-[color:var(--text-strong)]"
            >
              <FacebookIcon className="h-5 w-5" />
              <span className="[overflow-wrap:anywhere]">facebook.com/LevanMargianiArt</span>
            </a>
            <a
              href="https://www.instagram.com/levanmargiani_art/"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-0 items-start gap-1.5 align-middle transition-colors hover:text-[color:var(--text-strong)]"
            >
              <InstagramIcon className="h-5 w-5" />
              <span className="[overflow-wrap:anywhere]">instagram.com/levanmargiani_art</span>
            </a>
          </div>

          <div className="grid gap-2.5 sm:justify-items-end">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-w-0 items-start gap-1.5 align-middle transition-colors hover:text-[color:var(--text-strong)]"
            >
              <MailIcon />
              <span className="[overflow-wrap:anywhere]">{CONTACT_EMAIL}</span>
            </a>
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="inline-flex min-w-0 items-start gap-1.5 align-middle transition-colors hover:text-[color:var(--text-strong)]"
            >
              <PhoneIcon />
              <span className="[overflow-wrap:anywhere]">{CONTACT_PHONE}</span>
            </a>
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
