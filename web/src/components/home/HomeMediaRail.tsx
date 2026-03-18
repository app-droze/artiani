"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
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

const SCROLL_EPSILON = 6;

const formatMediaDate = (value: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}.${month}.${year}` : null;
};

export const HomeMediaRail = ({ cards, labels }: HomeMediaRailProps) => {
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
  }, [cards.length]);

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
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                aria-label={labels.previous}
                onClick={() => scrollByPage(-1)}
                disabled={!canScrollLeft}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/88 text-black transition disabled:opacity-35"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/88 text-black transition disabled:opacity-35"
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

        {cards.length > 0 ? (
          <div className="space-y-3">
            <ul
              ref={railRef}
              tabIndex={0}
              onKeyDown={handleRailKeyDown}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {cards.map((card) => (
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
                    <article className="group flex h-full min-h-[20rem] flex-col overflow-hidden rounded-[1.6rem] border border-black/8 bg-white/84 text-left transition hover:bg-white">
                      <div className="relative aspect-[1/1.02] overflow-hidden bg-[#e8e0d4]">
                        <Image
                          src={card.thumbnailUrl ?? "/media/fallback-media.svg"}
                          alt={card.title}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 20rem, 18rem"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.42)] via-[rgba(20,18,16,0.08)] to-transparent" />
                        <div className="absolute left-3 top-3 rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/58 backdrop-blur-sm">
                          {labels.typeLabels[card.type]}
                        </div>
                        {card.type === "youtube_video" ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/72 text-white shadow-[0_14px_35px_rgba(0,0,0,0.2)]">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="ml-0.5 h-5 w-5"
                                fill="currentColor"
                              >
                                <path d="M8 6.8v10.4c0 .6.6 1 1.1.7l8.2-5.2a.8.8 0 0 0 0-1.4L9.1 6.1A.8.8 0 0 0 8 6.8Z" />
                              </svg>
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                        <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-black sm:text-base">
                          {card.title}
                        </h3>
                        {card.excerpt ? (
                          <p className="line-clamp-3 text-sm leading-6 text-black/62">
                            {card.excerpt}
                          </p>
                        ) : null}
                        <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-[12px] text-black/46">
                          <span>{formatMediaDate(card.publishedAt) ?? card.externalSource ?? ""}</span>
                          <span className="font-medium text-black/58">
                            {card.type === "youtube_video" ? labels.play : labels.open}
                          </span>
                        </div>
                      </div>
                    </article>
                  </a>
                </li>
              ))}
            </ul>

            {hasOverflow ? (
              <div className="flex gap-2 md:hidden">
                <button
                  type="button"
                  aria-label={labels.previous}
                  onClick={() => scrollByPage(-1)}
                  disabled={!canScrollLeft}
                  className="flex-1 rounded-full border border-black/10 bg-white/88 px-4 py-2.5 text-sm text-black/74 transition disabled:opacity-35"
                >
                  {labels.previous}
                </button>
                <button
                  type="button"
                  aria-label={labels.next}
                  onClick={() => scrollByPage(1)}
                  disabled={!canScrollRight}
                  className="flex-1 rounded-full border border-black/10 bg-white/88 px-4 py-2.5 text-sm text-black/74 transition disabled:opacity-35"
                >
                  {labels.next}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-white/52 px-4 py-6 text-sm leading-6 text-black/56 sm:px-5">
            {labels.empty}
          </div>
        )}
      </div>
    </section>
  );
};
