"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ProductLightbox } from "@/src/components/product/ProductLightbox";

type ProductGalleryProps = {
  images: string[];
  productName: string;
  selectedIndex: number;
  viewFullLabel: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  signatureOverlaySrc?: string;
  showSignatureOverlay?: boolean;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export const ProductGallery = ({
  images,
  productName,
  selectedIndex,
  viewFullLabel,
  closeLabel,
  prevLabel,
  nextLabel,
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
        className="group block w-full overflow-hidden rounded-3xl border border-black/10 bg-white text-left"
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
              className="object-contain p-3 sm:p-4 lg:p-2"
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
          <span className="absolute bottom-3 right-3 rounded-full border border-black/15 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
            {viewFullLabel}
          </span>
        </div>
      </button>

      {images.length > 1 ? (
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition ${
                selectedIndex === index
                  ? "border-black/40 shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
                  : "border-black/10 hover:border-black/25"
              } bg-[#f5efe7]`}
              aria-label={`${productName} ${index + 1}`}
            >
              {!isFailed(image) ? (
                <Image
                  src={image}
                  alt={`${productName} ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 16vw, 9vw"
                  className="object-contain p-1.5"
                  onError={() => markFailed(image)}
                />
              ) : null}
            </button>
          ))}
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
