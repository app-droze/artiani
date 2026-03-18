"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type StyleGroup = {
  key: string;
  label: string;
};

type GalleryImage = {
  id: string;
  url: string;
  imageType: string | null;
};

type SwatchInfo = {
  hex: string;
  isKnown: boolean;
};

const DEFAULT_SWATCH_HEX = "#D8D1C5";

const COLOR_SWATCH_RULES: Array<{ matches: string[]; hex: string }> = [
  { matches: ["antique olive"], hex: "#5A5A32" },
  { matches: ["antique navy"], hex: "#2A3148" },
  { matches: ["bordeaux", "bordo"], hex: "#6A1F24" },
  { matches: ["golden", "gold"], hex: "#B88A1B" },
  { matches: ["ornaments", "ornament"], hex: "#D7B85A" },
  { matches: ["white", "ivory"], hex: "#F5F1E8" },
  { matches: ["lilac"], hex: "#C8A2C8" },
  { matches: ["wine"], hex: "#4A0F1C" },
  { matches: ["black"], hex: "#111111" },
  { matches: ["green"], hex: "#1C3A2E" },
  { matches: ["purple"], hex: "#521A57" },
];

const normalizeColorLabel = (label: string) =>
  label
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getSwatchInfo = (label: string): SwatchInfo => {
  const normalizedLabel = normalizeColorLabel(label);

  for (const rule of COLOR_SWATCH_RULES) {
    if (rule.matches.some((match) => normalizedLabel.includes(match))) {
      return {
        hex: rule.hex,
        isKnown: true,
      };
    }
  }

  return {
    hex: DEFAULT_SWATCH_HEX,
    isKnown: false,
  };
};

type ProductGalleryProps = {
  title: string;
  galleryImages: GalleryImage[];
  activeImageIndex: number;
  styleGroups: StyleGroup[];
  selectedStyleKey: string;
  dict: Dictionary;
  onStyleSelect: (styleKey: string) => void;
  onSelectImage: (index: number) => void;
};

export const ProductGallery = ({
  title,
  galleryImages,
  activeImageIndex,
  styleGroups,
  selectedStyleKey,
  dict,
  onStyleSelect,
  onSelectImage,
}: ProductGalleryProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const swipeConsumed = useRef(false);
  const activeImageUrl = galleryImages[activeImageIndex]?.url ?? null;

  const handleSwipe = (direction: -1 | 1) => {
    if (galleryImages.length <= 1) return;
    const nextIndex = Math.min(
      Math.max(activeImageIndex + direction, 0),
      galleryImages.length - 1,
    );
    if (nextIndex !== activeImageIndex) {
      onSelectImage(nextIndex);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative h-[22rem] w-full overflow-hidden rounded-[1.5rem] bg-black/[0.035] sm:h-[32rem] lg:h-[42rem] xl:h-[46rem]">
          <button
            type="button"
            onClick={() => {
              if (swipeConsumed.current) {
                swipeConsumed.current = false;
                return;
              }

              if (activeImageUrl) {
                setIsPreviewOpen(true);
              }
            }}
            className="absolute inset-0"
            aria-label={t(dict, "productDetail.openImage")}
            style={{ touchAction: "pan-y pinch-zoom" }}
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
              swipeConsumed.current = false;
            }}
            onTouchEnd={(event) => {
              const startX = touchStartX.current;
              const endX = event.changedTouches[0]?.clientX ?? null;
              touchStartX.current = null;

              if (startX === null || endX === null) return;

              const deltaX = endX - startX;
              if (Math.abs(deltaX) < 36) return;

              swipeConsumed.current = true;
              handleSwipe(deltaX < 0 ? 1 : -1);
            }}
          >
            {activeImageUrl ? (
              <Image
                src={activeImageUrl}
                alt={title}
                fill
                className="object-contain p-1 sm:p-1.5"
                sizes="(max-width: 1024px) 100vw, 62vw"
              />
            ) : null}
          </button>

          {styleGroups.length > 0 ? (
            <div className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-nowrap gap-1.5 rounded-full bg-white/42 p-1 shadow-[0_10px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:bottom-4 sm:left-4 sm:gap-2 sm:p-1.5">
              {styleGroups.map((group) => {
                const isActive = group.key === selectedStyleKey;
                const swatch = getSwatchInfo(group.label);

                return (
                  <button
                    key={group.key}
                    type="button"
                    aria-label={`${t(dict, "productDetail.variantSelectorLabel")}: ${group.label}`}
                    title={group.label}
                    onClick={() => onStyleSelect(group.key)}
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition sm:h-10 sm:w-10 ${
                      isActive
                        ? "border-black/70 bg-white/92 shadow-[0_0_0_2px_rgba(17,17,17,0.08)]"
                        : "border-black/10 bg-white/68 hover:border-black/24"
                    } focus:outline-none focus:ring-2 focus:ring-black/25 focus:ring-offset-2 focus:ring-offset-[#f7f1e8]`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-6 w-6 rounded-full border sm:h-7 sm:w-7 ${
                        swatch.hex === "#F5F1E8" ? "border-black/10" : "border-black/0"
                      } ${swatch.isKnown ? "" : "relative overflow-hidden"}`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {!swatch.isKnown ? (
                        <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_42%,rgba(17,17,17,0.16)_42%,rgba(17,17,17,0.16)_58%,transparent_58%,transparent_100%)]" />
                      ) : null}
                    </span>
                    {isActive ? (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2D7A46] text-white shadow-[0_5px_14px_rgba(0,0,0,0.16)] sm:h-5 sm:w-5">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m5.5 10.2 2.7 2.7 6.3-6.5" />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {galleryImages.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto rounded-[1.1rem] bg-white/72 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:gap-2.5 sm:p-2.5">
            {galleryImages.map((image, index) => {
              const isActive = index === activeImageIndex;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onSelectImage(index)}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-[0.9rem] bg-black/[0.04] sm:h-20 sm:w-16 ${
                    isActive ? "ring-2 ring-black/70" : "ring-1 ring-black/10"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isPreviewOpen && activeImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t(dict, "productDetail.closeImage")}
            onClick={() => setIsPreviewOpen(false)}
          />
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/12 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
          >
            {t(dict, "nav.close")}
          </button>
          <div className="relative z-10 h-full max-h-[90vh] w-full max-w-6xl">
            <Image
              src={activeImageUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
