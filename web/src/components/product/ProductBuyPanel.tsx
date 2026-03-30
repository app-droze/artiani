"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartToast } from "@/src/components/CartToast";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCartDisplayProductTypeLabel, getCartDisplayTitle } from "@/src/lib/cart";
import { buildCatalogueCategorySectionHref, type CatalogueTheme } from "@/src/lib/catalogueModels";
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
  isScarfProduct: boolean;
  paintingFactSizeLabel: string | null;
  paintingFactMaterialLabel: string | null;
  price: number;
  themes: CatalogueTheme[];
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

const EXPANDABLE_THEME_TEXT_THRESHOLD = 140;
const FLOATING_BAR_SHOW_OFFSET = 180;
const FLOATING_BAR_HIDE_OFFSET = 96;

const ExpandableThemeBody = ({
  theme,
  dict,
}: {
  theme: CatalogueTheme;
  dict: Dictionary;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const entries = [
    theme.shortDescription && !theme.symbolismText
      ? {
          text: theme.shortDescription,
          className: "text-[13px] leading-6 text-[color:var(--text-body)]",
        }
      : null,
    theme.symbolismText
      ? {
          text: theme.symbolismText,
          className: "text-[13px] leading-6 text-[color:var(--text-muted)]",
        }
      : null,
    theme.storyText
      ? {
          text: theme.storyText,
          className: "text-[13px] leading-6 text-[color:var(--text-muted)]",
        }
      : null,
  ].filter((entry): entry is { text: string; className: string } => Boolean(entry));
  const previewText = entries.map((entry) => entry.text.trim()).join(" ");
  const shouldCollapse = previewText.length > EXPANDABLE_THEME_TEXT_THRESHOLD;

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {shouldCollapse && !isExpanded ? (
        <p className="overflow-hidden text-[13px] leading-6 text-[color:var(--text-muted)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:[-webkit-line-clamp:3]">
          {previewText}
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <p key={entry.text} className={entry.className}>
              {entry.text}
            </p>
          ))}
        </div>
      )}
      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-strong)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2.5 4.5 3.5 3 3.5-3" />
          </svg>
          {isExpanded ? t(dict, "productDetail.showLess") : t(dict, "productDetail.readMore")}
        </button>
      ) : null}
    </div>
  );
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
  isScarfProduct,
  paintingFactSizeLabel,
  paintingFactMaterialLabel,
  price,
  themes,
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
  const primaryPurchaseSectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldShowFloatingBar, setShouldShowFloatingBar] = useState(false);
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
  const normalizedMaterialLabel = materialLabel?.trim().toLocaleLowerCase() ?? null;
  const normalizedMaterialDescription = materialDescription?.trim().toLocaleLowerCase() ?? null;
  const shouldShowMaterialDescription =
    Boolean(materialDescription) &&
    (!normalizedMaterialLabel || normalizedMaterialLabel !== normalizedMaterialDescription);
  const materialDisplayLabel =
    materialLabel && isScarfProduct
      ? `${materialLabel} (${t(dict, "productDetail.printSide.oneSided")})`
      : materialLabel;
  const visibleThemes = themes.filter(
    (theme) => theme.name.trim().length > 0 || Boolean(theme.shortDescription),
  );
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
  const selectedStyleLabel =
    styleGroups.find((group) => group.key === selectedStyleKey)?.label ?? null;
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

  useEffect(() => {
    const target = primaryPurchaseSectionRef.current;
    if (!target || typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;
    const updateFloatingBarVisibility = () => {
      const { top } = target.getBoundingClientRect();

      setShouldShowFloatingBar((current) => {
        if (current) {
          return top > FLOATING_BAR_HIDE_OFFSET;
        }

        return top > FLOATING_BAR_SHOW_OFFSET;
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateFloatingBarVisibility();
      });
    };

    updateFloatingBarVisibility();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const handleAddToCartClick = () => {
    if (!canAddToCart) return;

    const didAdd = onAddToCart();

    if (didAdd) {
      showAddedFeedback();
    }
  };

  const renderAddToCartButtonContent = () => {
    if (isAdded) {
      return (
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
      );
    }

    if (isSoldPainting) {
      return t(dict, "productDetail.sold");
    }

    return (
      <>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 3.5h1.8l1.6 8.1h8l1.6-6.1H5.3" />
          <circle cx="8.3" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="13.7" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        {t(dict, "productDetail.addToCart")}
      </>
    );
  };
  const stickyBarSummary = [
    formatSizeLabel(selectedSizeLabel),
    styleGroups.length > 1 ? selectedStyleLabel : null,
    selectedPhoneModelCode
      ? phoneModelOptions.find((option) => option.code === selectedPhoneModelCode)?.label ?? null
      : null,
  ]
    .filter((detail): detail is string => Boolean(detail))
    .join(" · ");
  const primarySelectorCount = [
    availableSizes.length > 0,
    styleGroups.length > 0,
    printSideOptions.length > 0,
    materialOptions.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="lg:sticky lg:top-8">
      <div className="ui-card flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="order-1 space-y-1.5 lg:order-none">
          <div className="space-y-1.5">
            <h1 className="font-display text-[1.875rem] font-bold leading-[1.1] tracking-[-0.022em] text-[color:var(--text-strong)] sm:text-[2.5rem] sm:leading-[1.08]">
              {title}
            </h1>
            <p className="ui-overline">{subtitle}</p>
          </div>
        </div>

        {isPaintingProduct ? (
          <div className="order-5 border-t border-[var(--border-soft)] pt-3 lg:order-none">
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
        ) : availableSizes.length > 0 || styleGroups.length > 0 || printSideOptions.length > 0 || materialOptions.length > 0 ? (
          <div className="order-2 space-y-2.5 border-t border-[var(--border-soft)] pt-3 lg:order-none">
            <div
              className={`grid gap-3 ${
                primarySelectorCount > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {availableSizes.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="size-select" className={optionGroupLabelClass}>
                    {t(dict, "productDetail.sizeSelectorLabel")}
                  </label>
                  {availableSizes.length === 1 ? (
                    <p className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium leading-6 text-[color:var(--text-strong)]">
                      {formatSizeLabel(availableSizes[0])}
                    </p>
                  ) : (
                    <div className="relative">
                      <select
                        id="size-select"
                        value={selectedSizeLabel ?? ""}
                        onChange={(event) => {
                          if (event.target.value) {
                            onSizeSelect(event.target.value);
                          }
                        }}
                        className="w-full appearance-none rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      >
                        <option value="" disabled>
                          {t(dict, "productDetail.sizeSelectorChooseLabel")}
                        </option>
                        {availableSizes.map((sizeLabel) => (
                          <option key={sizeLabel} value={sizeLabel}>
                            {formatSizeLabel(sizeLabel)}
                          </option>
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
                  )}
                </div>
              ) : null}

              {styleGroups.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="style-select" className={optionGroupLabelClass}>
                    {t(dict, "productDetail.variantSelectorLabel")}
                  </label>
                  {styleGroups.length === 1 ? (
                    <p className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium leading-6 text-[color:var(--text-strong)]">
                      {styleGroups[0]?.label}
                    </p>
                  ) : (
                    <div className="relative">
                      <select
                        id="style-select"
                        value={selectedStyleKey}
                        onChange={(event) => {
                          if (event.target.value) {
                            onStyleSelect(event.target.value);
                          }
                        }}
                        className="w-full appearance-none rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      >
                        {styleGroups.map((group) => (
                          <option key={group.key} value={group.key}>
                            {group.label}
                          </option>
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
                  )}
                </div>
              ) : null}

              {printSideOptions.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="print-side-select" className={optionGroupLabelClass}>
                    {t(dict, "productDetail.printSideLabel")}
                  </label>
                  <div className="relative">
                    <select
                      id="print-side-select"
                      value={selectedPrintSide ?? ""}
                      onChange={(event) => {
                        if (event.target.value === "one_sided" || event.target.value === "both_sided") {
                          onPrintSideSelect(event.target.value);
                        }
                      }}
                      className="w-full appearance-none rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    >
                      {printSideOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
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

              {materialOptions.length > 0 ? (
                <div className="space-y-2">
                  <label htmlFor="material-select" className={optionGroupLabelClass}>
                    {t(
                      dict,
                      materialOptions.length > 1
                        ? "productDetail.materialLabel"
                        : "productDetail.materialStaticLabel",
                    )}
                  </label>
                  {materialOptions.length === 1 ? (
                    <p className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium leading-6 text-[color:var(--text-strong)]">
                      {materialOptions[0]?.label}
                    </p>
                  ) : (
                    <div className="relative">
                      <select
                        id="material-select"
                        value={selectedMaterialKey ?? ""}
                        onChange={(event) => {
                          if (event.target.value) {
                            onMaterialSelect(event.target.value);
                          }
                        }}
                        className="w-full appearance-none rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      >
                        {materialOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
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
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {printAreaNote ? (
          <div className="order-3 border-t border-[var(--border-soft)] pt-3 lg:order-none">
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

        <div
          ref={primaryPurchaseSectionRef}
          className={`${isPaintingProduct ? "order-2" : "order-4"} space-y-1.5 border-t border-[var(--border-soft)] pt-3 lg:order-none`}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5">
            <div className="min-w-0 space-y-1">
              <p className="ui-overline">
                {t(dict, "productDetail.priceLabel")}
              </p>
              <p className="text-[2rem] font-semibold tracking-tight text-[color:var(--text-strong)] sm:text-[2.2rem]">
                {price} ₾
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddToCartClick}
                disabled={!canAddToCart}
                className="ui-button-primary min-w-[10.75rem] justify-center px-5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {renderAddToCartButtonContent()}
              </button>
              <Link
                href={`/${lang}/cart`}
                className="block text-center text-xs text-[color:var(--text-muted)] underline underline-offset-4"
              >
                {t(dict, "productDetail.viewCart")}
              </Link>
            </div>
          </div>
          <p
            className={`overflow-hidden text-xs text-[color:var(--text-muted)] transition-all duration-200 ${
              isAdded ? "max-h-5 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
            }`}
            aria-live="polite"
          >
            {t(dict, "cart.feedback.addedToBasket")}
          </p>
          {isPaintingProduct && isSoldPainting ? (
            <div className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[#f8f5ef] px-4 py-3.5 text-sm leading-6 text-[color:var(--text-body)]">
              <p>{t(dict, "productDetail.paintingSoldNotice")}</p>
              <Link
                href={buildCatalogueCategorySectionHref(lang, "works")}
                className="mt-1 inline-flex text-sm font-medium text-[color:var(--text-strong)] underline underline-offset-4"
              >
                {t(dict, "productDetail.seeOtherPaintings")}
              </Link>
            </div>
          ) : null}
        </div>

        {phoneModelOptions.length > 0 ? (
          <div className="order-5 space-y-2.5 border-t border-[var(--border-soft)] pt-3 lg:order-none">
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

        {!isPaintingProduct && (materialLabel || shouldShowMaterialDescription) ? (
          <div className="order-7 border-t border-[var(--border-soft)] pt-3 lg:order-none">
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

        {visibleThemes.length > 0 ? (
          <div className="order-10 space-y-3 border-t border-[var(--border-soft)] pt-3 lg:order-none">
            {visibleThemes.map((theme) => (
              <div key={theme.id} className="space-y-1">
                <p className="text-[0.95rem] font-medium leading-6 text-[color:var(--text-strong)]">
                  {theme.name}
                </p>
                <ExpandableThemeBody theme={theme} dict={dict} />
              </div>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="order-11 space-y-3 border-t border-[var(--border-soft)] pt-3 lg:order-none">
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
      {!isAdded && shouldShowFloatingBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div
            className="mx-auto max-w-6xl px-3 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[rgba(250,247,242,0.96)] px-4 py-3 shadow-[0_-14px_34px_rgba(18,16,14,0.08)] backdrop-blur-md">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0 self-center">
                  {stickyBarSummary ? (
                    <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      {stickyBarSummary}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[1.45rem] font-semibold leading-none tracking-tight text-[color:var(--text-strong)]">
                    {price} ₾
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleAddToCartClick}
                    disabled={!canAddToCart}
                    className="ui-button-primary min-w-[9.75rem] justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {renderAddToCartButtonContent()}
                  </button>
                  <Link
                    href={`/${lang}/cart`}
                    className="block text-center text-[11px] text-[color:var(--text-muted)] underline underline-offset-4"
                  >
                    {t(dict, "productDetail.viewCart")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <CartToast open={isAdded} lang={lang} dict={dict} onClose={hideAddedFeedback} />
    </div>
  );
};
