"use client";

import Image from "next/image";
import { useState } from "react";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { CatalogueProduct, CatalogueVariant } from "@/src/lib/catalogueModels";
import { getCatalogueShapeKey } from "@/src/lib/catalogueModels";

type ProductDetailViewProps = {
  product: CatalogueProduct;
  dict: Dictionary;
};

type StyleGroup = {
  key: string;
  label: string;
  variants: CatalogueVariant[];
};

const buildStyleKey = (variant: CatalogueVariant) =>
  [variant.name, variant.backgroundName, variant.ornamentName].filter(Boolean).join("|");

const buildStyleLabel = (variant: CatalogueVariant) =>
  variant.backgroundName ?? variant.name ?? variant.ornamentName ?? variant.id;

const sortImagesForDisplay = (images: CatalogueVariant["images"]) =>
  [...images].sort((left, right) => {
    const weight = (imageType: string | null) => {
      if (imageType === "lifestyle") return 0;
      if (imageType === "main") return 1;
      return 2;
    };

    return weight(left.imageType) - weight(right.imageType);
  });

const pickVariantHeroImage = (variant: CatalogueVariant, product: CatalogueProduct) =>
  sortImagesForDisplay(variant.images)[0]?.url ??
  product.mainImage;

const pickVariantGallery = (variant: CatalogueVariant, product: CatalogueProduct) =>
  variant.images.length > 0
    ? sortImagesForDisplay(variant.images)
    : product.gallery.map((url, index) => ({
        id: `${product.id}-gallery-${index}`,
        url,
        imageType: index === 0 ? "main" : "gallery",
      }));

