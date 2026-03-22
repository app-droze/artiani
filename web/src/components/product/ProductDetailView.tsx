"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import { ProductBuyPanel } from "@/src/components/product/ProductBuyPanel";
import { ProductGallery } from "@/src/components/product/ProductGallery";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueBackground,
  CatalogueProduct,
  CatalogueProductRecommendationItem,
  CatalogueVariant,
} from "@/src/lib/catalogueModels";
import { buildCatalogueProductLabel, getVariantBackgroundLabel } from "@/src/lib/catalogueModels";
import { formatPrintAreaSize, getVariantPrintArea } from "@/src/lib/printArea";
import { pickPrimaryProductImage } from "@/src/lib/productImages";
import { buildProductImageAlt, buildRelatedProductImageAlt } from "@/src/lib/seo";

type ProductDetailViewProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
  relatedProducts: CatalogueProductRecommendationItem[];
};

type StyleGroup = {
  key: string;
  label: string;
  background: CatalogueBackground | null;
  variants: CatalogueVariant[];
};

const buildStyleKey = (variant: CatalogueVariant) =>
  [variant.name, variant.backgroundName, variant.ornamentName].filter(Boolean).join("|");

const buildStyleLabel = (variant: CatalogueVariant) => getVariantBackgroundLabel(variant);

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

const findPreferredVariantImageIndex = (
  variant: CatalogueVariant | null | undefined,
  product: CatalogueProduct,
) => {
  if (!variant) return 0;

  const gallery = pickVariantGallery(variant, product);
  const detailImageIndex = gallery.findIndex((image) => image.imageType === "detail");
  if (detailImageIndex >= 0) {
    return detailImageIndex;
  }

  const mainImageIndex = gallery.findIndex((image) => image.imageType === "main");
  if (mainImageIndex >= 0) {
    return mainImageIndex;
  }

  return 0;
};

const resolveVariantImageIndexOnChange = ({
  currentVariant,
  nextVariant,
  currentImageIndex,
  product,
}: {
  currentVariant: CatalogueVariant | null | undefined;
  nextVariant: CatalogueVariant | null | undefined;
  currentImageIndex: number;
  product: CatalogueProduct;
}) => {
  if (!nextVariant) {
    return 0;
  }

  const nextGallery = pickVariantGallery(nextVariant, product);
  if (nextGallery.length === 0) {
    return 0;
  }

  const currentGallery = currentVariant ? pickVariantGallery(currentVariant, product) : [];
  const currentImage = currentGallery[currentImageIndex] ?? null;

  if (currentImage?.imageType) {
    const matchingImageIndex = nextGallery.findIndex(
      (image) => image.imageType === currentImage.imageType,
    );

    if (matchingImageIndex >= 0) {
      return matchingImageIndex;
    }
  }

  return Math.min(currentImageIndex, nextGallery.length - 1);
};

const pickPreferredVariantImageUrl = (
  variant: CatalogueVariant | null | undefined,
  product: CatalogueProduct,
) => {
  if (!variant) return null;

  const gallery = pickVariantGallery(variant, product);
  return gallery[findPreferredVariantImageIndex(variant, product)]?.url ?? null;
};

const formatPrintAreaNoteLabel = (
  printArea: NonNullable<ReturnType<typeof getVariantPrintArea>>,
  product: CatalogueProduct,
  dict: Dictionary,
) => {
  if (product.category.slug === "tablecloth" && product.subtypeCode === "rectangular") {
    return `${t(dict, "productDetail.printWidthLabel")}: ${printArea.print.widthCm} cm`;
  }

  return formatPrintAreaSize(printArea.print);
};

