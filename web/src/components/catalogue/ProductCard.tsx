import Image from "next/image";
import Link from "next/link";
import type { CatalogueProduct } from "@/src/lib/catalogueModels";
import { getCatalogueShapeKey } from "@/src/lib/catalogueModels";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type ProductCardProps = {
  product: CatalogueProduct;
  lang: Locale;
  dict: Dictionary;
};

export const ProductCard = ({ product, lang, dict }: ProductCardProps) => (
  <Link
    href={`/${lang}/product/${product.slug}`}
    className="group overflow-hidden rounded-[1.25rem] bg-white/75 transition hover:bg-white"
  >
    <div className="relative aspect-[4/4] bg-black/[0.04]">
      {product.cardImage ?? product.mainImage ? (
        <Image
          src={product.cardImage ?? product.mainImage ?? ""}
          alt={product.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-black/35">
          {t(dict, "catalogue.card.noImage")}
        </div>
      )}
    </div>

    <div className="space-y-2 px-3.5 py-3.5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-black">{product.title}</h2>
        <p className="text-xs uppercase tracking-[0.18em] text-black/45">
          {t(dict, "catalogue.common.cloth")} ·{" "}
          {t(dict, `catalogue.shapes.${getCatalogueShapeKey(product.productType)}`)}
        </p>
      </div>

      <div className="space-y-1 text-sm text-black/65">
        <p>
          {product.variantCount} {t(dict, "catalogue.card.variantCount")}
        </p>
      </div>
    </div>
  </Link>
);
