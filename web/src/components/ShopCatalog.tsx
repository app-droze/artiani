"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

const getTypeLabel = (dict: Dictionary, type: Product["type"]) =>
  t(dict, `productTypes.${type}`);

const typeList: Array<"all" | Product["type"]> = [
  "all",
  "paintings",
  "signed-prints",
  "calendar",
  "bookmarks",
  "postcards",
  "greeting-cards",
];

const typeSections: Product["type"][] = [
  "paintings",
  "signed-prints",
  "calendar",
  "bookmarks",
  "postcards",
  "greeting-cards",
];

const isType = (value: string | null): value is Product["type"] =>
  value !== null && typeList.includes(value as Product["type"]);

const FALLBACK_IMAGE = "";

type ShopCatalogProps = {
  products: Product[];
  lang: Locale;
  dict: Dictionary;
};

export const ShopCatalog = ({ products, lang, dict }: ShopCatalogProps) => {
  const [activeType, setActiveType] = useState<"all" | Product["type"]>("all");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const queryType = searchParams.get("type");
    if (isType(queryType)) {
      setActiveType(queryType);
      return;
    }
    setActiveType("all");
  }, [searchParams]);

  const updateUrl = useCallback(
    (nextType: "all" | Product["type"]) => {
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
    return products.filter((product) => product.type === activeType);
  }, [activeType, products]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {typeList.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              const nextType = type as "all" | Product["type"];
              setActiveType(nextType);
              updateUrl(nextType);
            }}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activeType === type
                ? "border-black bg-black text-white"
                : "border-black/10 text-black/60 hover:border-black"
            }`}
          >
            {type === "all"
              ? t(dict, "shop.filter_all")
              : getTypeLabel(dict, type as Product["type"])}
          </button>
        ))}
      </div>

      {activeType === "all" ? (
        <div className="space-y-10">
          {typeSections.map((type) => {
            const items = products.filter((product) => product.type === type);
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
        <h3 className="text-lg font-semibold tracking-tight text-black">{name}</h3>
        <p className="text-sm text-black/50">{pick(product.summary, lang)}</p>
      </div>
    </Link>
  );
};
