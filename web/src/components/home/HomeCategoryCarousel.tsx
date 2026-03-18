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
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setHasOverflow(maxScrollLeft > SCROLL_EPSILON);
      setCanScrollLeft(rail.scrollLeft > SCROLL_EPSILON);
      setCanScrollRight(rail.scrollLeft < maxScrollLeft - SCROLL_EPSILON);
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
        <nav className="flex snap-x snap-mandatory gap-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group block min-w-[11rem] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/82 transition-colors hover:bg-white sm:min-w-[12.5rem] lg:min-w-0 lg:flex-1"
            >
              <div className="relative aspect-[4/4.8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,238,230,0.88))]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.48)] via-[rgba(20,18,16,0.08)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-10 sm:px-4 sm:pb-4">
                  <p className="text-sm font-semibold tracking-tight text-white sm:text-base">
                    {item.label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
