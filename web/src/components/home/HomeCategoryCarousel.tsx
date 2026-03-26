"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type HomeCategoryCarouselItem = {
  key: string;
  href: string;
  label: string;
  imageUrl: string | null;
};

type HomeCategoryCarouselProps = {
  items: HomeCategoryCarouselItem[];
  previousLabel: string;
  nextLabel: string;
};

const SCROLL_EPSILON = 6;

export const HomeCategoryCarousel = ({
  items,
  previousLabel,
  nextLabel,
}: HomeCategoryCarouselProps) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateState = () => {
      const track = trackRef.current;
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setHasOverflow(maxScrollLeft > SCROLL_EPSILON);
      setCanScrollLeft(rail.scrollLeft > SCROLL_EPSILON);
      setCanScrollRight(rail.scrollLeft < maxScrollLeft - SCROLL_EPSILON);

      const children = track ? (Array.from(track.children) as HTMLElement[]) : [];
      if (children.length === 0) {
        setActiveIndex(0);
        return;
      }

      if (rail.scrollLeft <= SCROLL_EPSILON) {
        setActiveIndex(0);
        return;
      }

      let nextActiveIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      children.forEach((child, index) => {
        const distance = Math.abs(child.offsetLeft - rail.scrollLeft);

        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveIndex = index;
        }
      });

      setActiveIndex(nextActiveIndex);
    };

    updateState();

    rail.addEventListener("scroll", updateState, { passive: true });

    const resizeObserver = new ResizeObserver(updateState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateState);
      resizeObserver.disconnect();
    };
  }, [items.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.82, 220),
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const target = trackRef.current?.children.item(index);
    if (!(target instanceof HTMLElement)) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  return (
    <div className="relative">
      {hasOverflow ? (
        <>
          <button
            type="button"
            aria-label={previousLabel}
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollLeft}
            className="absolute left-2 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[color:var(--text-strong)] transition disabled:pointer-events-none disabled:opacity-0"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
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
            aria-label={nextLabel}
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            className="absolute right-2 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[color:var(--text-strong)] transition disabled:pointer-events-none disabled:opacity-0"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.5 5.5 16 12l-6.5 6.5" />
            </svg>
          </button>
        </>
      ) : null}

      <div
        ref={railRef}
        className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <nav ref={trackRef} className="flex snap-x snap-mandatory gap-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group block basis-[calc((100%-0.75rem)/2)] shrink-0 snap-start snap-always rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] p-1 transition-colors duration-300 hover:bg-[#f1e9de] md:basis-[calc((100%-1.5rem)/3)] xl:basis-[calc((100%-2.25rem)/4)]"
            >
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[16px] bg-[var(--surface-muted)]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 767px) 48vw, (max-width: 1279px) 32vw, 24vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,20,17,0.52)] via-[rgba(23,20,17,0.10)] via-48% to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-11 sm:px-[1.125rem] sm:pb-[1.125rem]">
                  <p className="max-w-[11.5rem] text-base font-semibold leading-[1.2] tracking-normal text-white sm:max-w-[12.5rem] sm:text-[18px]">
                    {item.label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {items.length > 1 && hasOverflow ? (
        <div className="mt-5 flex items-center justify-center gap-[10px]">
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`carousel-dot-${item.key}`}
                type="button"
                aria-label={`${item.label} ${index + 1}`}
                aria-pressed={isActive}
                onClick={() => scrollToIndex(index)}
                className={`rounded-full transition-[width,background-color] duration-200 ${
                  isActive
                    ? "h-2 w-[22px] bg-[var(--accent)]"
                    : "h-2 w-2 bg-[#d6ccbf] hover:bg-[var(--accent-soft)]"
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
