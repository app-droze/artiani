"use client";

import { useEffect } from "react";
import Image from "next/image";

type ProductLightboxProps = {
  images: string[];
  productName: string;
  selectedIndex: number;
  isOpen: boolean;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export const ProductLightbox = ({
  images,
  productName,
  selectedIndex,
  isOpen,
  closeLabel,
  prevLabel,
  nextLabel,
  onClose,
  onPrev,
  onNext,
}: ProductLightboxProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const activeImage = images[selectedIndex] ?? images[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={productName}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 hover:border-white"
      >
        {closeLabel}
      </button>

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white hover:border-white"
        aria-label={prevLabel}
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white hover:border-white"
        aria-label={nextLabel}
      >
        →
      </button>

      <div className="relative mx-auto h-full w-full max-w-6xl">
        <Image
          src={activeImage}
          alt={productName}
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
};
