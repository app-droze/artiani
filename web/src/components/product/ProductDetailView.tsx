"use client";

import { track } from "@vercel/analytics";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import {
  buildCatalogueProductLabel,
  getVariantBackgroundLabel,
  isSoldPaintingVariant,
} from "@/src/lib/catalogueModels";
import { ANALYTICS_CURRENCY, trackAnalyticsEvent } from "@/src/lib/analytics";
import { getCartDisplayTitle } from "@/src/lib/cart";
import type { PhoneCaseModelOption } from "@/src/lib/phoneCaseModels";
import { formatPrintAreaSize, getVariantPrintArea } from "@/src/lib/printArea";
import { applyClothLargeMainImageOverride, resolveProductGalleryImages } from "@/src/lib/productImages";
import { buildProductImageAlt, buildRelatedProductImageAlt } from "@/src/lib/seo";

type ProductDetailViewProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
  relatedProducts: CatalogueProductRecommendationItem[];
  phoneCaseModels: PhoneCaseModelOption[];
};

type StyleGroup = {
  key: string;
  label: string;
  background: CatalogueBackground | null;
  variants: CatalogueVariant[];
};

const PILLOW_BOTH_SIDES_SURCHARGE = 10;

const buildStyleKey = (variant: CatalogueVariant, categorySlug: string) =>
  categorySlug === "table_runner"
    ? [variant.backgroundName, variant.ornamentName].filter(Boolean).join("|") || "table_runner"
    : [variant.name, variant.backgroundName, variant.ornamentName].filter(Boolean).join("|");

const buildStyleLabel = (variant: CatalogueVariant) => getVariantBackgroundLabel(variant);

const normalizeOptionKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getVariantMaterialKey = (variant: CatalogueVariant | null | undefined) => {
  if (!variant) {
    return null;
  }

  const preferred =
    variant.materialInfo?.code ??
    variant.materialInfo?.name ??
    variant.material ??
    null;

  if (!preferred) {
    return null;
  }

  const normalized = normalizeOptionKey(preferred);
  return normalized.length > 0 ? normalized : null;
};

const getVariantMaterialLabel = (variant: CatalogueVariant | null | undefined) =>
  variant?.materialInfo?.name ?? variant?.material ?? null;

const isWhiteLikeVariant = (variant: CatalogueVariant | null | undefined) => {
  const normalizedBackgroundCode = variant?.background?.code?.trim().toLowerCase() ?? null;
  if (normalizedBackgroundCode === "white") {
    return true;
  }

  const normalizedBackgroundName = variant?.backgroundName?.trim().toLowerCase() ?? null;
  return normalizedBackgroundName === "white" || normalizedBackgroundName === "ivory";
};

const isExactSize = (
  printArea: NonNullable<ReturnType<typeof getVariantPrintArea>> | null,
  widthCm: number,
  heightCm: number,
) =>
  Boolean(
    printArea &&
      printArea.full.widthCm === widthCm &&
      printArea.full.heightCm === heightCm,
  );

