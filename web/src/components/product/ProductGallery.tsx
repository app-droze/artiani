"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
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
  enableHoverMagnifier?: boolean;
  imageInfoText?: string | null;
  imageInfoButtonLabel?: string;
  imageInfoDialogTitle?: string;
  imageInfoCloseLabel?: string;
  statusBadge?: {
    label: string;
    tone: "available" | "sold";
  } | null;
  backLink?: {
    href: string;
    label: string;
  } | null;
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
  enableHoverMagnifier = false,
  imageInfoText = null,
  imageInfoButtonLabel = "",
  imageInfoDialogTitle = "",
  imageInfoCloseLabel = "",
  statusBadge = null,
  backLink = null,
  styleGroups,
  selectedStyleKey,
  dict,
  onStyleSelect,
  onSelectImage,
}: ProductGalleryProps) => {
  const [isImageInfoOpen, setIsImageInfoOpen] = useState(false);
  const [isTouchMagnifierEnabled, setIsTouchMagnifierEnabled] = useState(false);
  const [loadedMagnifierImageKeys, setLoadedMagnifierImageKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [magnifierState, setMagnifierState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    frameWidth: number;
    frameHeight: number;
    mode: "mouse" | "touch";
  }>({
    visible: false,
    x: 0,
    y: 0,
    frameWidth: 0,
    frameHeight: 0,
    mode: "mouse",
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageFrameRef = useRef<HTMLDivElement | null>(null);
  const touchMagnifierState = useRef<{
    pointerId: number;
  } | null>(null);
  const hasSyncedInitialPosition = useRef(false);
  const isTouchMagnifierActive = enableHoverMagnifier && isTouchMagnifierEnabled;
  const renderStyleSwatches = (orientation: "mobile" | "desktop") =>
    styleGroups.map((group) => {
      const isActive = group.key === selectedStyleKey;
      const background = group.background;
      const isImageSwatch = background?.displayType === "image" && Boolean(background.imageUrl);
      const swatchHex = background?.displayType === "color"
        ? background.hexValue ?? DEFAULT_SWATCH_HEX
        : DEFAULT_SWATCH_HEX;
      const isKnownSwatch = Boolean(background);
      const buttonSizeClass = orientation === "mobile" ? "h-10 w-10" : "h-8 w-8 sm:h-10 sm:w-10";
      const innerSizeClass = orientation === "mobile" ? "h-7 w-7" : "h-5 w-5 sm:h-7 sm:w-7";
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

  const handleSelectPreviousImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    onSelectImage(Math.max(activeImageIndex - 1, 0));
  };

  const handleSelectNextImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    onSelectImage(Math.min(activeImageIndex + 1, galleryImages.length - 1));
  };

  const updateMagnifierFromPoint = ({
    clientX,
    clientY,
    mode,
  }: {
    clientX: number;
    clientY: number;
    mode: "mouse" | "touch";
  }) => {
    if (!enableHoverMagnifier || (mode === "touch" && !isTouchMagnifierEnabled)) {
      return;
    }

    const frame = imageFrameRef.current;
    if (!frame) {
      return;
    }

    const bounds = frame.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const relativeX = clientX - bounds.left;
    const relativeY = clientY - bounds.top;
    const clampedX = Math.min(Math.max(relativeX, 0), bounds.width);
    const clampedY = Math.min(Math.max(relativeY, 0), bounds.height);

    setMagnifierState({
      visible: true,
      x: clampedX,
      y: clampedY,
      frameWidth: bounds.width,
      frameHeight: bounds.height,
      mode,
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !isTouchMagnifierActive) {
      return;
    }

    viewportRef.current?.setPointerCapture(event.pointerId);
    touchMagnifierState.current = {
      pointerId: event.pointerId,
    };
    updateMagnifierFromPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: "touch",
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const touchState = touchMagnifierState.current;
    if (!touchState || touchState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    updateMagnifierFromPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: "touch",
    });
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const touchState = touchMagnifierState.current;
    if (!touchState || touchState.pointerId !== event.pointerId) {
      return;
    }

    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId);
    }

    touchMagnifierState.current = null;
    hideMagnifier();
  };

  const handleMagnifierMove = (event: ReactMouseEvent<HTMLDivElement>) =>
    updateMagnifierFromPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      mode: "mouse",
    });

  const hideMagnifier = () => {
    setMagnifierState((current) =>
      current.visible ? { ...current, visible: false } : current,
    );
  };

  const toggleTouchMagnifier = () => {
    setIsTouchMagnifierEnabled((current) => {
      if (current) {
        touchMagnifierState.current = null;
        setMagnifierState((existing) =>
          existing.mode === "touch" ? { ...existing, visible: false } : existing,
        );
      } else {
        const frame = imageFrameRef.current;
        if (frame) {
          const bounds = frame.getBoundingClientRect();
          setMagnifierState({
            visible: true,
            x: bounds.width / 2,
            y: bounds.height / 2,
            frameWidth: bounds.width,
            frameHeight: bounds.height,
            mode: "touch",
          });
        }
      }

      return !current;
    });
  };

  const activeImageUrl = galleryImages[activeImageIndex]?.url ?? null;
  const shouldShowImageInfoButton = Boolean(imageInfoText) && activeImageIndex === 0;
  const MAGNIFIER_ZOOM = 2.25;
  const magnifierSizePx = magnifierState.mode === "touch" ? 156 : 220;
  const magnifierVerticalOffsetPx = magnifierState.mode === "touch" ? 108 : 0;
  const magnifierImageRequestWidth = Math.max(
    magnifierSizePx,
    Math.ceil(magnifierState.frameWidth * MAGNIFIER_ZOOM),
  );
  const magnifierImageRequestHeight = Math.max(
    magnifierSizePx,
    Math.ceil(magnifierState.frameHeight * MAGNIFIER_ZOOM),
  );
  const magnifierImageLoadKey = activeImageUrl
    ? `${activeImageUrl}:${magnifierImageRequestWidth}x${magnifierImageRequestHeight}`
    : null;
  const isMagnifierImageLoaded = magnifierImageLoadKey
    ? loadedMagnifierImageKeys.has(magnifierImageLoadKey)
    : false;

  useEffect(() => {
    if (!isImageInfoOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageInfoOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImageInfoOpen]);

  return (
    <>
      {isImageInfoOpen && imageInfoText ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(18,16,14,0.38)] px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-image-info-title"
            className="w-full max-w-[26rem] rounded-[1.5rem] border border-black/8 bg-[rgba(250,247,242,0.98)] p-5 shadow-[0_24px_60px_rgba(18,16,14,0.18)] sm:p-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/42">
                  {title}
                </p>
                <h2 id="product-image-info-title" className="text-2xl font-semibold tracking-tight text-black">
                  {imageInfoDialogTitle}
                </h2>
                <p className="text-sm leading-7 text-black/72">
                  {imageInfoText}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsImageInfoOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-black/[0.03]"
                >
                  {imageInfoCloseLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 sm:space-y-3">
        <div
          ref={imageFrameRef}
          className="relative h-[23rem] min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] sm:h-[34rem] lg:h-[39rem] xl:h-[43rem]"
          onMouseMove={handleMagnifierMove}
          onMouseLeave={hideMagnifier}
        >
          {statusBadge || backLink ? (
            <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
              {backLink ? (
                <Link
                  href={backLink.href}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[rgba(250,247,242,0.94)] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)] shadow-[0_10px_24px_rgba(18,16,14,0.08)] backdrop-blur-sm transition-colors hover:text-[color:var(--text-strong)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m11.5 4.5-5 5 5 5" />
                  </svg>
                  {backLink.label}
                </Link>
              ) : (
                <span />
              )}
              {statusBadge ? (
                <span
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] sm:px-4.5 sm:py-1.5 ${
                    statusBadge.tone === "sold"
                      ? "bg-[#7e2e2e]/90 text-[#fff4f1]"
                      : "bg-[#2f6f4f]/88 text-[#f5fbf7]"
                  }`}
                >
                  {statusBadge.label}
                </span>
              ) : null}
            </div>
          ) : null}
          {shouldShowImageInfoButton ? (
            <button
              type="button"
              onClick={() => setIsImageInfoOpen(true)}
              aria-label={imageInfoButtonLabel}
              className={`absolute right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-[rgba(250,247,242,0.94)] text-[color:var(--text-strong)] shadow-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-black/15 focus:ring-offset-2 focus:ring-offset-[#f7f1e8] sm:right-4 ${
                backLink ? "top-[3.75rem] sm:top-[4.5rem]" : "top-3 sm:top-4"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="10" cy="10" r="6.75" />
                <path d="M10 8.6v4.1" />
                <circle cx="10" cy="6.3" r="0.45" fill="currentColor" stroke="none" />
              </svg>
            </button>
          ) : null}
          {galleryImages.length > 0 ? (
            <div
              ref={viewportRef}
              className="flex h-full snap-x snap-mandatory overflow-x-auto select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ touchAction: isTouchMagnifierActive ? "none" : "manipulation" }}
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
                    className="object-contain p-0 sm:p-1.5"
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

          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                aria-label={t(dict, "home.media.previous")}
                onClick={handleSelectPreviousImage}
                disabled={activeImageIndex === 0}
                className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-[rgba(250,247,242,0.9)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(18,16,14,0.08)] backdrop-blur-sm transition hover:bg-white disabled:cursor-default disabled:opacity-35 sm:left-4"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m11.5 4.5-5 5 5 5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={t(dict, "home.media.next")}
                onClick={handleSelectNextImage}
                disabled={activeImageIndex === galleryImages.length - 1}
                className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-[rgba(250,247,242,0.9)] text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(18,16,14,0.08)] backdrop-blur-sm transition hover:bg-white disabled:cursor-default disabled:opacity-35 sm:right-4"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m8.5 4.5 5 5-5 5" />
                </svg>
              </button>
            </>
          ) : null}

          {galleryImages.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center">
              <div className="pointer-events-auto inline-flex items-center gap-[10px] rounded-full bg-[rgba(250,247,242,0.84)] px-3 py-2 shadow-[0_10px_24px_rgba(18,16,14,0.08)] backdrop-blur-sm">
                {galleryImages.map((image, index) => {
                  const isActive = index === activeImageIndex;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={`${title} ${index + 1}`}
                      aria-pressed={isActive}
                      onClick={() => onSelectImage(index)}
                      className={`rounded-full transition-[width,background-color] duration-200 ${
                        isActive
                          ? "h-2 w-[22px] bg-[var(--accent)]"
                          : "h-2 w-2 bg-[#d6ccbf] hover:bg-[var(--accent-soft)]"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {enableHoverMagnifier ? (
            <button
              type="button"
              onClick={toggleTouchMagnifier}
              aria-pressed={isTouchMagnifierEnabled}
              className={`absolute bottom-3 right-3 z-10 inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium sm:hidden ${
                isTouchMagnifierEnabled
                  ? "border-[var(--button-dark)] bg-[var(--button-dark)] text-[#faf7f2]"
                  : "border-[var(--border-soft)] bg-[rgba(250,247,242,0.94)] text-[color:var(--text-strong)]"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8.5" cy="8.5" r="4.75" />
                <path d="m12.2 12.2 4.1 4.1" />
                <path d="M8.5 6.3v4.4" />
                <path d="M6.3 8.5h4.4" />
              </svg>
              <span>
                {isTouchMagnifierEnabled
                  ? t(dict, "productDetail.zoomOff")
                  : t(dict, "productDetail.zoomOn")}
              </span>
            </button>
          ) : null}

          {enableHoverMagnifier && activeImageUrl && magnifierState.visible ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/80 shadow-[0_20px_44px_rgba(18,16,14,0.2)] ring-1 ring-black/8 ${
                magnifierState.mode === "touch" ? "block" : "hidden lg:block"
              }`}
              style={{
                left: `${magnifierState.x}px`,
                top: `${Math.max(magnifierSizePx / 2, magnifierState.y - magnifierVerticalOffsetPx)}px`,
                width: `${magnifierSizePx}px`,
                height: `${magnifierSizePx}px`,
                backgroundColor: "rgba(250,247,242,0.96)",
              }}
            >
              <div
                className={`absolute left-0 top-0 transition-opacity duration-150 ${
                  isMagnifierImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  width: `${magnifierState.frameWidth}px`,
                  height: `${magnifierState.frameHeight}px`,
                  left: `${magnifierSizePx / 2 - magnifierState.x * MAGNIFIER_ZOOM}px`,
                  top: `${magnifierSizePx / 2 - magnifierState.y * MAGNIFIER_ZOOM}px`,
                  transform: `scale(${MAGNIFIER_ZOOM})`,
                  transformOrigin: "top left",
                }}
              >
                <Image
                  src={activeImageUrl}
                  alt=""
                  fill
                  draggable={false}
                  sizes={`${magnifierImageRequestWidth}px`}
                  className="object-contain p-1 sm:p-1.5"
                  onLoad={() => {
                    if (!magnifierImageLoadKey) {
                      return;
                    }

                    setLoadedMagnifierImageKeys((current) => {
                      if (current.has(magnifierImageLoadKey)) {
                        return current;
                      }

                      const next = new Set(current);
                      next.add(magnifierImageLoadKey);
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          ) : null}

        </div>

        {styleGroups.length > 0 ? (
          <div className="flex w-full min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-full border border-[var(--border-soft)] bg-[var(--surface)] p-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-2 sm:p-1.5">
            {renderStyleSwatches("desktop")}
          </div>
        ) : null}
      </div>
    </>
  );
};
