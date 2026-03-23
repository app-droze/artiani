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

      const railCenter = rail.scrollLeft + rail.clientWidth / 2;
      let nextActiveIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      children.forEach((child, index) => {
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const distance = Math.abs(childCenter - railCenter);

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
            className="absolute left-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/92 text-black shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition disabled:pointer-events-none disabled:opacity-0"
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
            aria-label={nextLabel}
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            className="absolute right-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/92 text-black shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition disabled:pointer-events-none disabled:opacity-0"
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
              className="group block basis-[min(17rem,82vw)] shrink-0 snap-start rounded-[1.7rem] border border-black/8 bg-white/92 p-1.5 shadow-[0_16px_38px_rgba(19,15,11,0.08)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_20px_44px_rgba(19,15,11,0.11)] sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)]"
            >
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1.3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,238,230,0.9))]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 639px) 82vw, (max-width: 1023px) 48vw, 31vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.62)] via-[rgba(20,18,16,0.14)] via-48% to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-10 sm:px-4 sm:pb-4">
                  <p className="max-w-[11.5rem] text-sm font-semibold tracking-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.32)] sm:max-w-[12.5rem] sm:text-base">
                    {item.label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {items.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2.5">
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
                    ? "h-2.5 w-5 scale-100 border-[#9c7a44]/55 bg-[#b58a4f] shadow-[0_0_0_1px_rgba(181,138,79,0.08),0_4px_10px_rgba(120,88,43,0.18)]"
                    : "h-2.5 w-2.5 scale-[0.92] border-black/8 bg-black/14 hover:scale-100 hover:border-black/14 hover:bg-black/26"
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
