"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

const getTypeLabel = (dict: Dictionary, type: Product["type"]) =>
  t(dict, `productTypes.${type}`);

type ShopCatalogProps = {
  products: Product[];
  lang: Locale;
  dict: Dictionary;
};

export const ShopCatalog = ({ products, lang, dict }: ShopCatalogProps) => {
  const [activeType, setActiveType] = useState<"all" | Product["type"]>("all");

  const filtered = useMemo(() => {
    if (activeType === "all") return products;
    return products.filter((product) => product.type === activeType);
  }, [activeType, products]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[
          "all",
          "postcards",
          "greeting-cards",
          "bookmarks",
          "calendar",
          "signed-prints",
        ].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type as "all" | Product["type"])}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeType === type
                ? "border-black bg-black text-white"
                : "border-black/10 text-black/70 hover:border-black"
            }`}
          >
            {type === "all"
              ? t(dict, "shop.filter_all")
              : getTypeLabel(dict, type as Product["type"])}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/${lang}/product/${product.slug}`}
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-4 flex h-36 items-end rounded-xl bg-gradient-to-br from-amber-100 via-rose-100 to-orange-100 p-4 text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              {getTypeLabel(dict, product.type)}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-black">
                {pick(product.name, lang)}
              </h3>
              <p className="text-sm text-black/60">
                {pick(product.summary, lang)}
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{formatMoney(product.price)}</span>
                <span className="text-black/40 group-hover:text-black">
                  {t(dict, "shop.card_view")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
