"use client";

import Link from "next/link";
import { CartToast } from "@/src/components/CartToast";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCartDisplayProductTypeLabel, getCartDisplayTitle } from "@/src/lib/cart";
import type { PhoneCaseModelOption } from "@/src/lib/phoneCaseModels";

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
  isPaintingProduct: boolean;
  isPhoneCaseProduct: boolean;
  isBagProduct: boolean;
  isSoldPainting: boolean;
  hasActivePaintingReservation: boolean;
  isScarfProduct: boolean;
  paintingFactSizeLabel: string | null;
  paintingFactMaterialLabel: string | null;
  price: number;
  styleGroups: StyleGroup[];
  selectedStyleKey: string;
  availableSizes: string[];
  selectedSizeLabel: string | null | undefined;
  materialOptions: MaterialOption[];
  selectedMaterialKey: string | null;
  phoneModelOptions: PhoneCaseModelOption[];
  selectedPhoneModelCode: string | null;
  printSideOptions: PrintSideOption[];
  selectedPrintSide: "one_sided" | "both_sided" | null;
  printAreaNote: {
    printSizeLabel: string;
  } | null;
  onStyleSelect: (styleKey: string) => void;
  onSizeSelect: (sizeLabel: string) => void;
  onMaterialSelect: (materialKey: string) => void;
  onPhoneModelSelect: (phoneModelCode: string | null) => void;
  onPrintSideSelect: (printSide: "one_sided" | "both_sided") => void;
  onAddToCart: () => boolean;
  canAddToCart: boolean;
  lang: Locale;
  dict: Dictionary;
};

