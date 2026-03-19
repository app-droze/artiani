"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import type { CatalogueProduct, CatalogueVariant } from "@/src/lib/catalogueModels";
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

  const handleAddToCart = () => {
    if (!variant) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      productTypeLabel: "",
      variantId: variant.id,
      selectedColorLabel: getVariantLabel(variant),
      selectedBackgroundLabel: variant.backgroundName,
      selectedSize: variant.sizeLabel,
      selectedImage: product.mainImage ?? product.cardImage,
      selectedPrice: variant.price ?? product.defaultPrice,
      qty: 1,
    });
    showAddedFeedback();
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.2rem] border border-black/8 bg-white/84 transition-colors hover:bg-white">
      <Link href={`/${lang}/product/${product.slug}`} className="block">
        <div className="relative aspect-[1/1.04] overflow-hidden bg-[#ece6dc]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={buildProductImageAlt({
                title: product.title,
                productType: product.productType,
                dict,
                variantLabel: getVariantLabel(variant),
                sizeLabel: variant?.sizeLabel ?? null,
              })}
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-black/35">
              {t(dict, "catalogue.card.noImage")}
            </div>
          )}
        </div>

        <div className="px-3 pb-1 pt-2.5 sm:px-3.5 sm:pb-1.5 sm:pt-3">
          <h2 className="line-clamp-2 text-[14px] font-semibold tracking-tight text-black sm:text-base">
            {product.title}
          </h2>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-0 sm:px-3.5 sm:pb-3.5">
        <p className="text-[14px] font-medium text-black/82 sm:text-[15px]">
          {product.defaultPrice} ₾
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!variant}
          aria-label={isAdded ? t(dict, "cart.feedback.added") : t(dict, "productDetail.addToCart")}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-black/12 px-3 text-white transition duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 ${
            isAdded ? "bg-[#2D7A46]" : "bg-black hover:bg-black/90"
          } ${isAdded ? "w-auto min-w-[6.75rem]" : "w-10 sm:w-11"}`}
        >
          {isAdded ? (
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
          )}
        </button>
      </div>
    </article>
  );
};
