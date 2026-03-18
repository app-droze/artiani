"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import { ProductBuyPanel } from "@/src/components/product/ProductBuyPanel";
import { ProductGallery } from "@/src/components/product/ProductGallery";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
  CatalogueProductNavigationItem,
  CatalogueVariant,
} from "@/src/lib/catalogueModels";
import { getCatalogueProductLabel } from "@/src/lib/catalogueModels";
import { pickPrimaryProductImage } from "@/src/lib/productImages";

type ProductDetailViewProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
  previousProduct: CatalogueProductNavigationItem | null;
  nextProduct: CatalogueProductNavigationItem | null;
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

const pickVariantHeroImage = (variant: CatalogueVariant, product: CatalogueProduct) =>
  pickPrimaryProductImage(variant.images)?.url ??
  product.mainImage;

const pickVariantGallery = (variant: CatalogueVariant, product: CatalogueProduct) =>
  variant.images.length > 0
    ? variant.images
    : product.gallery.map((url, index) => ({
        id: `${product.id}-gallery-${index}`,
        url,
        imageType: index === 0 ? "main" : null,
        sortOrder: index,
      }));

export const ProductDetailView = ({
  product,
  lang,
  dict,
  previousProduct,
  nextProduct,
}: ProductDetailViewProps) => {
  const { addItem } = useCart();
  const productLabel = getCatalogueProductLabel(product.productType);
  const subtitle = productLabel.secondaryKey
    ? `${t(dict, productLabel.secondaryKey)} ${t(dict, productLabel.primaryKey).toLowerCase()}`
    : t(dict, productLabel.primaryKey);
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
  const clampedImageIndex =
    galleryImages.length > 0
      ? Math.min(selectedImageIndex, galleryImages.length - 1)
      : 0;
  const heroImage = galleryImages[clampedImageIndex]?.url ?? fallbackHeroImage;

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
    setSelectedImageIndex((currentIndex) => {
      const nextGalleryLength = nextVariant ? pickVariantGallery(nextVariant, product).length : 0;
      if (nextGalleryLength === 0) return 0;
      return Math.min(currentIndex, nextGalleryLength - 1);
    });
  };

  const handleSizeSelect = (sizeLabel: string) => {
    if (!activeStyleGroup) return;
    const nextVariant =
      activeStyleGroup.variants.find((variant) => variant.sizeLabel === sizeLabel) ??
      activeStyleGroup.variants[0];

    setSelectedVariantId(nextVariant?.id ?? "");
    setSelectedImageIndex((currentIndex) => {
      const nextGalleryLength = nextVariant ? pickVariantGallery(nextVariant, product).length : 0;
      if (nextGalleryLength === 0) return 0;
      return Math.min(currentIndex, nextGalleryLength - 1);
    });
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      productTypeLabel: subtitle,
      variantId: selectedVariant.id,
      selectedColorLabel: activeStyleGroup?.label ?? selectedVariant.name,
      selectedBackgroundLabel: selectedVariant.backgroundName,
      selectedSize: selectedVariant.sizeLabel,
      selectedImage: heroImage,
      selectedPrice: selectedVariant.price ?? product.defaultPrice,
      qty: 1,
    });
  };

  const renderProductNavigationCard = (
    direction: "previous" | "next",
    navigationProduct: CatalogueProductNavigationItem,
  ) => {
    const navigationLabel = getCatalogueProductLabel(navigationProduct.productType);
    const navigationSubtitle = navigationLabel.secondaryKey
      ? `${t(dict, navigationLabel.secondaryKey)} ${t(dict, navigationLabel.primaryKey).toLowerCase()}`
      : t(dict, navigationLabel.primaryKey);
    const imageUrl = navigationProduct.cardImage ?? navigationProduct.mainImage;

    return (
      <Link
        href={`/${lang}/product/${navigationProduct.slug}`}
        className={`group grid gap-3 rounded-[1rem] border border-black/8 bg-white/60 p-2.5 transition-colors hover:bg-white ${
          direction === "next"
            ? "grid-cols-[minmax(0,1fr)_4.25rem] sm:grid-cols-[minmax(0,1fr)_5.5rem]"
            : "grid-cols-[4.25rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)]"
        }`}
      >
        <div
          className={`relative aspect-[4/5] overflow-hidden rounded-[0.95rem] bg-black/[0.04] ${
            direction === "next" ? "order-2" : ""
          }`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={navigationProduct.title}
              fill
              className="object-cover"
              sizes="88px"
            />
          ) : null}
        </div>
        <div
          className={`flex min-w-0 flex-col justify-center gap-1 ${
            direction === "next" ? "order-1 text-right" : ""
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            {direction === "previous" ? "← " : ""}{t(dict, `productDetail.${direction}Product`)}
            {direction === "next" ? " →" : ""}
          </p>
          <p className="truncate text-sm font-semibold tracking-tight text-black sm:text-base">
            {navigationProduct.title}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-black/45">
            {navigationSubtitle}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.22fr)_minmax(20rem,0.78fr)] lg:items-start lg:gap-8">
        <div>
          <ProductGallery
            title={product.title}
            galleryImages={galleryImages.map((image) => ({ id: image.id, url: image.url }))}
            activeImageIndex={clampedImageIndex}
            styleGroups={styleGroups.map((group) => ({ key: group.key, label: group.label }))}
            selectedStyleKey={selectedStyleKey}
            dict={dict}
            onStyleSelect={handleStyleSelect}
            onSelectImage={setSelectedImageIndex}
          />
        </div>

        <div>
          <ProductBuyPanel
            title={product.title}
            subtitle={subtitle}
            materialDescription={product.materialDescription}
            price={selectedVariant?.price ?? product.defaultPrice}
            styleGroups={styleGroups.map((group) => ({ key: group.key, label: group.label }))}
            selectedStyleKey={selectedStyleKey}
            availableSizes={availableSizes}
            selectedSizeLabel={selectedVariant?.sizeLabel}
            onStyleSelect={handleStyleSelect}
            onSizeSelect={handleSizeSelect}
            onAddToCart={handleAddToCart}
            canAddToCart={Boolean(selectedVariant)}
            lang={lang}
            dict={dict}
          />
        </div>
      </div>

      {(product.description || product.careInfo) ? (
        <div className="mt-8 grid gap-6 border-t border-black/8 pt-6 lg:grid-cols-2">
          {product.description ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                {t(dict, "productDetail.descriptionLabel")}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-black/70">{product.description}</p>
            </div>
          ) : null}
          {product.careInfo ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                {t(dict, "productDetail.careLabel")}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-black/70">{product.careInfo}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {previousProduct || nextProduct ? (
        <div
          className={`mt-8 grid gap-3 border-t border-black/8 pt-6 sm:gap-4 ${
            previousProduct && nextProduct ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {previousProduct ? renderProductNavigationCard("previous", previousProduct) : <div className="hidden sm:block" />}
          {nextProduct ? renderProductNavigationCard("next", nextProduct) : null}
        </div>
      ) : null}
    </section>
  );
};
