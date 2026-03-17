"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type CartViewProps = {
  lang: Locale;
  dict: Dictionary;
};

export const CartView = ({ lang, dict }: CartViewProps) => {
  const { items, totalAmount, removeItem, updateItemQty } = useCart();

  if (items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
        <div className="rounded-[1.5rem] bg-white/75 px-5 py-6 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t(dict, "page.cart.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/68">
            {t(dict, "cart.emptyBody")}
          </p>
          <Link
            href={`/${lang}/catalogue`}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium !text-white transition-colors hover:bg-black/90"
          >
            {t(dict, "cart.continueShopping")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t(dict, "page.cart.title")}</h1>
        <p className="text-sm text-black/58">{t(dict, "cart.summary")}</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.key}
            className="grid gap-4 rounded-[1.5rem] bg-white/75 px-4 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:px-5"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-black/[0.04] sm:aspect-square">
              {item.selectedImage ? (
                <Image
                  src={item.selectedImage}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 40vw, 112px"
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">
                    {item.productTypeLabel}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight text-black">{item.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-sm text-black/55 underline underline-offset-4"
                >
                  {t(dict, "cart.remove")}
                </button>
              </div>

              <div className="grid gap-2 text-sm text-black/68 sm:grid-cols-2">
                {item.selectedColorLabel ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.colorLabel")}:</span>{" "}
                    {item.selectedColorLabel}
                  </p>
                ) : null}
                {item.selectedSize ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.sizeLabel")}:</span>{" "}
                    {item.selectedSize}
                  </p>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="text-black/45">{t(dict, "cart.qtyLabel")}:</span>
                  <div className="inline-flex items-center rounded-full border border-black/10 bg-white/80">
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.key, item.qty - 1)}
                      className="px-3 py-1.5 text-base text-black/70"
                      aria-label={t(dict, "cart.decreaseQty")}
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-black">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.key, item.qty + 1)}
                      className="px-3 py-1.5 text-base text-black/70"
                      aria-label={t(dict, "cart.increaseQty")}
                    >
                      +
                    </button>
                  </div>
                </div>
                <p>
                  <span className="text-black/45">{t(dict, "cart.priceLabel")}:</span>{" "}
                  {item.selectedPrice} ₾
                </p>
              </div>

              <div className="border-t border-black/8 pt-3 text-sm font-medium text-black">
                {t(dict, "cart.lineTotalLabel")}: {item.selectedPrice * item.qty} ₾
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-[1.5rem] bg-white/80 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
            {t(dict, "cart.totalLabel")}
          </span>
          <span className="text-2xl font-semibold tracking-tight text-black">{totalAmount} ₾</span>
        </div>
      </div>
    </section>
  );
};
