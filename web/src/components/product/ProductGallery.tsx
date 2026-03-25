"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { CatalogueBackground } from "@/src/lib/catalogueModels";

type StyleGroup = {
  key: string;
  label: string;
  background: CatalogueBackground | null;
};

type GalleryImage = {
  id: string;
  url: string;
  imageType: string | null;
  alt: string;
};

const DEFAULT_SWATCH_HEX = "#D8D1C5";

type ProductGalleryProps = {
  title: string;
  galleryImages: GalleryImage[];
  activeImageIndex: number;
  statusBadge?: {
    label: string;
    tone: "available" | "sold";
  } | null;
  styleGroups: StyleGroup[];
  selectedStyleKey: string;
  dict: Dictionary;
  onStyleSelect: (styleKey: string) => void;
  onSelectImage: (index: number) => void;
};

export const ProductGallery = ({
  galleryImages,
  activeImageIndex,
  statusBadge = null,
  styleGroups,
  selectedStyleKey,
  dict,
  onStyleSelect,
  onSelectImage,
}: ProductGalleryProps) => {
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerDragState = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    hasDragged: boolean;
  } | null>(null);
  const hasSyncedInitialPosition = useRef(false);
  const renderStyleSwatches = (orientation: "mobile" | "desktop") =>
    styleGroups.map((group) => {
      const isActive = group.key === selectedStyleKey;
      const background = group.background;
      const isImageSwatch = background?.displayType === "image" && Boolean(background.imageUrl);
      const swatchHex = background?.displayType === "color"
        ? background.hexValue ?? DEFAULT_SWATCH_HEX
        : DEFAULT_SWATCH_HEX;
      const isKnownSwatch = Boolean(background);
      const buttonSizeClass = orientation === "mobile" ? "h-10 w-10" : "h-9 w-9 sm:h-10 sm:w-10";
      const innerSizeClass = orientation === "mobile" ? "h-7 w-7" : "h-6 w-6 sm:h-7 sm:w-7";
      const badgeSizeClass = orientation === "mobile" ? "h-5 w-5" : "h-4.5 w-4.5 sm:h-5 sm:w-5";

      return (
        <button
          key={group.key}
          type="button"
          aria-label={`${t(dict, "productDetail.variantSelectorLabel")}: ${group.label}`}
          title={group.label}
          onClick={() => onStyleSelect(group.key)}
          className={`relative inline-flex shrink-0 items-center justify-center rounded-full border transition ${buttonSizeClass} ${
            isActive
              ? "border-[var(--button-dark)] bg-[var(--surface)]"
              : "border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--text-muted)]"
          } focus:outline-none focus:ring-2 focus:ring-black/25 focus:ring-offset-2 focus:ring-offset-[#f7f1e8]`}
        >
          <span
            aria-hidden="true"
            className={`${innerSizeClass} rounded-full border ${
              swatchHex === "#ffffff" ? "border-black/10" : "border-black/0"
            } relative overflow-hidden`}
            style={isImageSwatch ? undefined : { backgroundColor: swatchHex }}
          >
            {isImageSwatch && background?.imageUrl ? (
              <Image
                src={background.imageUrl}
                alt=""
                fill
                sizes="28px"
                className="object-cover"
              />
            ) : null}
            {!isKnownSwatch ? (
              <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_42%,rgba(17,17,17,0.16)_42%,rgba(17,17,17,0.16)_58%,transparent_58%,transparent_100%)]" />
            ) : null}
          </span>
          {isActive ? (
            <span className={`absolute -right-0.5 -top-0.5 inline-flex items-center justify-center rounded-full bg-[var(--button-dark)] text-[#faf7f2] ${badgeSizeClass}`}>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
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
    });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const targetLeft = viewport.clientWidth * activeImageIndex;
    const scrollBehavior = hasSyncedInitialPosition.current ? "smooth" : "auto";
    hasSyncedInitialPosition.current = true;

    if (Math.abs(viewport.scrollLeft - targetLeft) < 1) return;

    viewport.scrollTo({
      left: targetLeft,
      behavior: scrollBehavior,
    });
  }, [activeImageIndex, galleryImages.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(() => {
      viewport.scrollTo({
        left: viewport.clientWidth * activeImageIndex,
        behavior: "auto",
      });
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeImageIndex]);

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || galleryImages.length === 0 || viewport.clientWidth === 0) return;

    const nextIndex = Math.round(viewport.scrollLeft / viewport.clientWidth);
    const clampedIndex = Math.min(Math.max(nextIndex, 0), galleryImages.length - 1);

    if (clampedIndex !== activeImageIndex) {
      onSelectImage(clampedIndex);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (galleryImages.length <= 1 || event.pointerType === "touch") return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    pointerDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      hasDragged: false,
    };

    setIsPointerDragging(false);
    viewport.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const dragState = pointerDragState.current;
    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;

    if (!dragState.hasDragged && Math.abs(deltaX) > 6) {
      dragState.hasDragged = true;
      setIsPointerDragging(true);
    }

    if (!dragState.hasDragged) return;

    event.preventDefault();
    viewport.scrollLeft = dragState.startScrollLeft - deltaX;
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const dragState = pointerDragState.current;
    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) return;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    pointerDragState.current = null;
    setIsPointerDragging(false);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative h-[22rem] min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] sm:h-[32rem] lg:h-[42rem] xl:h-[46rem]">
          {statusBadge ? (
            <span
              className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] sm:left-4 sm:top-4 ${
                statusBadge.tone === "sold"
                  ? "bg-[#7e2e2e]/90 text-[#fff4f1]"
                  : "bg-[#2f6f4f]/88 text-[#f5fbf7]"
              }`}
            >
              {statusBadge.label}
            </span>
          ) : null}
          {galleryImages.length > 0 ? (
            <div
              ref={viewportRef}
              className={`flex h-full snap-x snap-mandatory overflow-x-auto select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                galleryImages.length > 1 ? (isPointerDragging ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
              style={{ touchAction: "pan-y pinch-zoom" }}
              onScroll={handleViewportScroll}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerDrag}
              onPointerCancel={finishPointerDrag}
            >
              {galleryImages.map((image) => (
                <div
                  key={image.id}
                  className="relative block h-full min-w-full shrink-0 snap-center"
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    draggable={false}
                    className="object-contain p-1 sm:p-1.5"
                    sizes="(max-width: 1024px) 100vw, 62vw"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[color:var(--text-muted)]">
              {t(dict, "catalogue.card.noImage")}
            </div>
          )}

          {styleGroups.length > 0 ? (
            <div className="absolute bottom-3 left-3 z-10 hidden max-w-[calc(100%-1.5rem)] flex-nowrap gap-1.5 overflow-x-auto rounded-full border border-[var(--border-soft)] bg-[var(--surface)] p-1 pr-1.5 sm:bottom-4 sm:left-4 sm:flex sm:gap-2 sm:p-1.5">
              {renderStyleSwatches("desktop")}
            </div>
          ) : null}
        </div>

        {styleGroups.length > 0 ? (
          <div className="flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto rounded-full border border-[var(--border-soft)] bg-[var(--surface)] p-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden">
            {renderStyleSwatches("mobile")}
          </div>
        ) : null}

        {galleryImages.length > 1 ? (
          <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)] p-2 sm:gap-2.5 sm:p-2.5">
            {galleryImages.map((image, index) => {
              const isActive = index === activeImageIndex;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onSelectImage(index)}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-[12px] bg-[var(--surface-muted)] sm:h-20 sm:w-16 ${
                    isActive ? "ring-2 ring-[var(--button-dark)]" : "ring-1 ring-[var(--border-soft)]"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
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
    </>
  );
};
