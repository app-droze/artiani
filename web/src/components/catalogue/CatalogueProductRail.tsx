"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/src/components/catalogue/ProductCard";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type { CatalogueProduct } from "@/src/lib/catalogueModels";

type CatalogueProductRailProps = {
  products: CatalogueProduct[];
  lang: Locale;
  dict: Dictionary;
};

export const CatalogueProductRail = ({
  products,
  lang,
  dict,
}: CatalogueProductRailProps) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const SCROLL_EPSILON = 6;
    const updateScrollState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      const hasOverflow = maxScrollLeft > SCROLL_EPSILON;

      setCanScroll(hasOverflow);
      setCanScrollLeft(hasOverflow && rail.scrollLeft > SCROLL_EPSILON);
      setCanScrollRight(hasOverflow && rail.scrollLeft < maxScrollLeft - SCROLL_EPSILON);
    };

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [products]);

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({
      left: (direction === "right" ? 1 : -1) * Math.round(rail.clientWidth * 0.82),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {canScroll && canScrollLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-[rgba(242,235,226,0.82)] via-[rgba(242,235,226,0.45)] to-transparent sm:block lg:w-14" />
      ) : null}
      {canScroll && canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-[rgba(242,235,226,0.86)] via-[rgba(242,235,226,0.52)] to-transparent sm:block lg:w-16" />
      ) : null}

      <button
        type="button"
        onClick={() => scrollRail("left")}
        aria-label={t(dict, "home.media.previous")}
        className={`absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-[rgba(247,242,235,0.88)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(23,20,17,0.08)] backdrop-blur transition-opacity sm:inline-flex lg:left-2 ${
          canScroll && canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="m12.5 4.5-5.4 5.5 5.4 5.5 1.4-1.4-4-4.1 4-4.1z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => scrollRail("right")}
        aria-label={t(dict, "home.media.next")}
        className={`absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-[rgba(247,242,235,0.88)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(23,20,17,0.08)] backdrop-blur transition-opacity sm:inline-flex lg:right-2 ${
          canScroll && canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="m7.5 4.5-1.4 1.4 4 4.1-4 4.1 1.4 1.4 5.4-5.5z" />
        </svg>
      </button>

      <div
        ref={railRef}
        className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-full snap-x snap-mandatory gap-4 pr-16 sm:gap-5 sm:pl-4 sm:pr-20 lg:gap-6 lg:pl-5 lg:pr-24">
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[74%] min-w-0 shrink-0 snap-start sm:w-[40%] lg:w-[27.5%] xl:w-[21.5%]"
            >
              <ProductCard product={product} lang={lang} dict={dict} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
