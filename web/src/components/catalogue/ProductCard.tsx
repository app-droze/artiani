import Image from "next/image";
import Link from "next/link";
import type { CatalogueProduct } from "@/src/lib/catalogueModels";
import { getCatalogueTypeLabelKey } from "@/src/lib/catalogueModels";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type ProductCardProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
};

export const ProductCard = ({ product, lang, dict }: ProductCardProps) => {
  const imageUrl = product.cardImage ?? product.mainImage;

  return (
    <Link
      href={`/${lang}/product/${product.slug}`}
      className="group overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/80 transition-colors hover:bg-white"
    >
      <div className="relative aspect-[4/4.85] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,238,230,0.9))]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-contain p-3 transition duration-500 group-hover:scale-[1.02] sm:p-4"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-black/35">
            {t(dict, "catalogue.card.noImage")}
          </div>
        )}
      </div>

      <div className="space-y-2.5 px-4 py-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/42">
            {t(dict, getCatalogueTypeLabelKey(product.productType))}
          </p>
          <h2 className="text-sm font-semibold tracking-tight text-black sm:text-base">
            {product.title}
          </h2>
        </div>

        <p className="text-sm text-black/68">
          {t(dict, "catalogue.card.pricePrefix")} {product.defaultPrice} ₾
        </p>
      </div>
    </Link>
  );
};