export const ProductDetailView = ({ product, dict }: ProductDetailViewProps) => {
  const styleGroups = product.variants.reduce<StyleGroup[]>((groups, variant) => {
    const key = buildStyleKey(variant);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.variants.push(variant);
      existing.variants.sort((left, right) => left.sortOrder - right.sortOrder);
      return groups;
    }

    groups.push({
      key,
      label: buildStyleLabel(variant),
      variants: [variant],
    });
    return groups;
  }, []);

  const defaultVariant = product.defaultVariant ?? product.variants[0] ?? null;
  const defaultStyleKey =
    defaultVariant ? buildStyleKey(defaultVariant) : styleGroups[0]?.key ?? "";
  const [selectedStyleKey, setSelectedStyleKey] = useState(defaultStyleKey);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeStyleGroup =
    styleGroups.find((group) => group.key === selectedStyleKey) ?? styleGroups[0] ?? null;

  const selectedVariant =
    activeStyleGroup?.variants.find((variant) => variant.id === selectedVariantId) ??
    activeStyleGroup?.variants.find((variant) => variant.isDefault) ??
    activeStyleGroup?.variants[0] ??
    defaultVariant;

  const availableSizes: string[] = activeStyleGroup
    ? [
        ...new Set(
          activeStyleGroup.variants
            .map((variant) => variant.sizeLabel)
            .filter((sizeLabel): sizeLabel is string => Boolean(sizeLabel)),
        ),
      ]
    : [];

  const galleryImages = selectedVariant ? pickVariantGallery(selectedVariant, product) : [];
  const fallbackHeroImage = selectedVariant ? pickVariantHeroImage(selectedVariant, product) : product.mainImage;
  const heroImage =
    selectedImageUrl && galleryImages.some((image) => image.url === selectedImageUrl)
      ? selectedImageUrl
      : fallbackHeroImage;

  const handleStyleSelect = (styleKey: string) => {
    const nextGroup = styleGroups.find((group) => group.key === styleKey);
    if (!nextGroup) return;

    const currentSize = selectedVariant?.sizeLabel ?? null;
    const nextVariant =
      nextGroup.variants.find((variant) => variant.sizeLabel === currentSize) ??
      nextGroup.variants.find((variant) => variant.isDefault) ??
      nextGroup.variants[0];

    setSelectedStyleKey(styleKey);
    setSelectedVariantId(nextVariant?.id ?? "");
    setSelectedImageUrl(null);
  };

  const handleSizeSelect = (sizeLabel: string) => {
    if (!activeStyleGroup) return;
    const nextVariant =
      activeStyleGroup.variants.find((variant) => variant.sizeLabel === sizeLabel) ??
      activeStyleGroup.variants[0];

    setSelectedVariantId(nextVariant?.id ?? "");
    setSelectedImageUrl(null);
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:gap-8 md:py-12">
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-[0.18em] text-black/45">
          {t(dict, "catalogue.common.cloth")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>
        <p className="text-sm text-black/55">
          {t(dict, `catalogue.shapes.${getCatalogueShapeKey(product.productType)}`)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-8">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (heroImage) {
                setIsPreviewOpen(true);
              }
            }}
            className="relative aspect-[4/4.8] w-full overflow-hidden rounded-[1.5rem] bg-black/[0.04] sm:aspect-[4/5]"
            aria-label={t(dict, "productDetail.openImage")}
          >
            {heroImage ? (
              <Image
                src={heroImage}
                alt={product.title}
                fill
                className="object-contain p-3 sm:p-4"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
            ) : null}
          </button>

          {galleryImages.length > 1 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {galleryImages.map((image) => {
                const isActive = image.url === heroImage;

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImageUrl(image.url)}
                    className={`relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-black/[0.04] ${
                      isActive ? "ring-2 ring-black/70" : "ring-1 ring-black/5"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 14vw"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] bg-white/75 px-4 py-4 sm:px-5 sm:py-5">
            <div className="space-y-3 text-sm text-black/70">
              <div className="flex items-baseline justify-between gap-4">
                <span>{t(dict, "productDetail.priceLabel")}</span>
                <span className="text-lg font-semibold text-black">
                  {(selectedVariant?.price ?? product.defaultPrice)} GEL
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span>{t(dict, "productDetail.typeLabel")}</span>
                <div className="text-right text-black">
                  <p>{t(dict, "catalogue.common.cloth")}</p>
                  <p className="text-sm text-black/55">
                    {t(dict, `catalogue.shapes.${getCatalogueShapeKey(product.productType)}`)}
                  </p>
                </div>
              </div>
              {product.materialDescription ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t(dict, "productDetail.materialLabel")}</span>
                  <span className="text-right text-black">{product.materialDescription}</span>
                </div>
              ) : null}
            </div>
          </div>

          {styleGroups.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                {t(dict, "productDetail.variantSelectorLabel")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {styleGroups.map((group) => {
                  const isActive = group.key === selectedStyleKey;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => handleStyleSelect(group.key)}
                      className={`rounded-full px-3 py-2 text-sm ${
                        isActive ? "bg-black text-white" : "bg-white/75 text-black/75"
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {availableSizes.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                {t(dict, "productDetail.sizeSelectorLabel")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((sizeLabel) => {
                  const isActive = selectedVariant?.sizeLabel === sizeLabel;

                  return (
                    <button
                      key={sizeLabel}
                      type="button"
                      onClick={() => handleSizeSelect(sizeLabel)}
                      className={`rounded-full px-3 py-2 text-sm ${
                        isActive ? "bg-black text-white" : "bg-white/75 text-black/75"
                      }`}
                    >
                      {sizeLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {product.description || product.careInfo ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {product.description ? (
                <div className="rounded-[1.25rem] bg-white/65 px-4 py-4">
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                    {t(dict, "productDetail.descriptionLabel")}
                  </h2>
                  <p className="text-sm leading-6 text-black/70">{product.description}</p>
                </div>
              ) : null}
              {product.careInfo ? (
                <div className="rounded-[1.25rem] bg-white/65 px-4 py-4">
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                    {t(dict, "productDetail.careLabel")}
                  </h2>
                  <p className="text-sm leading-6 text-black/70">{product.careInfo}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white"
          >
            {t(dict, "nav.close")}
          </button>
          <div className="relative z-10 h-full max-h-[90vh] w-full max-w-6xl">
            <Image
              src={heroImage}
              alt={product.title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};
