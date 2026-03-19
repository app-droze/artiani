import { ArtistLinks } from "@/src/components/ArtistLinks";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import Image from "next/image";
import Link from "next/link";
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

export const SiteFooter = ({ lang, dict }: SiteFooterProps) => (
  <footer className="border-t border-black/8 bg-white/82">
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid gap-3.5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-x-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link href={`/${lang}`} className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            <Image
              src="/brand/sheep-seal.png"
              alt="Artiani"
              width={80}
              height={80}
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold uppercase tracking-[0.18em] text-black sm:text-base">
              Artiani
            </p>
          </div>
        </div>

        <ArtistLinks
          dict={dict}
          showTitle={false}
          showLabels
          className="order-3 md:order-none md:justify-self-center"
          iconClassName="h-5 w-5"
          facebookLabel="facebook.com/LevanMargianiArt"
          instagramLabel="instagram.com/levanmargiani_art"
          linksClassName="flex-row flex-wrap items-center gap-x-4 gap-y-1.5 md:flex-nowrap"
          linkClassName="text-[13px] font-medium text-black/72 hover:text-black"
        />

        <div className="order-2 flex flex-col gap-2 text-sm text-black/72 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 md:order-none md:justify-self-end">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 align-middle transition-colors hover:text-black"
          >
            <MailIcon />
            <span>{CONTACT_EMAIL}</span>
          </a>
          <a
            href={`tel:${CONTACT_PHONE}`}
            className="inline-flex items-center gap-1.5 align-middle transition-colors hover:text-black"
          >
            <PhoneIcon />
            <span>{CONTACT_PHONE}</span>
          </a>
        </div>
      </div>

      <div className="mt-3 border-t border-black/8 pt-3">
        <p className="text-center text-[12px] tracking-[0.08em] text-black/48 sm:text-[13px]">
          {t(dict, "footer.designedBy")}
        </p>
      </div>
    </div>
  </footer>
);
