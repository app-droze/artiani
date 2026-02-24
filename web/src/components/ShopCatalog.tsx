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

const typeList: Array<"all" | Product["kind"]> = [
  "all",
  "paintings",
  "prints",
  "calendars",
  "bookmarks",
  "cards",
];

const typeSections: Product["kind"][] = [
  "paintings",
  "prints",
  "calendars",
  "bookmarks",
  "cards",
];

const isType = (value: string | null): value is Product["kind"] =>
  value !== null && typeList.includes(value as Product["kind"]);

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
  const activeType: "all" | Product["kind"] = isType(queryType) ? queryType : "all";

  const updateUrl = useCallback(
    (nextType: "all" | Product["kind"]) => {
      const params = new URLSearchParams(searchParams.toString());
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
    if (activeType === "all") return products;
    return products.filter((product) => product.kind === activeType);
  }, [activeType, products]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {typeList.map((type) => (
          <Chip
            key={type}
            onClick={() => {
              const nextType = type as "all" | Product["kind"];
              updateUrl(nextType);
            }}
            active={activeType === type}
            baseClassName="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition"
            activeClassName="border-black bg-black text-white"
            inactiveClassName="border-black/10 text-black/60 hover:border-black"
          >
            {type === "all"
              ? t(dict, "shop.filter_all")
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
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
          {product.kind === "paintings" ? (
            <span className="rounded-full border border-black/15 bg-[#f3e6d6] px-2.5 py-1 text-black/70">
              {t(dict, "auction.badge")}
            </span>
          ) : (
            <span className="rounded-full border border-black/10 bg-[#eef2e6] px-2.5 py-1 text-black/60">
              {t(dict, "shop.in_stock")}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-black">{name}</h3>
        <p className="text-sm text-black/50">{pick(product.summary, lang)}</p>
      </div>
    </Link>
  );
};
