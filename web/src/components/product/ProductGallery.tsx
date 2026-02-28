"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductLightbox } from "@/src/components/product/ProductLightbox";

type ProductGalleryProps = {
  images: string[];
  productName: string;
  isPainting?: boolean;
  showAuctionBadge?: boolean;
  auctionBadgeLabel?: string;
  selectedIndex: number;
  viewFullLabel: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  prevProductHref?: string;
  nextProductHref?: string;
  prevProductImage?: string;
  nextProductImage?: string;
  prevProductName?: string;
  nextProductName?: string;
  prevProductIsPainting?: boolean;
  nextProductIsPainting?: boolean;
  signatureOverlaySrc?: string;
  showSignatureOverlay?: boolean;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export const ProductGallery = ({
  images,
  productName,
  isPainting = false,
  showAuctionBadge = false,
  auctionBadgeLabel,
  selectedIndex,
  viewFullLabel,
  closeLabel,
  prevLabel,
  nextLabel,
  prevProductHref,
  nextProductHref,
  prevProductImage,
  nextProductImage,
  prevProductName,
  nextProductName,
  prevProductIsPainting = false,
  nextProductIsPainting = false,
  signatureOverlaySrc,
  showSignatureOverlay,
  onSelect,
  onPrev,
  onNext,
}: ProductGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activeImage = images[selectedIndex] ?? images[0] ?? "";

  const isFailed = useMemo(
    () => (src: string) => (src ? failedImages.includes(src) : true),
    [failedImages],
  );

  const markFailed = (src: string) => {
    if (!src) return;
    setFailedImages((prev) => (prev.includes(src) ? prev : [...prev, src]));
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) onNext();
    if (delta < 0) onPrev();
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group mx-auto block w-full max-w-[880px] overflow-hidden rounded-3xl border border-black/10 bg-white text-left"
      >
        <div
          className="relative aspect-[4/3] w-full bg-[#f5efe7]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: "pan-y" }}
        >
          {!isFailed(activeImage) ? (
            <Image
              src={activeImage}
              alt={productName}
              fill
              sizes="(max-width: 1024px) 100vw, 64vw"
              className={isPainting ? "object-contain p-2 sm:p-3 lg:p-2" : "object-contain p-3 sm:p-4 lg:p-2"}
              onError={() => markFailed(activeImage)}
            />
          ) : null}
          {showSignatureOverlay && signatureOverlaySrc ? (
            <Image
              src={signatureOverlaySrc}
              alt={productName}
              fill
              sizes="(max-width: 1024px) 100vw, 64vw"
              className="pointer-events-none object-contain p-3 sm:p-4 lg:p-2"
            />
          ) : null}
          {showAuctionBadge && auctionBadgeLabel ? (
            <span className="absolute left-3 top-3 rounded-full border border-[#f4ece2]/35 bg-[#2d241b]/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f8f4ee] shadow-[0_4px_14px_rgba(0,0,0,0.38)]">
              {auctionBadgeLabel}
            </span>
          ) : null}
          <span className="absolute bottom-3 right-3 rounded-full border border-black/15 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
            {viewFullLabel}
          </span>
        </div>
      </button>

      {images.length > 1 || prevProductHref || nextProductHref ? (
        <div className="relative min-w-0 overflow-hidden">
          {prevProductHref ? (
            <Link
              href={prevProductHref}
              scroll
              className="absolute left-1 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/75 px-1.5 py-1 text-sm text-black/70 backdrop-blur transition hover:bg-white sm:left-2 lg:gap-2 lg:px-3 lg:py-2 lg:text-lg"
              aria-label={prevLabel}
              title={prevProductName}
            >
              ←
              {prevProductImage ? (
                <Image
                  src={prevProductImage}
                  alt={prevProductName ?? prevLabel}
                  width={36}
                  height={36}
                  className={`h-6 w-6 rounded-full border border-black/10 bg-[#f5efe7] lg:h-9 lg:w-9 ${prevProductIsPainting ? "object-contain p-0.5" : "object-cover"}`}
                />
              ) : null}
            </Link>
          ) : null}

          <div className="overflow-x-auto px-8 sm:px-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {images.length > 1 ? (
              <div className="mx-auto flex w-max items-center justify-center gap-1.5 py-1 snap-x snap-mandatory sm:gap-2">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => onSelect(index)}
                    className={`relative h-14 w-14 flex-shrink-0 snap-center overflow-hidden rounded-xl border transition sm:h-20 sm:w-20 ${
                      selectedIndex === index
                        ? "scale-[1.03] border-black/40 shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
                        : "border-black/10 hover:border-black/25"
                    } bg-[#f5efe7]`}
                    aria-label={`${productName} ${index + 1}`}
                  >
                    {!isFailed(image) ? (
                      <Image
                        src={image}
                        alt={`${productName} ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 56px, 80px"
                        className="object-contain p-1.5"
                        onError={() => markFailed(image)}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {nextProductHref ? (
            <Link
              href={nextProductHref}
              scroll
              className="absolute right-1 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/75 px-1.5 py-1 text-sm text-black/70 backdrop-blur transition hover:bg-white sm:right-2 lg:gap-2 lg:px-3 lg:py-2 lg:text-lg"
              aria-label={nextLabel}
              title={nextProductName}
            >
              {nextProductImage ? (
                <Image
                  src={nextProductImage}
                  alt={nextProductName ?? nextLabel}
                  width={36}
                  height={36}
                  className={`h-6 w-6 rounded-full border border-black/10 bg-[#f5efe7] lg:h-9 lg:w-9 ${nextProductIsPainting ? "object-contain p-0.5" : "object-cover"}`}
                />
              ) : null}
              →
            </Link>
          ) : null}
        </div>
      ) : null}

      <ProductLightbox
        images={images}
        productName={productName}
        selectedIndex={selectedIndex}
        isOpen={lightboxOpen}
        closeLabel={closeLabel}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        onClose={() => setLightboxOpen(false)}
        onPrev={onPrev}
        onNext={onNext}
      />
    </div>
  );
};
