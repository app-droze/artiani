"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { useCart } from "@/src/components/CartProvider";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type ProductDetailsProps = {
  product: Product;
  lang: Locale;
  dict: Dictionary;
};

export const ProductDetails = ({ product, lang, dict }: ProductDetailsProps) => {
  const [addText, setAddText] = useState(false);
  const [signature, setSignature] = useState(false);
  const { addItem } = useCart();
  const { options } = product;
  const hasAddText = typeof options.addText === "number";
  const hasSignature = typeof options.signature === "number";
  const typeLabel = t(dict, `productTypes.${product.type}`);

  const price = useMemo(() => {
    let total = product.price;
    if (addText && hasAddText) total += options.addText ?? 0;
    if (signature && hasSignature) total += options.signature ?? 0;
    return total;
  }, [addText, signature, product.price, hasAddText, hasSignature, options]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-slate-100 via-amber-100 to-orange-100 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">
            {typeLabel}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-black">
            {pick(product.name, lang)}
          </h1>
          <p className="mt-2 text-sm font-medium text-black/60">
            {pick(product.summary, lang)}
          </p>
          <p className="mt-4 text-base text-black/60">
            {pick(product.description, lang)}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-black">
            {t(dict, "product.personalization_title")}
          </h2>
          <p className="mt-1 text-sm text-black/60">
            {t(dict, "product.personalization_subtitle")}
          </p>
          <div className="mt-4 space-y-3 text-sm">
            {hasAddText ? (
              <label className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                <span className="font-medium text-black">
                  {t(dict, "product.option_add_text")}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-black/50">
                    +{formatMoney(options.addText ?? 0)}
                  </span>
                  <input
                    type="checkbox"
                    checked={addText}
                    onChange={(event) => setAddText(event.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
              </label>
            ) : null}
            {hasSignature ? (
              <label className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                <span className="font-medium text-black">
                  {t(dict, "product.option_signature")}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-black/50">
                    +{formatMoney(options.signature ?? 0)}
                  </span>
                  <input
                    type="checkbox"
                    checked={signature}
                    onChange={(event) => setSignature(event.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
              </label>
            ) : null}
            {!hasAddText && !hasSignature ? (
              <p className="text-sm text-black/50">
                {t(dict, "product.no_options")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-black/50">
            {t(dict, "product.campaign_price")}
          </p>
          <p className="text-3xl font-semibold text-black">{formatMoney(price)}</p>
        </div>
        <p className="text-sm text-black/60">
          {t(dict, "product.dispatch_note")}
        </p>
        <button
          type="button"
          onClick={() =>
            addItem(
              product,
              {
                addText: hasAddText ? addText : false,
                signature: hasSignature ? signature : false,
              },
              price,
            )
          }
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
        >
          {t(dict, "product.add_to_cart")}
        </button>
        <Link
          href={`/${lang}/cart`}
          className="block w-full rounded-full border border-black px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-black hover:text-white"
        >
          {t(dict, "product.view_cart")}
        </Link>
      </aside>
    </div>
  );
};
