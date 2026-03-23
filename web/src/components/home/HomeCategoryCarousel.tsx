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
            className="absolute left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8cbc0] bg-[rgba(251,246,239,0.95)] text-[#241d18] shadow-[0_8px_20px_rgba(44,31,19,0.06)] transition disabled:pointer-events-none disabled:opacity-0"
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
            className="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8cbc0] bg-[rgba(251,246,239,0.95)] text-[#241d18] shadow-[0_8px_20px_rgba(44,31,19,0.06)] transition disabled:pointer-events-none disabled:opacity-0"
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
        className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <nav ref={trackRef} className="flex snap-x snap-mandatory gap-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group block basis-[min(17rem,82vw)] shrink-0 snap-start rounded-[1.55rem] border border-[rgba(216,203,192,0.82)] bg-[rgba(251,246,239,0.94)] p-[0.3125rem] shadow-[0_10px_22px_rgba(44,31,19,0.045)] transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-[1px] hover:bg-[#fbf6ef] hover:shadow-[0_12px_26px_rgba(44,31,19,0.055)] sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)]"
            >
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1.18rem] bg-[linear-gradient(180deg,rgba(251,246,239,0.98),rgba(242,232,218,0.92))]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 639px) 82vw, (max-width: 1023px) 48vw, 31vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.5)] via-[rgba(20,18,16,0.1)] via-48% to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-11 sm:px-[1.125rem] sm:pb-[1.125rem]">
                  <p className="max-w-[11.5rem] rounded-[0.9rem] bg-[rgba(26,22,18,0.16)] px-3 py-2 text-sm font-semibold tracking-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.26)] sm:max-w-[12.5rem] sm:text-base">
                    {item.label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {items.length > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2.5">
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`carousel-dot-${item.key}`}
                type="button"
                aria-label={`${item.label} ${index + 1}`}
                aria-pressed={isActive}
                onClick={() => scrollToIndex(index)}
                className={`rounded-full border transition-[width,transform,background-color,border-color,opacity,box-shadow] duration-250 ${
                  isActive
                    ? "h-2.5 w-5 scale-100 border-[rgba(156,115,64,0.45)] bg-[#b58a4f] shadow-[0_0_0_1px_rgba(181,138,79,0.08),0_4px_10px_rgba(120,88,43,0.18)]"
                    : "h-2.5 w-2.5 scale-[0.94] border-[#d8cbc0] bg-[rgba(201,184,168,0.46)] hover:scale-100 hover:border-[#c9b8a8] hover:bg-[rgba(201,184,168,0.58)]"
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
