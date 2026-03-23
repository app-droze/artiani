import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import { useId } from "react";

const FACEBOOK_URL = "https://www.facebook.com/LevanMargianiArt";
const INSTAGRAM_URL = "https://www.instagram.com/levanmargiani_art/";

type ArtistLinksProps = {
  dict: Dictionary;
  className?: string;
  titleClassName?: string;
  linksClassName?: string;
  linkClassName?: string;
  iconClassName?: string;
  showLabels?: boolean;
  showTitle?: boolean;
  facebookLabel?: string;
  instagramLabel?: string;
};

export const FacebookIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0`} fill="#1877F2">
    <path d="M13.3 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.8-.1-1.5-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4.1v2.3H7.7v3.2h2.7V21h2.9Z" />
  </svg>
);

export const InstagramIcon = ({ className = "h-4 w-4" }: { className?: string }) => {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0`}>
      <defs>
        <linearGradient id={gradientId} x1="4" x2="20" y1="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F58529" />
          <stop offset="0.35" stopColor="#DD2A7B" />
          <stop offset="0.68" stopColor="#8134AF" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.25" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="#DD2A7B" />
    </svg>
  );
};

export const ArtistLinks = ({
  dict,
  className = "",
  titleClassName = "",
  linksClassName = "",
  linkClassName = "",
  iconClassName = "h-4 w-4",
  showLabels = true,
  showTitle = true,
  facebookLabel,
  instagramLabel,
}: ArtistLinksProps) => (
  <div className={className}>
    {showTitle ? (
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-black/46 ${titleClassName}`.trim()}
      >
        {t(dict, "social.followArtist")}
      </p>
    ) : null}
    <div className={`${showTitle ? "mt-2 " : ""}flex flex-wrap items-center gap-2.5 ${linksClassName}`.trim()}>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noreferrer noopener"
        className={`inline-flex items-center gap-2 text-sm text-black/68 transition-colors hover:text-black ${linkClassName}`.trim()}
        aria-label={t(dict, "social.facebook")}
        title={t(dict, "social.facebook")}
      >
        <FacebookIcon className={iconClassName} />
        {showLabels ? (facebookLabel ?? t(dict, "social.facebook")) : null}
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noreferrer noopener"
        className={`inline-flex items-center gap-2 text-sm text-black/68 transition-colors hover:text-black ${linkClassName}`.trim()}
        aria-label={t(dict, "social.instagram")}
        title={t(dict, "social.instagram")}
      >
        <InstagramIcon className={iconClassName} />
        {showLabels ? (instagramLabel ?? t(dict, "social.instagram")) : null}
      </a>
    </div>
  </div>
);
