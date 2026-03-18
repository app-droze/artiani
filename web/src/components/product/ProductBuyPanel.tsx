"use client";

import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type StyleGroup = {
  key: string;
  label: string;
};

type ProductBuyPanelProps = {
  title: string;
  subtitle: string;
  materialDescription: string | null;
  price: number;
  styleGroups: StyleGroup[];
  selectedStyleKey: string;
  availableSizes: string[];
  selectedSizeLabel: string | null | undefined;
  printAreaNote: {
    printSizeLabel: string;
  } | null;
  onStyleSelect: (styleKey: string) => void;
  onSizeSelect: (sizeLabel: string) => void;
  onAddToCart: () => void;
  canAddToCart: boolean;
  lang: Locale;
  dict: Dictionary;
};

export const ProductBuyPanel = ({
  title,
  subtitle,
  materialDescription,
  price,
  styleGroups,
  selectedStyleKey,
  availableSizes,
  selectedSizeLabel,
  printAreaNote,
  onStyleSelect,
  onSizeSelect,
  onAddToCart,
  canAddToCart,
  lang,
  dict,
}: ProductBuyPanelProps) => {
  const { items, totalAmount } = useCart();

  return (
    <div className="lg:sticky lg:top-8">
      <div className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/50 px-5 py-5 backdrop-blur-sm sm:px-6 sm:py-6">
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-[2.4rem] sm:leading-[1.04]">
              {title}
            </h1>
            <p className="text-sm uppercase tracking-[0.18em] text-black/48">{subtitle}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              {t(dict, "productDetail.priceLabel")}
            </p>
            <p className="text-[2rem] font-semibold tracking-tight text-black sm:text-[2.2rem]">
              {price} ₾
            </p>
          </div>
        </div>

        {availableSizes.length > 0 ? (
          <div className="space-y-2.5 border-t border-black/8 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
              {t(dict, "productDetail.sizeSelectorLabel")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((sizeLabel) => {
                const isActive = selectedSizeLabel === sizeLabel;

                return (
                  <button
                    key={sizeLabel}
                    type="button"
                    onClick={() => onSizeSelect(sizeLabel)}
                    className={`rounded-full px-3.5 py-2 text-sm transition ${
                      isActive
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white/75 text-black/75 hover:bg-white"
                    }`}
                  >
                    {sizeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {printAreaNote ? (
          <div className="border-t border-black/8 pt-4">
            <div className="rounded-[1.2rem] border border-[#c9b38a]/55 bg-[#f5ecdc] px-4 py-3.5 text-sm text-black/72 shadow-[0_10px_24px_rgba(98,78,42,0.06)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c8a45a] text-[11px] font-semibold text-white">
                  i
                </span>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/48">
                    {t(dict, "productDetail.printAreaLabel")}
                  </p>
                  <p className="leading-6">
                    <span className="font-semibold text-black">
                      {printAreaNote.printSizeLabel}
                    </span>
                    . {t(dict, "productDetail.printAreaNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {styleGroups.length > 0 ? (
          <div className="space-y-2.5 border-t border-black/8 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
              {t(dict, "productDetail.variantSelectorLabel")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {styleGroups.map((group) => {
                const isActive = group.key === selectedStyleKey;

                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => onStyleSelect(group.key)}
                    className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white/75 text-black/75 hover:bg-white"
                    }`}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {materialDescription ? (
          <div className="border-t border-black/8 pt-4">
            <div className="flex flex-col gap-1.5 text-sm text-black/68">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                {t(dict, "productDetail.materialLabel")}
              </span>
              <span className="leading-6">{materialDescription}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-black/8 pt-5">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!canAddToCart}
            className="inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(dict, "productDetail.addToCart")} ({price} ₾)
          </button>
        </div>

        {items.length > 0 ? (
          <div className="space-y-3 border-t border-black/8 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
                {t(dict, "productDetail.basketLabel")}
              </h2>
              <Link
                href={`/${lang}/cart`}
                className="text-sm text-black/58 underline underline-offset-4"
              >
                {t(dict, "productDetail.viewCart")}
              </Link>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 text-sm text-black/68"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium text-black">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                      {item.productTypeLabel}
                    </p>
                    <p className="text-xs text-black/52">
                      {t(dict, "cart.qtyLabel")}: {item.qty}
                      {item.selectedColorLabel ? ` · ${item.selectedColorLabel}` : ""}
                      {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium text-black">
                    {item.selectedPrice * item.qty} ₾
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3 text-sm">
              <span className="font-semibold uppercase tracking-[0.16em] text-black/55">
                {t(dict, "cart.totalLabel")}
              </span>
              <span className="font-semibold text-black">{totalAmount} ₾</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
