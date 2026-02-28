"use client";

import { useMemo, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { Chip } from "@/src/components/ui/Chip";

const getTypeLabel = (dict: Dictionary, type: Product["kind"]) =>
  t(dict, `productTypes.${type}`);

type CatalogueFilter = "all" | "signature" | Product["kind"];

const typeList: CatalogueFilter[] = [
  "all",
  "signature",
  "paintings",
  "bookmarks",
  "calendars",
  "cards",
  "prints",
];

const typeSections: Product["kind"][] = [
  "paintings",
  "bookmarks",
  "calendars",
  "cards",
  "prints",
];

const isType = (value: string | null): value is CatalogueFilter =>
  value !== null && typeList.includes(value as CatalogueFilter);

const hasSignatureOption = (product: Product) =>
  product.kind === "cards" || product.kind === "prints";

const FALLBACK_IMAGE = "";

type ShopCatalogProps = {
  products: Product[];
  lang: Locale;
  dict: Dictionary;
};

export const ShopCatalog = ({ products, lang, dict }: ShopCatalogProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryType = searchParams.get("type");
  const querySignature = searchParams.get("signature");
  const activeType: CatalogueFilter = isType(queryType)
    ? queryType
    : querySignature === "1"
      ? "signature"
      : "all";

  const updateUrl = useCallback(
    (nextType: CatalogueFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("signature");
      if (nextType === "all") {
        params.delete("type");
      } else {
        params.set("type", nextType);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: true });
    },
    [pathname, router, searchParams],
  );

  const filtered = useMemo(() => {
    if (activeType === "signature") {
      return products.filter((product) => hasSignatureOption(product));
    }
    const byType =
      activeType === "all"
        ? products
        : products.filter((product) => product.kind === activeType);
    return byType;
  }, [activeType, products]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {typeList.map((type) => (
          <Chip
            key={type}
            onClick={() => {
              const nextType = type as CatalogueFilter;
              updateUrl(nextType);
            }}
            active={activeType === type}
            baseClassName="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition"
            activeClassName="border-black bg-black text-white"
            inactiveClassName="border-black/10 text-black/60 hover:border-black"
          >
            {type === "all"
              ? t(dict, "shop.filter_all")
              : type === "signature"
                ? t(dict, "shop.filter_with_signature")
                : getTypeLabel(dict, type as Product["kind"])}
          </Chip>
        ))}
      </div>

      {activeType === "all" ? (
        <div className="space-y-10">
          {typeSections.map((type) => {
            const items = products.filter((product) => product.kind === type);
            if (items.length === 0) return null;
            return (
              <section key={type} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">
                    {getTypeLabel(dict, type)}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      lang={lang}
                      dict={dict}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              dict={dict}
            />
          ))}
        </div>
      )}
    </section>
  );
};

type ProductCardProps = {
  product: Product;
  lang: Locale;
  dict: Dictionary;
};

const ProductCard = ({ product, lang, dict }: ProductCardProps) => {
  const name = pick(product.name, lang);
  const [imageSrc, setImageSrc] = useState(product.image || FALLBACK_IMAGE);
  const hasImage = Boolean(imageSrc);
  const showSignatureBadge = hasSignatureOption(product);

  return (
    <Link
      href={`/${lang}/product/${product.slug}`}
      scroll
      className="group rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-4 overflow-hidden rounded-2xl border border-black/5 bg-[#f5efe7]">
        <div className="relative aspect-[4/3] w-full">
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-contain p-4"
              onError={() => setImageSrc(FALLBACK_IMAGE)}
            />
          ) : null}
          {product.kind === "paintings" ? (
            <span className="absolute left-3 top-3 rounded-full border border-[#f4ece2]/35 bg-[#2d241b]/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f8f4ee] shadow-[0_4px_14px_rgba(0,0,0,0.38)]">
              {t(dict, "auction.badge")}
            </span>
          ) : null}
          {showSignatureBadge ? (
            <span className="absolute left-3 top-3 rounded-full border border-black/20 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/75 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              {t(dict, "shop.badge_with_signature")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-black">{name}</h3>
        <p className="text-sm text-black/50">{pick(product.summary, lang)}</p>
      </div>
    </Link>
  );
};
