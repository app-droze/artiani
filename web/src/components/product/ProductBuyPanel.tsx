"use client";

import { ArtistLinks } from "@/src/components/ArtistLinks";
import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type StyleGroup = {
  key: string;
  label: string;
};

type MaterialOption = {
  key: string;
  label: string;
};

type PrintSideOption = {
  key: "one_sided" | "both_sided";
  label: string;
};

type ProductBuyPanelProps = {
  title: string;
  subtitle: string;
  materialLabel: string | null;
  materialDescription: string | null;
  price: number;
  styleGroups: StyleGroup[];
  selectedStyleKey: string;
  availableSizes: string[];
  selectedSizeLabel: string | null | undefined;
  materialOptions: MaterialOption[];
  selectedMaterialKey: string | null;
  printSideOptions: PrintSideOption[];
  selectedPrintSide: "one_sided" | "both_sided" | null;
  printAreaNote: {
    printSizeLabel: string;
  } | null;
  onStyleSelect: (styleKey: string) => void;
  onSizeSelect: (sizeLabel: string) => void;
  onMaterialSelect: (materialKey: string) => void;
  onPrintSideSelect: (printSide: "one_sided" | "both_sided") => void;
  onAddToCart: () => void;
  canAddToCart: boolean;
  lang: Locale;
  dict: Dictionary;
};

export const ProductBuyPanel = ({
  title,
  subtitle,
  materialLabel,
  materialDescription,
  price,
  styleGroups,
  selectedStyleKey,
  availableSizes,
  selectedSizeLabel,
  materialOptions,
  selectedMaterialKey,
  printSideOptions,
  selectedPrintSide,
  printAreaNote,
  onStyleSelect,
  onSizeSelect,
  onMaterialSelect,
  onPrintSideSelect,
  onAddToCart,
  canAddToCart,
  lang,
  dict,
}: ProductBuyPanelProps) => {
  const { items, totalAmount } = useCart();
  const { isAdded, showAddedFeedback } = useAddToCartFeedback();
  const optionGroupLabelClass = "text-[0.98rem] font-medium leading-6 text-black";
  const getOptionButtonClass = (isActive: boolean) =>
    `min-h-[2.85rem] rounded-[1rem] px-4 py-2.5 text-[15px] font-medium leading-5 transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
      isActive
        ? "border border-black bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
        : "border border-black/20 bg-white text-black shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:border-black/30 hover:bg-black/[0.03] active:scale-[0.985]"
    }`;
  const normalizedMaterialLabel = materialLabel?.trim().toLocaleLowerCase() ?? null;
  const normalizedMaterialDescription = materialDescription?.trim().toLocaleLowerCase() ?? null;
  const shouldShowMaterialDescription =
    Boolean(materialDescription) &&
    (!normalizedMaterialLabel || normalizedMaterialLabel !== normalizedMaterialDescription);

  const handleAddToCartClick = () => {
    if (!canAddToCart) return;

    onAddToCart();
    showAddedFeedback();
  };

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
            <h2 className={optionGroupLabelClass}>
              {t(
                dict,
                availableSizes.length > 1
                  ? "productDetail.sizeSelectorChooseLabel"
                  : "productDetail.sizeSelectorLabel",
              )}
            </h2>
            <div className="flex flex-wrap gap-3">
              {availableSizes.map((sizeLabel) => {
                const isActive = selectedSizeLabel === sizeLabel;

                return (
                  <button
                    key={sizeLabel}
                    type="button"
                    onClick={() => onSizeSelect(sizeLabel)}
                    className={getOptionButtonClass(isActive)}
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

        {printSideOptions.length > 0 ? (
          <div className="space-y-2.5 border-t border-black/8 pt-4">
            <h2 className={optionGroupLabelClass}>
              {t(dict, "productDetail.printSideLabel")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {printSideOptions.map((option) => {
                const isActive = selectedPrintSide === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onPrintSideSelect(option.key)}
                    className={getOptionButtonClass(isActive)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {styleGroups.length > 0 ? (
          <div className="space-y-2.5 border-t border-black/8 pt-4">
            <h2 className={optionGroupLabelClass}>
              {t(dict, "productDetail.variantSelectorLabel")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {styleGroups.map((group) => {
                const isActive = group.key === selectedStyleKey;

                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => onStyleSelect(group.key)}
                    className={getOptionButtonClass(isActive)}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {materialOptions.length > 0 ? (
          <div className="space-y-2.5 border-t border-black/8 pt-4">
            <h2 className={optionGroupLabelClass}>
              {t(dict, "productDetail.materialLabel")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {materialOptions.map((option) => {
                const isActive = selectedMaterialKey === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onMaterialSelect(option.key)}
                    className={getOptionButtonClass(isActive)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {shouldShowMaterialDescription ? (
              <p className="text-sm leading-6 text-black/62">{materialDescription}</p>
            ) : null}
          </div>
        ) : materialLabel || shouldShowMaterialDescription ? (
          <div className="border-t border-black/8 pt-4">
            <div className="flex flex-col gap-1.5 text-sm text-black/68">
              <span className={optionGroupLabelClass}>
                {t(dict, "productDetail.materialLabel")}
              </span>
              {materialLabel ? (
                <span className="font-medium leading-6 text-black/78">{materialLabel}</span>
              ) : null}
              {shouldShowMaterialDescription ? (
                <span className="leading-6">{materialDescription}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <ArtistLinks
          dict={dict}
          className="border-t border-black/8 pt-4"
          titleClassName="text-black/45"
          linksClassName="gap-x-4 gap-y-2"
          linkClassName="text-black/62"
        />

        <div className="space-y-2 border-t border-black/8 pt-5">
          <button
            type="button"
            onClick={handleAddToCartClick}
            disabled={!canAddToCart}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium text-white transition duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 ${
              isAdded ? "bg-[#2D7A46]" : "bg-black hover:bg-black/90"
            }`}
          >
            {isAdded ? (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5.5 10.2 2.7 2.7 6.3-6.5" />
                </svg>
                {t(dict, "cart.feedback.added")}
              </>
            ) : (
              `${t(dict, "productDetail.addToCart")} (${price} ₾)`
            )}
          </button>
          <p
            className={`text-xs text-black/58 transition duration-200 ${
              isAdded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
            aria-live="polite"
          >
            {t(dict, "cart.feedback.addedToBasket")}
          </p>
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
                      {item.selectedMaterialLabel ? ` · ${item.selectedMaterialLabel}` : ""}
                      {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                      {item.selectedPrintSideLabel ? ` · ${item.selectedPrintSideLabel}` : ""}
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