export const ProductBuyPanel = ({
  title,
  subtitle,
  materialLabel,
  materialDescription,
  isPaintingProduct,
  isPhoneCaseProduct,
  isBagProduct,
  isSoldPainting,
  hasActivePaintingReservation,
  isScarfProduct,
  paintingFactSizeLabel,
  paintingFactMaterialLabel,
  price,
  styleGroups,
  selectedStyleKey,
  availableSizes,
  selectedSizeLabel,
  materialOptions,
  selectedMaterialKey,
  phoneModelOptions,
  selectedPhoneModelCode,
  printSideOptions,
  selectedPrintSide,
  printAreaNote,
  onStyleSelect,
  onSizeSelect,
  onMaterialSelect,
  onPhoneModelSelect,
  onPrintSideSelect,
  onAddToCart,
  canAddToCart,
  lang,
  dict,
}: ProductBuyPanelProps) => {
  const { items, totalAmount } = useCart();
  const { isAdded, showAddedFeedback, hideAddedFeedback } = useAddToCartFeedback(3200);
  const optionGroupLabelClass = "text-[13px] font-normal leading-6 text-[color:var(--text-muted)]";
  const phoneModelGroups = phoneModelOptions.reduce<Array<{ brand: string; options: PhoneCaseModelOption[] }>>(
    (groups, option) => {
      const existing = groups.find((group) => group.brand === option.brand);
      if (existing) {
        existing.options.push(option);
        return groups;
      }

      groups.push({ brand: option.brand, options: [option] });
      return groups;
    },
    [],
  );
  const getOptionButtonClass = () =>
    "ui-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/12";
  const normalizedMaterialLabel = materialLabel?.trim().toLocaleLowerCase() ?? null;
  const normalizedMaterialDescription = materialDescription?.trim().toLocaleLowerCase() ?? null;
  const shouldShowMaterialDescription =
    Boolean(materialDescription) &&
    (!normalizedMaterialLabel || normalizedMaterialLabel !== normalizedMaterialDescription);
  const materialDisplayLabel =
    materialLabel && isScarfProduct
      ? `${materialLabel} (${t(dict, "productDetail.printSide.oneSided")})`
      : materialLabel;
  const washableNote =
    !isPaintingProduct && !isPhoneCaseProduct
      ? t(dict, isBagProduct ? "productDetail.washableNoteBag" : "productDetail.washableNote")
      : null;
  const formatSizeLabel = (value: string | null | undefined) => {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    return /(?:cm|სმ)\b/i.test(trimmed) ? trimmed : `${trimmed} cm`;
  };
  const formatCartItemDetails = (item: (typeof items)[number]) => {
    const details = [
      item.productType !== "painting" ? `${t(dict, "cart.qtyLabel")}: ${item.qty}` : null,
      item.productType !== "painting" ? item.selectedColorLabel : null,
      item.selectedPhoneModelLabel,
      item.selectedMaterialLabel,
      item.selectedSize,
      item.selectedPrintSideLabel,
    ].filter((detail): detail is string => Boolean(detail));

    return details.join(" · ");
  };

  const handleAddToCartClick = () => {
    if (!canAddToCart) return;

    const didAdd = onAddToCart();

    if (didAdd) {
      showAddedFeedback();
    }
  };

  return (
    <div className="lg:sticky lg:top-8">
      <div className="ui-card space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <h1 className="font-display text-[1.875rem] font-bold leading-[1.1] tracking-[-0.022em] text-[color:var(--text-strong)] sm:text-[2.5rem] sm:leading-[1.08]">
              {title}
            </h1>
            <p className="ui-overline">{subtitle}</p>
          </div>

          <div className="space-y-1">
            <p className="ui-overline">
              {t(dict, "productDetail.priceLabel")}
            </p>
            <p className="text-[2rem] font-semibold tracking-tight text-[color:var(--text-strong)] sm:text-[2.2rem]">
              {price} ₾
            </p>
          </div>
        </div>

        {isPaintingProduct ? (
          <div className="border-t border-[var(--border-soft)] pt-4">
            <div className="flex flex-col gap-3 text-sm text-[color:var(--text-body)]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-normal leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "productDetail.sizeSelectorLabel")}
                </span>
                <span className="font-medium leading-6 text-[color:var(--text-strong)]">
                  {formatSizeLabel(paintingFactSizeLabel) ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-normal leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "productDetail.materialStaticLabel")}
                </span>
                <span className="font-medium leading-6 text-[color:var(--text-strong)]">
                  {paintingFactMaterialLabel ?? "—"}
                </span>
              </div>
            </div>
          </div>
        ) : availableSizes.length > 0 ? (
          <div className="space-y-2.5 border-t border-[var(--border-soft)] pt-4">
            <h2 className={optionGroupLabelClass}>
              {t(
                dict,
                availableSizes.length > 1
                  ? "productDetail.sizeSelectorChooseLabel"
                  : "productDetail.sizeSelectorLabel",
              )}
            </h2>
            {availableSizes.length === 1 ? (
              <p className="text-sm font-medium leading-6 text-[color:var(--text-strong)]">
                {formatSizeLabel(availableSizes[0])}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {availableSizes.map((sizeLabel) => {
                  const isActive = selectedSizeLabel === sizeLabel;

                  return (
                    <button
                      key={sizeLabel}
                      type="button"
                      data-active={isActive}
                      onClick={() => onSizeSelect(sizeLabel)}
                      className={getOptionButtonClass()}
                    >
                      {formatSizeLabel(sizeLabel)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {printAreaNote ? (
          <div className="border-t border-[var(--border-soft)] pt-4">
            <div className="ui-panel-muted px-4 py-3.5 text-sm text-[color:var(--text-body)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-[#faf7f2]">
                  i
                </span>
                <div className="space-y-1.5">
                  <p className="ui-overline">
                    {t(dict, "productDetail.printAreaLabel")}
                  </p>
                  <p className="leading-6">
                    <span className="font-semibold text-[color:var(--text-strong)]">
                      {printAreaNote.printSizeLabel}
                    </span>
                    . {t(dict, "productDetail.printAreaNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {phoneModelOptions.length > 0 ? (
          <div className="space-y-2.5 border-t border-[var(--border-soft)] pt-4">
            <label htmlFor="phone-model-select" className={optionGroupLabelClass}>
              {t(dict, "productDetail.phoneModelLabel")}
            </label>
            <div className="relative">
              <select
                id="phone-model-select"
                value={selectedPhoneModelCode ?? ""}
                onChange={(event) => onPhoneModelSelect(event.target.value || null)}
                className="w-full appearance-none rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
              >
                <option value="">{t(dict, "productDetail.phoneModelPlaceholder")}</option>
                {phoneModelGroups.map((group) => (
                  <optgroup key={group.brand} label={group.brand}>
                    {group.options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[color:var(--text-muted)]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                  <path d="M5.5 7.5 10 12l4.5-4.5" />
                </svg>
              </span>
            </div>
          </div>
        ) : null}

        {printSideOptions.length > 0 ? (
          <div className="space-y-2.5 border-t border-[var(--border-soft)] pt-4">
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
                    data-active={isActive}
                    onClick={() => onPrintSideSelect(option.key)}
                    className={getOptionButtonClass()}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isPaintingProduct && materialOptions.length > 0 ? (
          <div className="space-y-2.5 border-t border-[var(--border-soft)] pt-4">
            <h2 className={optionGroupLabelClass}>
              {t(
                dict,
                materialOptions.length > 1
                  ? "productDetail.materialLabel"
                  : "productDetail.materialStaticLabel",
              )}
            </h2>
            <div className="flex flex-wrap gap-3">
              {materialOptions.map((option) => {
                const isActive = selectedMaterialKey === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    data-active={isActive}
                    onClick={() => onMaterialSelect(option.key)}
                    className={getOptionButtonClass()}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {shouldShowMaterialDescription ? (
              <p className="text-sm leading-6 text-[color:var(--text-body)]">{materialDescription}</p>
            ) : null}
            {washableNote ? (
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">{washableNote}</p>
            ) : null}
          </div>
        ) : !isPaintingProduct && (materialLabel || shouldShowMaterialDescription) ? (
          <div className="border-t border-[var(--border-soft)] pt-4">
            <div className="flex flex-col gap-1.5 text-sm text-[color:var(--text-body)]">
              <span className={optionGroupLabelClass}>
                {t(dict, "productDetail.materialStaticLabel")}
              </span>
              {materialDisplayLabel ? (
                <span className="font-medium leading-6 text-[color:var(--text-strong)]">{materialDisplayLabel}</span>
              ) : null}
              {shouldShowMaterialDescription ? (
                <span className="leading-6">{materialDescription}</span>
              ) : null}
              {washableNote ? (
                <span className="leading-6 text-[color:var(--text-muted)]">{washableNote}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isPaintingProduct && styleGroups.length > 0 ? (
          <div className="space-y-2.5 border-t border-[var(--border-soft)] pt-4">
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
                    data-active={isActive}
                    onClick={() => onStyleSelect(group.key)}
                    className={getOptionButtonClass()}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-[var(--border-soft)] pt-5">
          {isPaintingProduct ? (
            <div className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[#f8f5ef] px-4 py-3.5 text-sm leading-6 text-[color:var(--text-body)]">
              {isSoldPainting
                ? t(dict, "productDetail.paintingSoldNotice")
                : hasActivePaintingReservation
                  ? t(dict, "productDetail.paintingTransferReservedNotice")
                  : t(dict, "productDetail.paintingTransferAvailableNotice")}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleAddToCartClick}
            disabled={!canAddToCart}
            className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
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
            ) : isSoldPainting ? (
              t(dict, "productDetail.sold")
            ) : (
              `${t(dict, "productDetail.addToCart")} (${price} ₾)`
            )}
          </button>
          <p
            className={`text-xs text-[color:var(--text-muted)] transition duration-200 ${
              isAdded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
            aria-live="polite"
          >
            {t(dict, "cart.feedback.addedToBasket")}
          </p>
        </div>

        {items.length > 0 ? (
          <div className="space-y-3 border-t border-[var(--border-soft)] pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-overline">
                {t(dict, "productDetail.basketLabel")}
              </h2>
              <Link
                href={`/${lang}/cart`}
                className="text-sm text-[color:var(--text-muted)] underline underline-offset-4"
              >
                {t(dict, "productDetail.viewCart")}
              </Link>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => {
                const displayTitle = getCartDisplayTitle({
                  title: item.title,
                  slug: item.slug,
                  lang,
                });
                const displayProductTypeLabel = getCartDisplayProductTypeLabel({
                  productTypeLabel: item.productTypeLabel,
                  slug: item.slug,
                  lang,
                });

                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 text-sm text-[color:var(--text-body)]"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium text-[color:var(--text-strong)]">{displayTitle}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {displayProductTypeLabel}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {formatCartItemDetails(item)}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium text-[color:var(--text-strong)]">
                      {item.selectedPrice * item.qty} ₾
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-3 text-sm">
              <span className="ui-overline">
                {t(dict, "cart.totalLabel")}
              </span>
              <span className="font-semibold text-[color:var(--text-strong)]">{totalAmount} ₾</span>
            </div>
          </div>
        ) : null}
      </div>
      <CartToast open={isAdded} lang={lang} dict={dict} onClose={hideAddedFeedback} />
    </div>
  );
};
