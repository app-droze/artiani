"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import {
  buildCatalogueProductLabel,
  type CatalogueProduct,
  type CatalogueVariant,
} from "@/src/lib/catalogueModels";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { buildProductImageAlt } from "@/src/lib/seo";

type ProductCardProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
};

const pickDefaultVariant = (product: CatalogueProduct) =>
  product.defaultVariant ?? product.variants[0] ?? null;

const getVariantLabel = (variant: CatalogueVariant | null) =>
  variant?.backgroundName ?? variant?.name ?? variant?.ornamentName ?? null;

export const ProductCard = ({ product, lang, dict }: ProductCardProps) => {
  const { addItem } = useCart();
  const { isAdded, showAddedFeedback } = useAddToCartFeedback();
  const imageUrl = product.cardImage ?? product.mainImage;
  const variant = pickDefaultVariant(product);
  const productTypeLabel = buildCatalogueProductLabel(product, lang);

  const handleAddToCart = () => {
    if (!variant) return;

    addItem({
      productId: product.id,
      productType: product.productType,
      slug: product.slug,
      title: product.title,
      productTypeLabel,
      variantId: variant.id,
      selectedColorLabel: getVariantLabel(variant),
      selectedBackgroundLabel: variant.backgroundName,
      selectedMaterialLabel: variant.materialInfo?.name ?? variant.material ?? null,
      selectedSize: variant.sizeLabel,
      selectedPrintSide: product.category.slug === "pillow" ? "one_sided" : null,
      selectedPrintSideLabel:
        product.category.slug === "pillow" ? t(dict, "productDetail.printSide.oneSided") : null,
      selectedImage: product.mainImage ?? product.cardImage,
      selectedPrice: variant.price ?? product.defaultPrice,
      qty: 1,
    });
    showAddedFeedback();
  };

  const buttonContent = isAdded ? (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5.5 10.2 2.7 2.7 6.3-6.5" />
      </svg>
      <span className="text-xs font-medium">{t(dict, "cart.feedback.added")}</span>
    </>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="19" r="1.25" />
      <circle cx="17" cy="19" r="1.25" />
      <path d="M4.5 5.5h2.1l1.7 8.2a1 1 0 0 0 1 .8h7.9a1 1 0 0 0 1-.7l1.4-5.5H8.2" />
      <path d="M15.5 8.6v3.2" />
      <path d="M13.9 10.2h3.2" />
    </svg>
  );

  return (
    <article className="ui-card-sm group relative flex h-full flex-col overflow-hidden border-[color:var(--border-soft)] transition-[transform,background-color,box-shadow,border-color] duration-200 hover:border-[#d1c5b8] hover:bg-[#f1e9de] hover:shadow-[0_14px_30px_rgba(23,20,17,0.06)] md:hover:-translate-y-0.5">
      <div className="relative">
        <Link href={`/${lang}/product/${product.slug}`} className="block">
          <div className="relative aspect-[1/0.92] overflow-hidden bg-[var(--surface-muted)]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={buildProductImageAlt({
                  title: product.title,
                  productType: product.productType,
                  categoryLabel: product.category.name,
                  dict,
                  variantLabel: getVariantLabel(variant),
                  sizeLabel: variant?.sizeLabel ?? null,
                })}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[color:var(--text-muted)]">
                {t(dict, "catalogue.card.noImage")}
              </div>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!variant}
          aria-label={isAdded ? t(dict, "cart.feedback.added") : t(dict, "productDetail.addToCart")}
          className={`absolute bottom-0 right-0 z-20 hidden -translate-x-[24%] translate-y-[132%] items-center justify-center gap-1.5 overflow-hidden rounded-full border border-[var(--button-dark)] px-3 shadow-[0_10px_24px_rgba(18,16,14,0.18)] transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex lg:h-10 lg:opacity-0 lg:pointer-events-none lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100 xl:-translate-x-[28%] xl:translate-y-[138%] ${
            isAdded
              ? "bg-[#2D7A46] text-[#faf7f2]"
              : "bg-[var(--button-dark)] text-[var(--accent-soft)] hover:bg-[#241e19]"
          } ${isAdded ? "w-auto min-w-[6.75rem]" : "w-10"}`}
        >
          {buttonContent}
        </button>
      </div>

      <Link href={`/${lang}/product/${product.slug}`} className="block flex-1">
        <div className="px-3.5 pb-1 pt-3.5">
          <h2 className="line-clamp-2 text-[14px] font-semibold leading-[1.3] text-[color:var(--text-strong)] sm:text-[15px] lg:text-[17px]">
            {product.title}
          </h2>
          {product.subtitle ? (
            <p className="mt-1 line-clamp-2 min-h-[2.1rem] text-[12px] leading-[1.36] font-normal text-[color:var(--text-muted)] sm:min-h-0 sm:line-clamp-1 lg:text-[13px]">
              {product.subtitle}
            </p>
          ) : null}
        </div>
      </Link>

      <div className="mt-auto flex items-end justify-between gap-2 px-3.5 pb-3.5 pt-1.5">
        <p className="text-[14px] font-medium text-[color:var(--text-body)]">
          {product.defaultPrice} ₾
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!variant}
          aria-label={isAdded ? t(dict, "cart.feedback.added") : t(dict, "productDetail.addToCart")}
          className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-[var(--button-dark)] px-3 transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden ${
            isAdded
              ? "bg-[#2D7A46] text-[#faf7f2]"
              : "bg-[var(--button-dark)] text-[var(--accent-soft)] hover:bg-[#241e19]"
          } ${isAdded ? "w-auto min-w-[6.25rem]" : "w-9"}`}
        >
          {buttonContent}
        </button>
      </div>
    </article>
  );
};
