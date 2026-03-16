"use client";

import Image from "next/image";
import { useState } from "react";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type GalleryImage = {
  id: string;
  url: string;
};

type ProductGalleryProps = {
  title: string;
  heroImage: string | null;
  galleryImages: GalleryImage[];
  dict: Dictionary;
  onSelectImage: (url: string) => void;
};

export const ProductGallery = ({
  title,
  heroImage,
  galleryImages,
  dict,
  onSelectImage,
}: ProductGalleryProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            if (heroImage) {
              setIsPreviewOpen(true);
            }
          }}
          className="relative h-[22rem] w-full overflow-hidden rounded-[1.5rem] bg-black/[0.035] sm:h-[32rem] lg:h-[42rem] xl:h-[46rem]"
          aria-label={t(dict, "productDetail.openImage")}
        >
          {heroImage ? (
            <Image
              src={heroImage}
              alt={title}
              fill
              className="object-contain p-1 sm:p-1.5"
              sizes="(max-width: 1024px) 100vw, 62vw"
            />
          ) : null}

          {galleryImages.length > 1 ? (
            <div className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] gap-2 overflow-x-auto rounded-[1.1rem] bg-white/82 p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:bottom-4 sm:left-4 sm:gap-2.5">
              {galleryImages.map((image) => {
                const isActive = image.url === heroImage;

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectImage(image.url);
                    }}
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
        </button>

      </div>

      {isPreviewOpen && heroImage ? (
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
              src={heroImage}
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
