"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { writeStoredCart } from "@/src/lib/cart";
import { validateCartItems } from "@/src/lib/cartValidation";

type CartViewProps = {
  lang: Locale;
  dict: Dictionary;
};

export const CartView = ({ lang, dict }: CartViewProps) => {
  const { items, totalAmount, removeItem, updateItemQty } = useCart();
  const [removedItemCount, setRemovedItemCount] = useState(0);
  const validationRequestRef = useRef(0);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const requestId = validationRequestRef.current + 1;
    validationRequestRef.current = requestId;
    let cancelled = false;

    const runValidation = async () => {
      try {
        const result = await validateCartItems(items);
        if (cancelled || validationRequestRef.current !== requestId) {
          return;
        }

        if (result.invalidRemovedCount > 0) {
          setRemovedItemCount(result.invalidRemovedCount);
          writeStoredCart(result.validItems);
        }
      } catch {
        // Keep cart behavior non-blocking if validation cannot be reached.
      }
    };

    void runValidation();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
        <div className="rounded-[1.5rem] bg-white/75 px-5 py-6 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t(dict, "page.cart.title")}</h1>
          {removedItemCount > 0 ? (
            <p className="mt-3 text-sm leading-6 text-[#8a5a15]">
              {t(dict, "cart.validationNotice")}
            </p>
          ) : null}
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
        {removedItemCount > 0 ? (
          <p className="text-sm leading-6 text-[#8a5a15]">
            {t(dict, "cart.validationNotice")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.key}
            className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-[1.25rem] bg-white/75 px-3 py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4 sm:rounded-[1.5rem] sm:px-5 sm:py-4"
          >
            <Link
              href={`/${lang}/product/${item.slug}`}
              className="relative block aspect-square overflow-hidden rounded-[0.95rem] bg-black/[0.04] transition-opacity hover:opacity-95 sm:aspect-square sm:rounded-[1.1rem]"
            >
              {item.selectedImage ? (
                <Image
                  src={item.selectedImage}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="84px"
                />
              ) : null}
            </Link>

            <div className="flex flex-col gap-2.5 sm:gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-black/45">
                    {item.productTypeLabel}
                  </p>
                  <Link
                    href={`/${lang}/product/${item.slug}`}
                    className="block transition-opacity hover:opacity-70"
                  >
                    <h2 className="text-base font-semibold tracking-tight text-black sm:text-lg">
                      {item.title}
                    </h2>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-xs text-black/55 underline underline-offset-4 sm:text-sm"
                >
                  {t(dict, "cart.remove")}
                </button>
              </div>

              <div className="grid gap-1.5 text-[13px] text-black/68 sm:grid-cols-2 sm:gap-2 sm:text-sm">
                {item.selectedColorLabel ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.colorLabel")}:</span>{" "}
                    {item.selectedColorLabel}
                  </p>
                ) : null}
                {item.selectedMaterialLabel ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.materialLabel")}:</span>{" "}
                    {item.selectedMaterialLabel}
                  </p>
                ) : null}
                {item.selectedSize ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.sizeLabel")}:</span>{" "}
                    {item.selectedSize}
                  </p>
                ) : null}
                {item.selectedPrintSideLabel ? (
                  <p>
                    <span className="text-black/45">{t(dict, "cart.printSideLabel")}:</span>{" "}
                    {item.selectedPrintSideLabel}
                  </p>
                ) : null}
                {item.productType !== "painting" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-black/45">{t(dict, "cart.qtyLabel")}:</span>
                    <div className="inline-flex items-center rounded-full border border-black/10 bg-white/80">
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.key, item.qty - 1)}
                        className="px-2.5 py-1 text-sm text-black/70 sm:px-3 sm:py-1.5 sm:text-base"
                        aria-label={t(dict, "cart.decreaseQty")}
                      >
                        -
                      </button>
                      <span className="min-w-7 text-center text-black sm:min-w-8">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.key, item.qty + 1)}
                        className="px-2.5 py-1 text-sm text-black/70 sm:px-3 sm:py-1.5 sm:text-base"
                        aria-label={t(dict, "cart.increaseQty")}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
                <p>
                  <span className="text-black/45">{t(dict, "cart.priceLabel")}:</span>{" "}
                  {item.selectedPrice} ₾
                </p>
              </div>

              <div className="border-t border-black/8 pt-2.5 text-[13px] font-medium text-black sm:pt-3 sm:text-sm">
                {t(dict, "cart.lineTotalLabel")}: {item.selectedPrice * item.qty} ₾
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-[1.5rem] bg-white/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
              {t(dict, "cart.totalLabel")}
            </span>
            <div className="text-2xl font-semibold tracking-tight text-black">{totalAmount} ₾</div>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-[14rem]">
            <Link
              href={`/${lang}/checkout`}
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium !text-white transition-colors hover:bg-black/90"
            >
              {t(dict, "cart.checkout")}
            </Link>
            <Link
              href={`/${lang}/catalogue`}
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white/72 px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-white"
            >
              {t(dict, "cart.continueShopping")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