const resolveVariantGallery = (variant: CatalogueVariant | null | undefined, product: CatalogueProduct) =>
  applyClothLargeMainImageOverride(
    resolveProductGalleryImages({
      variantImages: variant?.images ?? [],
      productImages: product.gallery,
    }),
    {
      productSlug: product.slug,
      sizeLabel: variant?.sizeLabel,
      backgroundCode: variant?.background?.code ?? null,
      backgroundName: variant?.backgroundName ?? null,
    },
  );

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

  const nextGallery = resolveVariantGallery(nextVariant, product);
  if (nextGallery.length === 0) {
    return 0;
  }

  const currentGallery = currentVariant ? resolveVariantGallery(currentVariant, product) : [];
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

  return resolveVariantGallery(variant, product)[0]?.url ?? null;
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
  phoneCaseModels,
}: ProductDetailViewProps) => {
  const { addItem } = useCart();
  const isPaintingProduct = product.productType === "painting";
  const isRunnerProduct = product.category.slug === "table_runner";
  const isPillowProduct = product.category.slug === "pillow";
  const isScarfProduct = product.category.slug === "headscarf";
  const isBagProduct = product.category.slug === "bag" || product.productType === "handbag";
  const isPhoneCaseProduct = product.category.slug === "phone_case" || product.productType === "phone_case";
  const illustrationNoteKey = isPhoneCaseProduct || isBagProduct
    ? "productDetail.illustrationNoteShort"
    : "productDetail.illustrationNote";
  const illustrationNote = !isPaintingProduct ? t(dict, illustrationNoteKey) : null;
  const subtitle = dict[`catalogue.types.${product.productType}`] ?? buildCatalogueProductLabel(product, lang);
  const cartProductTypeLabel = buildCatalogueProductLabel(product, lang);
  const styleGroups = product.variants.reduce<StyleGroup[]>((groups, variant) => {
    const key = buildStyleKey(variant, product.category.slug);
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
    defaultVariant ? buildStyleKey(defaultVariant, product.category.slug) : styleGroups[0]?.key ?? "";
  const [selectedStyleKey, setSelectedStyleKey] = useState(defaultStyleKey);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedPhoneModelCode, setSelectedPhoneModelCode] = useState<string | null>(null);
  const [selectedPrintSide, setSelectedPrintSide] = useState<"one_sided" | "both_sided" | null>(
    isPillowProduct ? "one_sided" : null,
  );
  const hasTrackedProductViewRef = useRef(false);

  const activeStyleGroup =
    styleGroups.find((group) => group.key === selectedStyleKey) ?? styleGroups[0] ?? null;

  const selectedVariant =
    activeStyleGroup?.variants.find((variant) => variant.id === selectedVariantId) ??
    activeStyleGroup?.variants[0] ??
    defaultVariant;

  const availableSizes: string[] = isPaintingProduct
    ? []
    : activeStyleGroup
    ? [
        ...new Set(
          activeStyleGroup.variants
            .map((variant) => variant.sizeLabel)
            .filter((sizeLabel): sizeLabel is string => Boolean(sizeLabel)),
        ),
      ]
    : [];

  const materialOptions = !isPaintingProduct && isRunnerProduct && activeStyleGroup
    ? Array.from(
        activeStyleGroup.variants.reduce<
          Map<string, { key: string; label: string; sortOrder: number }>
        >((options, variant) => {
          const key = getVariantMaterialKey(variant);
          const label = key
            ? key === "canvas"
              ? t(dict, "productDetail.materialOption.canvas")
              : key === "velvet"
                ? t(dict, "productDetail.materialOption.velvet")
                : getVariantMaterialLabel(variant)
            : null;

          if (!key || !label || options.has(key)) {
            return options;
          }

          options.set(key, {
            key,
            label,
            sortOrder: variant.materialInfo?.sortOrder ?? Number.MAX_SAFE_INTEGER,
          });

          return options;
        }, new Map()),
      )
        .map(([, option]) => option)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ key, label }) => ({ key, label }))
    : [];

  const selectedMaterialKey = getVariantMaterialKey(selectedVariant);
  const selectedMaterialLabel = selectedVariant?.materialInfo?.name ?? selectedVariant?.material ?? null;
  const selectedPhoneModelLabel =
    phoneCaseModels.find((model) => model.code === selectedPhoneModelCode)?.label ?? null;
  const selectedPaintingMaterialLabel = selectedVariant?.materialInfo?.name ?? null;
  const printSideOptions = isPillowProduct
    ? [
        {
          key: "one_sided" as const,
          label: t(dict, "productDetail.printSide.oneSided"),
        },
        {
          key: "both_sided" as const,
          label: t(dict, "productDetail.printSide.bothSided"),
        },
      ]
    : [];
  const selectedPrintSideLabel =
    selectedPrintSide === "both_sided"
      ? t(dict, "productDetail.printSide.bothSided")
      : selectedPrintSide === "one_sided"
        ? t(dict, "productDetail.printSide.oneSided")
        : null;
  const pillowPrintSideSurcharge = isPillowProduct && selectedPrintSide === "both_sided"
    ? PILLOW_BOTH_SIDES_SURCHARGE
    : 0;
  const displayedPrice = (selectedVariant?.price ?? product.defaultPrice) + pillowPrintSideSurcharge;
  const isSoldPainting = isSoldPaintingVariant({
    productType: product.productType,
    stockStatus: selectedVariant?.stockStatus,
  });
  const paintingStatusBadge =
    isPaintingProduct && isSoldPainting
      ? {
          label: t(dict, "catalogue.card.sold"),
          tone: "sold" as const,
        }
      : null;
  const galleryStyleGroups = isPaintingProduct
    ? []
    : styleGroups.map((group) => ({
        key: group.key,
        label: group.label,
        background: group.background,
      }));

  const galleryImages = resolveVariantGallery(selectedVariant, product);
  const selectedVariantLabel = activeStyleGroup?.label ?? selectedVariant?.name ?? null;
  const fallbackHeroImage = galleryImages[0]?.url ?? product.mainImage;
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
  const shouldShowPrintAreaNote =
    Boolean(printArea?.hasReducedPrintArea) &&
    !(
      product.category.slug === "tablecloth" &&
      (
        (product.subtypeCode === "round" && isWhiteLikeVariant(selectedVariant)) ||
        (product.subtypeCode === "rectangular" &&
          (isExactSize(printArea, 110, 110) ||
            (isWhiteLikeVariant(selectedVariant) && isExactSize(printArea, 130, 130))))
      )
    );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [product.slug]);

  useEffect(() => {
    hasTrackedProductViewRef.current = false;
  }, [product.slug]);

  useEffect(() => {
    if (hasTrackedProductViewRef.current || !selectedVariant) {
      return;
    }

    trackAnalyticsEvent("product_view", {
      product_id: product.id,
      variant_id: selectedVariant.id,
      price: displayedPrice,
      currency: ANALYTICS_CURRENCY,
      lang,
      qty: 1,
    });
    track("View Product", {
      slug: product.slug,
      category: product.category.slug,
    });
    hasTrackedProductViewRef.current = true;
  }, [displayedPrice, lang, product.category.slug, product.id, product.slug, selectedVariant]);

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
    const currentMaterialKey = isRunnerProduct ? getVariantMaterialKey(selectedVariant) : null;
    const nextVariant =
      nextGroup.variants.find(
        (variant) =>
          variant.sizeLabel === currentSize &&
          (!currentMaterialKey || getVariantMaterialKey(variant) === currentMaterialKey),
      ) ??
      nextGroup.variants.find((variant) => variant.sizeLabel === currentSize) ??
      nextGroup.variants.find(
        (variant) => currentMaterialKey != null && getVariantMaterialKey(variant) === currentMaterialKey,
      ) ??
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
    const currentMaterialKey = isRunnerProduct ? getVariantMaterialKey(selectedVariant) : null;
    const nextVariant =
      activeStyleGroup.variants.find(
        (variant) =>
          variant.sizeLabel === sizeLabel &&
          (!currentMaterialKey || getVariantMaterialKey(variant) === currentMaterialKey),
      ) ??
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

  const handleMaterialSelect = (materialKey: string) => {
    if (!activeStyleGroup) return;

    const currentSize = selectedVariant?.sizeLabel ?? null;
    const nextVariant =
      activeStyleGroup.variants.find(
        (variant) =>
          getVariantMaterialKey(variant) === materialKey && variant.sizeLabel === currentSize,
      ) ??
      activeStyleGroup.variants.find((variant) => getVariantMaterialKey(variant) === materialKey) ??
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
    if (!selectedVariant || isSoldPainting || (isPhoneCaseProduct && !selectedPhoneModelCode)) return false;

    const didAdd = addItem({
      productId: product.id,
      productType: product.productType,
      slug: product.slug,
      title: product.title,
      productTypeLabel: cartProductTypeLabel,
      variantId: selectedVariant.id,
      selectedColorLabel: activeStyleGroup?.label ?? selectedVariant.name,
      selectedBackgroundLabel: selectedVariant.background?.name ?? selectedVariant.backgroundName,
      selectedMaterialLabel,
      selectedPhoneModelCode,
      selectedPhoneModelLabel,
      selectedSize: selectedVariant.sizeLabel,
      selectedPrintSide,
      selectedPrintSideLabel,
      selectedImage: heroImage,
      selectedPrice: displayedPrice,
      qty: 1,
    });

    if (didAdd) {
      trackAnalyticsEvent("add_to_cart", {
        product_id: product.id,
        variant_id: selectedVariant.id,
        price: displayedPrice,
        currency: ANALYTICS_CURRENCY,
        lang,
        qty: 1,
      });
      track("Add to Cart", {
        slug: product.slug,
        category: product.category.slug,
      });
    }

    return didAdd;
  };

  const renderRelatedProductCard = (relatedProduct: CatalogueProductRecommendationItem) => {
    const relatedSubtitle = buildCatalogueProductLabel(relatedProduct, lang);
    const relatedDisplayTitle = getCartDisplayTitle({
      title: relatedProduct.title,
      slug: relatedProduct.slug,
      lang,
    });
    const imageUrl = relatedProduct.cardImage ?? relatedProduct.mainImage;
    const isRelatedBagProduct =
      relatedProduct.category.slug === "bag" || relatedProduct.productType === "handbag";

    return (
      <Link
        href={`/${lang}/product/${relatedProduct.slug}`}
        className="group flex h-full flex-col rounded-[1.15rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,243,235,0.92))] p-2 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#d8ccb9] hover:shadow-[0_18px_30px_rgba(18,16,14,0.08)] sm:rounded-[1.2rem] sm:p-2.5"
      >
        <div
          className={`relative aspect-[4/4.7] overflow-hidden rounded-[0.95rem] border border-black/[0.04] ${
            isRelatedBagProduct ? "bg-white" : "bg-[var(--surface-muted)]"
          }`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={buildRelatedProductImageAlt(
                {
                  ...relatedProduct,
                  title: relatedDisplayTitle,
                },
                dict,
              )}
              fill
              className={`transition-transform duration-500 group-hover:scale-[1.03] ${
                isRelatedBagProduct ? "object-contain p-3" : "object-cover"
              }`}
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 px-1 pb-1 pt-2">
          <p className="ui-overline text-[10px] text-[color:var(--text-body)]">
            {relatedSubtitle}
          </p>
          <p className="line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[color:var(--text-strong)] sm:text-[0.98rem]">
            {relatedDisplayTitle}
          </p>
          <div className="mt-auto border-t border-black/[0.05] pt-2">
            <p className="text-[15px] font-semibold tracking-tight text-[color:var(--text-strong)]">
              {relatedProduct.defaultPrice} ₾
            </p>
          </div>
        </div>
      </Link>
    );
  };

  const detailContent = product.description && !isPaintingProduct ? (
    <div className="ui-card-md mt-4 border border-[var(--border-soft)] bg-white/88 px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-2.5">
        <h2 className="ui-overline">
          {t(dict, "productDetail.descriptionLabel")}
        </h2>
        <p className="max-w-none whitespace-pre-line text-sm leading-7 text-[color:var(--text-body)]">
          {product.description}
        </p>
      </div>
    </div>
  ) : null;
  return (
    <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-6 md:py-8 lg:pb-8">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
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
            enableHoverMagnifier={isPaintingProduct}
            imageInfoText={illustrationNote}
            imageInfoButtonLabel={t(dict, "productDetail.openImageInfo")}
            imageInfoDialogTitle={t(dict, "productDetail.imageInfoTitle")}
            imageInfoCloseLabel={t(dict, "productDetail.closeImageInfo")}
            statusBadge={paintingStatusBadge}
            backLink={{
              href: `/${lang}/catalogue`,
              label: t(dict, "nav.catalogue"),
            }}
            styleGroups={galleryStyleGroups}
            selectedStyleKey={selectedStyleKey}
            dict={dict}
            onStyleSelect={handleStyleSelect}
            onSelectImage={setSelectedImageIndex}
          />

          {detailContent ? <div className="hidden lg:block">{detailContent}</div> : null}
        </div>

        <div className="min-w-0">
          <ProductBuyPanel
            title={product.title}
            subtitle={subtitle}
            materialLabel={selectedMaterialLabel}
            materialDescription={product.materialDescription}
            isPaintingProduct={isPaintingProduct}
            isPhoneCaseProduct={isPhoneCaseProduct}
            isBagProduct={isBagProduct}
            isSoldPainting={isSoldPainting}
            isScarfProduct={isScarfProduct}
            paintingFactSizeLabel={selectedVariant?.sizeLabel ?? null}
            paintingFactMaterialLabel={selectedPaintingMaterialLabel}
            price={displayedPrice}
            themes={product.themes}
            styleGroups={
              isPaintingProduct
                ? []
                : styleGroups.map((group) => ({ key: group.key, label: group.label }))
            }
            selectedStyleKey={selectedStyleKey}
            availableSizes={availableSizes}
            selectedSizeLabel={selectedVariant?.sizeLabel}
            materialOptions={materialOptions}
            selectedMaterialKey={selectedMaterialKey}
            phoneModelOptions={phoneCaseModels}
            selectedPhoneModelCode={selectedPhoneModelCode}
            printSideOptions={printSideOptions}
            selectedPrintSide={selectedPrintSide}
            printAreaNote={
              shouldShowPrintAreaNote && printArea
                ? {
                    printSizeLabel: formatPrintAreaNoteLabel(printArea, product, dict),
                  }
                : null
            }
            onStyleSelect={handleStyleSelect}
            onSizeSelect={handleSizeSelect}
            onMaterialSelect={handleMaterialSelect}
            onPhoneModelSelect={setSelectedPhoneModelCode}
            onPrintSideSelect={setSelectedPrintSide}
            onAddToCart={handleAddToCart}
            canAddToCart={
              Boolean(selectedVariant) &&
              !isSoldPainting &&
              (!isPhoneCaseProduct || Boolean(selectedPhoneModelCode))
            }
            lang={lang}
            dict={dict}
          />
        </div>
      </div>

      {detailContent ? <div className="lg:hidden">{detailContent}</div> : null}

      {relatedProducts.length > 0 ? (
        <div className="mt-10 border-t border-[var(--border-soft)] pt-7 sm:mt-12 sm:pt-8">
          <div className="mb-4 space-y-1.5 sm:mb-5">
            <p className="ui-overline text-[color:var(--text-body)]">
              {t(dict, "productDetail.relatedProductsEyebrow")}
            </p>
            <div className="max-w-[30rem]">
              <p className="text-sm leading-6 text-[color:var(--text-body)]">
                {t(dict, "productDetail.relatedProductsBody")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
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
