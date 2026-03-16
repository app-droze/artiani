"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import { ProductBuyPanel } from "@/src/components/product/ProductBuyPanel";
import { ProductGallery } from "@/src/components/product/ProductGallery";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type { CatalogueProduct, CatalogueVariant } from "@/src/lib/catalogueModels";
import { getCatalogueProductLabel } from "@/src/lib/catalogueModels";

type ProductDetailViewProps = {
  product: CatalogueProduct;
  lang: Locale;
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

export const ProductDetailView = ({
  product,
  lang,
  dict,
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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [didAddToCart, setDidAddToCart] = useState(false);

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

  useEffect(() => {
    if (!didAddToCart) return;

    const timeoutId = window.setTimeout(() => setDidAddToCart(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [didAddToCart]);

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
    setDidAddToCart(false);
  };

  const handleSizeSelect = (sizeLabel: string) => {
    if (!activeStyleGroup) return;
    const nextVariant =
      activeStyleGroup.variants.find((variant) => variant.sizeLabel === sizeLabel) ??
      activeStyleGroup.variants[0];

    setSelectedVariantId(nextVariant?.id ?? "");
    setSelectedImageUrl(null);
    setDidAddToCart(false);
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
    setDidAddToCart(true);
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.22fr)_minmax(20rem,0.78fr)] lg:items-start lg:gap-8">
        <div className="order-2 lg:order-1">
          <ProductGallery
            title={product.title}
            heroImage={heroImage}
            galleryImages={galleryImages.map((image) => ({ id: image.id, url: image.url }))}
            dict={dict}
            onSelectImage={setSelectedImageUrl}
          />
        </div>

        <div className="order-1 lg:order-2">
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
            didAddToCart={didAddToCart}
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
    </section>
  );
};
