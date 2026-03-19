"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ArtistMediaCard } from "@/src/lib/mediaCards";

type HomeMediaRailLabels = {
  kicker: string;
  title: string;
  empty: string;
  previous: string;
  next: string;
  play: string;
  open: string;
  typeLabels: Record<ArtistMediaCard["type"], string>;
};

type HomeMediaRailProps = {
  cards: ArtistMediaCard[];
  labels: HomeMediaRailLabels;
};

type SourceMeta = {
  domain: string;
  siteLabel: string;
  faviconUrl: string | null;
};

const SCROLL_EPSILON = 6;

const normalizeCardUrl = (value: string) => {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${normalizedPath}${parsed.search}`;
  } catch {
    return trimmed;
  }
};

const dedupeCardsByUrl = (cards: ArtistMediaCard[]) => {
  const seen = new Set<string>();

  return cards.filter((card) => {
    const normalizedUrl = normalizeCardUrl(card.url);
    if (seen.has(normalizedUrl)) {
      return false;
    }

    seen.add(normalizedUrl);
    return true;
  });
};

const getSourceMeta = (url: string, externalSource: string | null): SourceMeta => {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const siteLabel =
      externalSource?.trim() ||
      domain
        .split(".")
        .filter(Boolean)
        .slice(0, -1)
        .join(" ") ||
      domain;

    return {
      domain,
      siteLabel,
      faviconUrl: `${parsed.origin}/favicon.ico`,
    };
  } catch {
    const fallbackLabel = externalSource?.trim() || "Link";
    return {
      domain: fallbackLabel,
      siteLabel: fallbackLabel,
      faviconUrl: null,
    };
  }
};

const toDisplayLabel = (value: string) =>
  value
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getDomainAccent = (domain: string) => {
  const root = domain
    .replace(/^www\./, "")
    .split(".")
    .filter(Boolean)
    .slice(0, -1)
    .join(" ");

  return toDisplayLabel(root || domain);
};

const YouTubeIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M21.2 7.3a2.8 2.8 0 0 0-2-2c-1.8-.5-7.2-.5-7.2-.5s-5.4 0-7.2.5a2.8 2.8 0 0 0-2 2A29.3 29.3 0 0 0 2.3 12a29.3 29.3 0 0 0 .5 4.7 2.8 2.8 0 0 0 2 2c1.8.5 7.2.5 7.2.5s5.4 0 7.2-.5a2.8 2.8 0 0 0 2-2 29.3 29.3 0 0 0 .5-4.7 29.3 29.3 0 0 0-.5-4.7ZM10.3 15.6V8.4l5.9 3.6-5.9 3.6Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M13.3 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.8-.1-1.5-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4.1v2.3H7.7v3.2h2.7V21h2.9Z" />
  </svg>
);

const LinkIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.5 13.5 13.5 10.5" />
    <path d="M7.8 16.2a3 3 0 0 1 0-4.2l3-3a3 3 0 1 1 4.2 4.2l-.6.6" />
    <path d="M16.2 7.8a3 3 0 0 1 0 4.2l-3 3a3 3 0 1 1-4.2-4.2l.6-.6" />
  </svg>
);

const SourceBadge = ({
  card,
  source,
}: {
  card: ArtistMediaCard;
  source: SourceMeta;
}) => {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const sourceLabel = card.type === "youtube_video"
    ? "YouTube"
    : card.type === "facebook_post"
      ? "Facebook"
      : toDisplayLabel(source.siteLabel);

  if (card.type === "youtube_video") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b42318] shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FF0000] text-white">
          <YouTubeIcon />
        </span>
        {sourceLabel}
      </div>
    );
  }

  if (card.type === "facebook_post") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1877F2] shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-white">
          <FacebookIcon />
        </span>
        {sourceLabel}
      </div>
    );
  }

  if (source.faviconUrl && !faviconFailed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/64 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- external favicons are dynamic and need native onError fallback */}
        <img
          src={source.faviconUrl}
          alt={source.domain}
          className="h-5 w-5 object-contain"
          loading="lazy"
          onError={() => setFaviconFailed(true)}
        />
        {sourceLabel}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/64 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.06] text-black/62">
        <LinkIcon />
      </span>
      {sourceLabel}
    </div>
  );
};

const MediaCardVisual = ({
  card,
  labels,
}: {
  card: ArtistMediaCard;
  labels: HomeMediaRailLabels;
}) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [fallbackFaviconFailed, setFallbackFaviconFailed] = useState(false);
  const source = useMemo(() => getSourceMeta(card.url, card.externalSource), [card.url, card.externalSource]);
  const hasThumbnail = Boolean(card.thumbnailUrl) && !thumbnailFailed;
  const domainAccent = getDomainAccent(source.domain);

  const renderFallbackVisual = () => {
    if (card.type === "facebook_post") {
      return (
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#eef4ff_0%,#bfd8ff_42%,#1463d8_100%)]">
          <div className="absolute -right-6 top-4 text-white/18">
            <div className="h-40 w-40">
              <FacebookIcon />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between px-5 py-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/88 text-[#1877F2] shadow-[0_18px_44px_rgba(0,0,0,0.12)]">
              <FacebookIcon />
            </div>
            <div className="space-y-2 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                Facebook
              </p>
              <p className="line-clamp-3 text-2xl font-semibold tracking-tight">
                {card.title}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (card.type === "youtube_video") {
      return (
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(155deg,#2a1414_0%,#6b1616_48%,#ce2020_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_38%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex h-18 w-18 items-center justify-center rounded-full bg-white/14 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
                <path d="M8 6.8v10.4c0 .6.6 1 1.1.7l8.2-5.2a.8.8 0 0 0 0-1.4L9.1 6.1A.8.8 0 0 0 8 6.8Z" />
              </svg>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-14 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
              YouTube
            </p>
            <p className="mt-2 line-clamp-3 text-2xl font-semibold tracking-tight">
              {card.title}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(155deg,#f5efe6_0%,#e6dccf_48%,#cdbfaa_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_32%)]" />
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between px-5 py-5 text-black">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/46">
                {labels.typeLabels[card.type]}
              </p>
              <p className="text-lg font-semibold tracking-tight text-black/84">
                {domainAccent}
              </p>
            </div>
            {source.faviconUrl && !fallbackFaviconFailed ? (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/86 shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- external favicons are dynamic and need native onError fallback */}
                <img
                  src={source.faviconUrl}
                  alt={source.domain}
                  className="h-6 w-6 object-contain"
                  loading="lazy"
                  onError={() => setFallbackFaviconFailed(true)}
                />
              </div>
            ) : (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/74 text-black/54 shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
                <LinkIcon />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="line-clamp-3 text-2xl font-semibold tracking-tight text-black/88">
              {card.title}
            </p>
            {card.excerpt ? (
              <p className="line-clamp-2 text-sm leading-6 text-black/58">
                {card.excerpt}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <article className="group relative h-full min-h-[19rem] overflow-hidden rounded-[1.6rem] border border-black/8 bg-white/84 transition hover:bg-white">
      <div className="relative h-full overflow-hidden bg-[#e8e0d4]">
        {hasThumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element -- media thumbnails can be arbitrary external URLs and need native onError fallback */
          <img
            src={card.thumbnailUrl!}
            alt={card.title}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          renderFallbackVisual()
        )}

        {hasThumbnail ? (
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.72)] via-[rgba(20,18,16,0.2)] to-transparent" />
        ) : null}

        <div className="absolute left-3 top-3">
          <SourceBadge card={card} source={source} />
        </div>

        {card.type === "youtube_video" && hasThumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black/72 text-white shadow-[0_14px_35px_rgba(0,0,0,0.2)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
                <path d="M8 6.8v10.4c0 .6.6 1 1.1.7l8.2-5.2a.8.8 0 0 0 0-1.4L9.1 6.1A.8.8 0 0 0 8 6.8Z" />
              </svg>
            </span>
          </div>
        ) : null}

        {hasThumbnail ? (
          <div className="absolute inset-x-0 bottom-0 space-y-2 px-3.5 pb-3.5 pt-12 sm:px-4 sm:pb-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/68">
              {labels.typeLabels[card.type]}
            </div>
            <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-white sm:text-base">
              {card.title}
            </h3>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export const HomeMediaRail = ({ cards, labels }: HomeMediaRailProps) => {
  const dedupedCards = useMemo(() => dedupeCardsByUrl(cards), [cards]);
  const railRef = useRef<HTMLUListElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateScrollState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setHasOverflow(maxScrollLeft > SCROLL_EPSILON);
      setCanScrollLeft(rail.scrollLeft > SCROLL_EPSILON);
      setCanScrollRight(rail.scrollLeft < maxScrollLeft - SCROLL_EPSILON);
    };

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [dedupedCards.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.82, 240),
      behavior: "smooth",
    });
  };

  const handleRailKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage(1);
    }
  };

  return (
    <section className="border-t border-black/8 pt-5 md:pt-6" aria-label={labels.title}>
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
              {labels.kicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-[2rem]">
              {labels.title}
            </h2>
          </div>

          {hasOverflow ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={labels.previous}
                onClick={() => scrollByPage(-1)}
                disabled={!canScrollLeft}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/12 bg-white/92 text-black shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition disabled:opacity-35 sm:h-11 sm:w-11"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 5.5 8 12l6.5 6.5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={labels.next}
                onClick={() => scrollByPage(1)}
                disabled={!canScrollRight}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/12 bg-white/92 text-black shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition disabled:opacity-35 sm:h-11 sm:w-11"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9.5 5.5 16 12l-6.5 6.5" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        {dedupedCards.length > 0 ? (
          <ul
            ref={railRef}
            tabIndex={0}
            onKeyDown={handleRailKeyDown}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {dedupedCards.map((card) => (
              <li
                key={card.id}
                className="basis-[calc(50%-0.4rem)] min-w-[10.75rem] shrink-0 snap-start sm:basis-[17rem] sm:min-w-[17rem] lg:basis-[18rem] lg:min-w-[18rem]"
              >
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${labels.open}: ${card.title}`}
                  className="block h-full"
                >
                  <MediaCardVisual card={card} labels={labels} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-white/52 px-4 py-6 text-sm leading-6 text-black/56 sm:px-5">
            {labels.empty}
          </div>
        )}
      </div>
    </section>
  );
};
