"use client";

import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import { formatMoney } from "@/src/lib/money";
import { products, pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type CartViewProps = {
  lang: Locale;
  dict: Dictionary;
};

export const CartView = ({ lang, dict }: CartViewProps) => {
  const { items, subtotal, updateQty, removeItem } = useCart();
  const separator = t(dict, "ui.separator");

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-10 text-center">
        <h1 className="text-2xl font-semibold text-black">
          {t(dict, "cart.empty_title")}
        </h1>
        <p className="mt-2 text-sm text-black/60">
          {t(dict, "cart.empty_subtitle")}
        </p>
        <Link
          href={`/${lang}/catalogue`}
          className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          {t(dict, "cart.empty_cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        {items.map((item) => (
          (() => {
            const product = products.find((p) => p.id === item.productId);
            const name = product ? pick(product.name, lang) : item.name;
            const specs: string[] = [];
            const hasSignature = Boolean(product?.options.signature);

            if (hasSignature && item.options.signature) {
              specs.push(t(dict, "cart.option_signature_yes"));
            }
            if (item.options.cardBack) {
              specs.push(
                item.options.cardBack === "postcard"
                  ? t(dict, "product.cards_postcard")
                  : t(dict, "product.cards_greeting"),
              );
            }

            return (
          <div
            key={item.id}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {t(dict, `productTypeSingle.${item.type}`)} - {name}
                </h2>
                {specs.length > 0 ? (
                  <p className="mt-1 text-sm text-black/60">{specs.join(separator)}</p>
                ) : null}
                <p className="mt-2 text-sm font-semibold text-black">
                  {formatMoney(item.unitPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-xl leading-none text-black/50 hover:text-black"
                aria-label={t(dict, "cart.remove")}
              >
                ×
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                {t(dict, "cart.qty")}
              </label>
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={(event) => updateQty(item.id, Number(event.target.value))}
                className="h-10 w-20 rounded-lg border border-black/10 px-3 text-sm"
              />
              <span className="ml-auto text-sm font-semibold text-black">
                {formatMoney(item.unitPrice * item.qty)}
              </span>
            </div>
          </div>
            );
          })()
        ))}
      </div>

      <aside className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold text-black">
          {t(dict, "cart.total_title")}
        </h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-black/60">{t(dict, "cart.subtotal")}</span>
          <span className="font-semibold text-black">{formatMoney(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-black/40">
          {t(dict, "cart.tax_note")}
        </p>
        <Link
          href={`/${lang}/checkout`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          {t(dict, "cart.checkout_cta")}
        </Link>
      </aside>
    </div>
  );
};