export const ProductDetailView = ({
  product,
  lang,
  dict,
  relatedProducts,
}: ProductDetailViewProps) => {
  const { addItem } = useCart();
  const subtitle = buildCatalogueProductLabel(product, lang);
  const styleGroups = product.variants.reduce<StyleGroup[]>((groups, variant) => {
    const key = buildStyleKey(variant);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      if (!existing.background && variant.background) {
        existing.background = variant.background;
      }
      existing.variants.push(variant);
      existing.variants.sort((left, right) => left.sortOrder - right.sortOrder);
      return groups;
    }

    groups.push({
      key,
      label: buildStyleLabel(variant),
      background: variant.background,
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
  const selectedVariantLabel = activeStyleGroup?.label ?? selectedVariant?.name ?? null;
  const selectedMaterialLabel = selectedVariant?.materialInfo?.name ?? selectedVariant?.material ?? null;
  const fallbackHeroImage = selectedVariant ? pickVariantHeroImage(selectedVariant, product) : product.mainImage;
  const printArea = getVariantPrintArea(selectedVariant, {
    productType: product.productType,
    categorySlug: product.category.slug,
    subtypeCode: product.subtypeCode,
  });
  const clampedImageIndex =
    galleryImages.length > 0
      ? Math.min(selectedImageIndex, galleryImages.length - 1)
      : 0;
  const heroImage = galleryImages[clampedImageIndex]?.url ?? fallbackHeroImage;

  useEffect(() => {
    const preloadUrls = Array.from(
      new Set(
        product.variants
          .map((variant) => pickPreferredVariantImageUrl(variant, product))
          .filter((url): url is string => Boolean(url)),
      ),
    );

    const preloadedImages = preloadUrls.map((url) => {
      const image = new window.Image();
      image.src = url;
      return image;
    });

    return () => {
      for (const image of preloadedImages) {
        image.src = "";
      }
    };
  }, [product]);

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
    setSelectedImageIndex(
      resolveVariantImageIndexOnChange({
        currentVariant: selectedVariant,
        nextVariant,
        currentImageIndex: clampedImageIndex,
        product,
      }),
    );
  };

  const handleSizeSelect = (sizeLabel: string) => {
    if (!activeStyleGroup) return;
    const nextVariant =
      activeStyleGroup.variants.find((variant) => variant.sizeLabel === sizeLabel) ??
      activeStyleGroup.variants[0];

    setSelectedVariantId(nextVariant?.id ?? "");
    setSelectedImageIndex(
      resolveVariantImageIndexOnChange({
        currentVariant: selectedVariant,
        nextVariant,
        currentImageIndex: clampedImageIndex,
        product,
      }),
    );
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
      selectedBackgroundLabel: selectedVariant.background?.name ?? selectedVariant.backgroundName,
      selectedSize: selectedVariant.sizeLabel,
      selectedImage: heroImage,
      selectedPrice: selectedVariant.price ?? product.defaultPrice,
      qty: 1,
    });
  };

  const renderRelatedProductCard = (relatedProduct: CatalogueProductRecommendationItem) => {
    const relatedSubtitle = buildCatalogueProductLabel(relatedProduct, lang);
    const imageUrl = relatedProduct.cardImage ?? relatedProduct.mainImage;

    return (
      <Link
        href={`/${lang}/product/${relatedProduct.slug}`}
        className="group flex h-full flex-col gap-3 rounded-[1.1rem] border border-black/8 bg-white/65 p-2.5 transition-colors hover:bg-white"
      >
        <div className="relative aspect-[4/4.8] overflow-hidden rounded-[0.95rem] bg-black/[0.04]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={buildRelatedProductImageAlt(relatedProduct, dict)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 18vw"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5 pb-0.5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-black/42">
            {relatedSubtitle}
          </p>
          <p className="line-clamp-2 text-sm font-semibold tracking-tight text-black sm:text-[0.98rem]">
            {relatedProduct.title}
          </p>
          <p className="mt-auto text-sm font-medium text-black/82">
            {relatedProduct.defaultPrice} ₾
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
            galleryImages={galleryImages.map((image, index) => ({
              id: image.id,
              url: image.url,
              imageType: image.imageType,
              alt: buildProductImageAlt({
                title: product.title,
                productType: product.productType,
                dict,
                variantLabel: selectedVariantLabel,
                sizeLabel: selectedVariant?.sizeLabel ?? null,
                imageIndex: index + 1,
                totalImages: galleryImages.length,
              }),
            }))}
            activeImageIndex={clampedImageIndex}
            styleGroups={styleGroups.map((group) => ({
              key: group.key,
              label: group.label,
              background: group.background,
            }))}
            selectedStyleKey={selectedStyleKey}
            dict={dict}
            onStyleSelect={handleStyleSelect}
            onSelectImage={setSelectedImageIndex}
          />

          <div className="mt-3 rounded-[1.1rem] border border-black/8 bg-white/72 px-4 py-3 text-sm leading-6 text-black/60 shadow-[0_10px_24px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-[0.45rem] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-black/24"
              />
              <p>{t(dict, "productDetail.illustrationNote")}</p>
            </div>
          </div>
        </div>

        <div>
          <ProductBuyPanel
            title={product.title}
            subtitle={subtitle}
            materialLabel={selectedMaterialLabel}
            materialDescription={product.materialDescription}
            price={selectedVariant?.price ?? product.defaultPrice}
            styleGroups={styleGroups.map((group) => ({ key: group.key, label: group.label }))}
            selectedStyleKey={selectedStyleKey}
            availableSizes={availableSizes}
            selectedSizeLabel={selectedVariant?.sizeLabel}
            printAreaNote={
              printArea?.hasReducedPrintArea
                ? {
                    printSizeLabel: formatPrintAreaNoteLabel(printArea, product, dict),
                  }
                : null
            }
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

      {relatedProducts.length > 0 ? (
        <div className="mt-8 border-t border-black/8 pt-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.slug}>
                {renderRelatedProductCard(relatedProduct)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
