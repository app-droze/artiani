"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartToast } from "@/src/components/CartToast";
import { useCart } from "@/src/components/CartProvider";
import { useAddToCartFeedback } from "@/src/components/useAddToCartFeedback";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCartDisplayProductTypeLabel, getCartDisplayTitle } from "@/src/lib/cart";
import type { CatalogueAuctionEvent, CatalogueTheme } from "@/src/lib/catalogueModels";
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
  themes: CatalogueTheme[];
  auctionEvent: CatalogueAuctionEvent | null;
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

type AuctionBidApiResponse = {
  success: boolean;
  code?: string;
  currentEffectiveBid?: number | null;
  auctionEndTime?: string | null;
  minimumNextValidBid?: number | null;
};

type AuctionStatusApiResponse = {
  success: boolean;
  code?: string;
  auctionEvent?: {
    id: string;
    status: string;
    currentEffectiveBid: number;
    minimumNextValidBid: number;
    auctionEndTime: string;
  } | null;
};

const EXPANDABLE_THEME_TEXT_THRESHOLD = 140;
const TBILISI_UTC_OFFSET_HOURS = 4;
const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const KA_MONTHS_SHORT = [
  "იან.",
  "თებ.",
  "მარ.",
  "აპრ.",
  "მაი.",
  "ივნ.",
  "ივლ.",
  "აგვ.",
  "სექ.",
  "ოქტ.",
  "ნოე.",
  "დეკ.",
] as const;

const padTwoDigits = (value: number) => String(value).padStart(2, "0");

const formatAuctionDate = (value: string, lang: Locale) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const shiftedDate = new Date(date.getTime() + TBILISI_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const day = shiftedDate.getUTCDate();
  const monthIndex = shiftedDate.getUTCMonth();
  const year = shiftedDate.getUTCFullYear();
  const hours = padTwoDigits(shiftedDate.getUTCHours());
  const minutes = padTwoDigits(shiftedDate.getUTCMinutes());

  if (lang === "ka") {
    return `${day} ${KA_MONTHS_SHORT[monthIndex]} ${year}, ${hours}:${minutes}`;
  }

  return `${EN_MONTHS_SHORT[monthIndex]} ${day}, ${year}, ${hours}:${minutes}`;
};

const getAuctionCountdownMs = (value: string) => {
  const endTime = new Date(value).getTime();

  if (Number.isNaN(endTime)) {
    return 0;
  }

  return Math.max(0, endTime - Date.now());
};

const formatAuctionCountdown = ({
  remainingMs,
  dict,
}: {
  remainingMs: number;
  dict: Dictionary;
}) => {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  const timePortion = `${padTwoDigits(hours)}:${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;

  if (days > 0) {
    return `${days}${t(dict, "productDetail.auctionCountdownDaysSuffix")} ${timePortion}`;
  }

  return timePortion;
};

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
  hasActivePaintingReservation,
  isScarfProduct,
  paintingFactSizeLabel,
  paintingFactMaterialLabel,
  price,
  themes,
  auctionEvent,
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
  const [auctionState, setAuctionState] = useState<{
    status: string;
    currentEffectiveBid: number;
    auctionEndTime: string;
    minimumNextValidBid: number;
  } | null>(
    auctionEvent
      ? {
          status: auctionEvent.status,
          currentEffectiveBid: auctionEvent.currentEffectiveBid,
          auctionEndTime: auctionEvent.endsAt,
          minimumNextValidBid: auctionEvent.minimumNextValidBid,
        }
      : null,
  );
  const [bidFormState, setBidFormState] = useState({
    email: "",
    orderCode: "",
    bidAmount: auctionEvent ? String(auctionEvent.minimumNextValidBid) : "",
  });
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [bidFeedbackCode, setBidFeedbackCode] = useState<string | null>(null);
  const [auctionCountdownMs, setAuctionCountdownMs] = useState<number | null>(null);
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
  const visibleThemes = themes.filter(
    (theme) => theme.name.trim().length > 0 || Boolean(theme.shortDescription),
  );
  const getAuctionStatusLabel = (status: string) => {
    const key = `productDetail.auctionStatus.${status}` as const;
    return dict[key] ?? status;
  };
  const getAuctionBidMessage = (code: string) => {
    const key = `productDetail.auctionBidMessage.${code}` as const;
    return dict[key] ?? t(dict, "productDetail.auctionBidMessage.temporary_error");
  };
  const getAuctionBidAmountValidationMessage = (minimumNextValidBid: number) => {
    if (bidFormState.bidAmount.trim().length === 0) {
      return t(dict, "productDetail.auctionBidAmountValidation.required");
    }

    if (!Number.isFinite(bidAmountNumber) || bidAmountNumber <= 0) {
      return t(dict, "productDetail.auctionBidAmountValidation.invalid");
    }

    if (bidAmountNumber < minimumNextValidBid) {
      return `${t(dict, "productDetail.auctionBidAmountValidation.minimumPrefix")} ${minimumNextValidBid} ₾.`;
    }

    return null;
  };
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

  useEffect(() => {
    if (!auctionEvent) {
      setAuctionState(null);
      setAuctionCountdownMs(null);
      setBidFormState((current) => ({
        ...current,
        bidAmount: "",
      }));
      setBidFeedbackCode(null);
      return;
    }

    setAuctionState({
      status: auctionEvent.status,
      currentEffectiveBid: auctionEvent.currentEffectiveBid,
      auctionEndTime: auctionEvent.endsAt,
      minimumNextValidBid: auctionEvent.minimumNextValidBid,
    });
    setBidFormState((current) => ({
      ...current,
      bidAmount: String(auctionEvent.minimumNextValidBid),
    }));
    setAuctionCountdownMs(auctionEvent.status === "live" ? getAuctionCountdownMs(auctionEvent.endsAt) : null);
    setBidFeedbackCode(null);
  }, [auctionEvent]);

  useEffect(() => {
    const activeAuctionStatus = auctionState?.status ?? auctionEvent?.status;

    if (!auctionEvent || activeAuctionStatus !== "live") {
      setAuctionCountdownMs(null);
      return;
    }

    const activeAuctionEndTime = auctionState?.auctionEndTime ?? auctionEvent.endsAt;
    const updateCountdown = () => {
      setAuctionCountdownMs(getAuctionCountdownMs(activeAuctionEndTime));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [auctionEvent, auctionState?.auctionEndTime, auctionState?.status]);

  useEffect(() => {
    const activeAuctionStatus = auctionState?.status ?? auctionEvent?.status;

    if (!auctionEvent || activeAuctionStatus !== "live") {
      return;
    }

    let isActive = true;

    const pollAuctionStatus = async () => {
      try {
        const response = await fetch(
          `/api/auction/status?auctionEventId=${encodeURIComponent(auctionEvent.id)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as AuctionStatusApiResponse;

        if (!isActive || !result.success || !result.auctionEvent) {
          return;
        }

        const nextAuctionEvent = result.auctionEvent;

        setAuctionState((current) => {
          if (
            current &&
            current.status === nextAuctionEvent.status &&
            current.currentEffectiveBid === nextAuctionEvent.currentEffectiveBid &&
            current.auctionEndTime === nextAuctionEvent.auctionEndTime &&
            current.minimumNextValidBid === nextAuctionEvent.minimumNextValidBid
          ) {
            return current;
          }

          return {
            status: nextAuctionEvent.status,
            currentEffectiveBid: nextAuctionEvent.currentEffectiveBid,
            auctionEndTime: nextAuctionEvent.auctionEndTime,
            minimumNextValidBid: nextAuctionEvent.minimumNextValidBid,
          };
        });
        setBidFormState((current) => {
          const currentBidAmount = Number(current.bidAmount);

          if (
            Number.isFinite(currentBidAmount) &&
            currentBidAmount >= nextAuctionEvent.minimumNextValidBid
          ) {
            return current;
          }

          return {
            ...current,
            bidAmount: String(nextAuctionEvent.minimumNextValidBid),
          };
        });
      } catch {
        return;
      }
    };

    const intervalId = window.setInterval(pollAuctionStatus, 15_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [auctionEvent, auctionState?.status]);

  const updateBidFormState = (
    field: "email" | "orderCode" | "bidAmount",
    value: string,
  ) => {
    setBidFormState((current) => ({
      ...current,
      [field]: value,
    }));

    if (bidFeedbackCode === "success") {
      setBidFeedbackCode(null);
    }
  };

  const handleAddToCartClick = () => {
    if (!canAddToCart) return;

    const didAdd = onAddToCart();

    if (didAdd) {
      showAddedFeedback();
    }
  };

  const handleAuctionBidSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const activeAuctionStatus = auctionState?.status ?? auctionEvent?.status;
    const auctionHasEnded =
      !auctionEvent ||
      activeAuctionStatus !== "live" ||
      getAuctionCountdownMs(auctionState?.auctionEndTime ?? auctionEvent.endsAt) <= 0;

    if (auctionHasEnded || isSubmittingBid) {
      setBidFeedbackCode(auctionHasEnded ? "auction_ended" : null);
      return;
    }

    setIsSubmittingBid(true);
    setBidFeedbackCode(null);

    try {
      const response = await fetch("/api/auction/bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionEventId: auctionEvent.id,
          orderCode: bidFormState.orderCode,
          email: bidFormState.email,
          bidAmount: Number(bidFormState.bidAmount),
          lang,
        }),
      });

      const result = (await response.json()) as AuctionBidApiResponse;

      if (typeof result.currentEffectiveBid === "number" && typeof result.minimumNextValidBid === "number" && typeof result.auctionEndTime === "string") {
        setAuctionState({
          status: auctionState?.status ?? auctionEvent.status,
          currentEffectiveBid: result.currentEffectiveBid,
          auctionEndTime: result.auctionEndTime,
          minimumNextValidBid: result.minimumNextValidBid,
        });
      }

      if (result.success) {
        setBidFeedbackCode("success");
        if (typeof result.minimumNextValidBid === "number") {
          setBidFormState((current) => ({
            ...current,
            bidAmount: String(result.minimumNextValidBid),
          }));
        }
        return;
      }

      const failureCode = result.code ?? "temporary_error";
      setBidFeedbackCode(failureCode);
      if (typeof result.minimumNextValidBid === "number") {
        setBidFormState((current) => ({
          ...current,
          bidAmount: String(result.minimumNextValidBid),
        }));
      }
    } catch {
      setBidFeedbackCode("temporary_error");
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const bidAmountNumber = Number(bidFormState.bidAmount);
  const minimumNextValidBid =
    auctionState?.minimumNextValidBid ??
    (auctionEvent ? auctionEvent.minimumNextValidBid : 0);
  const activeAuctionStatus = auctionState?.status ?? auctionEvent?.status ?? null;
  const isAuctionClientEnded =
    activeAuctionStatus === "live" &&
    auctionCountdownMs !== null &&
    auctionCountdownMs <= 0;
  const isAuctionLiveForDisplay =
    activeAuctionStatus === "live" && !isAuctionClientEnded;
  const bidAmountValidationMessage =
    isAuctionLiveForDisplay
      ? getAuctionBidAmountValidationMessage(minimumNextValidBid)
      : null;
  const canSubmitBid =
    isAuctionLiveForDisplay &&
    bidFormState.email.trim().length > 0 &&
    bidFormState.orderCode.trim().length > 0 &&
    !bidAmountValidationMessage &&
    !isSubmittingBid;
  const auctionContent = auctionEvent ? (
    <div className="ui-panel-muted space-y-3 px-4 py-4 text-sm text-[color:var(--text-body)]">
      <div className="flex items-center justify-between gap-3">
        <p className="ui-overline">
          {t(dict, "productDetail.auctionLabel")}
        </p>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-strong)]">
          {isAuctionClientEnded
            ? t(dict, "productDetail.auctionStatus.ended")
            : getAuctionStatusLabel(activeAuctionStatus ?? auctionEvent.status)}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
            {t(dict, "productDetail.auctionCurrentBidLabel")}
          </span>
          <span className="font-medium leading-6 text-[color:var(--text-strong)]">
            {auctionState?.currentEffectiveBid ?? auctionEvent.currentEffectiveBid} ₾
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
            {t(dict, "productDetail.auctionMinimumIncrementLabel")}
          </span>
          <span className="font-medium leading-6 text-[color:var(--text-strong)]">
            {auctionEvent.minimumIncrement} ₾
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
            {t(dict, "productDetail.auctionMinimumNextBidLabel")}
          </span>
          <span className="font-medium leading-6 text-[color:var(--text-strong)]">
            {auctionState?.minimumNextValidBid ?? auctionEvent.minimumNextValidBid} ₾
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
            {t(dict, "productDetail.auctionEndTimeLabel")}
          </span>
          <span className="text-right font-medium leading-6 text-[color:var(--text-strong)]">
            {formatAuctionDate(auctionState?.auctionEndTime ?? auctionEvent.endsAt, lang)}
          </span>
        </div>
        {activeAuctionStatus === "live" ? (
          <div className="flex items-start justify-between gap-4">
            <span className="text-[13px] leading-6 text-[color:var(--text-muted)]">
              {t(dict, "productDetail.auctionCountdownLabel")}
            </span>
            <span className="text-right font-medium leading-6 text-[color:var(--text-strong)]" suppressHydrationWarning>
              {auctionCountdownMs !== null
                ? isAuctionClientEnded
                  ? t(dict, "productDetail.auctionCountdownEnded")
                  : formatAuctionCountdown({ remainingMs: auctionCountdownMs, dict })
                : "—"}
            </span>
          </div>
        ) : null}
      </div>
      <p className="text-[13px] leading-6 text-[color:var(--text-muted)]">
        {t(dict, "productDetail.auctionEligibilityNote")}
      </p>
      {isAuctionLiveForDisplay ? (
        <p className="text-[13px] leading-6 text-[color:var(--text-muted)]">
          {t(dict, "productDetail.auctionExtensionNote")}
        </p>
      ) : null}
      {isAuctionLiveForDisplay ? (
        <form className="space-y-3 border-t border-[var(--border-soft)] pt-3" onSubmit={handleAuctionBidSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="auction-email" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
              {t(dict, "productDetail.auctionBidEmailLabel")}
            </label>
            <input
              id="auction-email"
              type="email"
              autoComplete="email"
              value={bidFormState.email}
              onChange={(event) => updateBidFormState("email", event.target.value)}
              className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="auction-order-code" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
              {t(dict, "productDetail.auctionBidOrderCodeLabel")}
            </label>
            <input
              id="auction-order-code"
              type="text"
              autoCapitalize="characters"
              value={bidFormState.orderCode}
              onChange={(event) => updateBidFormState("orderCode", event.target.value.toUpperCase())}
              className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="auction-bid-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
              {t(dict, "productDetail.auctionBidAmountLabel")}
            </label>
            <input
              id="auction-bid-amount"
              type="number"
              inputMode="decimal"
              min={minimumNextValidBid}
              step="1"
              value={bidFormState.bidAmount}
              onChange={(event) => updateBidFormState("bidAmount", event.target.value)}
              className={`w-full rounded-[1rem] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20 ${
                bidAmountValidationMessage
                  ? "border border-[#b35a5a]/60"
                  : "border border-[var(--border-soft)]"
              }`}
            />
            {bidAmountValidationMessage ? (
              <p className="text-xs leading-5 text-[#8a2f2f]">
                {bidAmountValidationMessage}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!canSubmitBid}
            className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmittingBid ? t(dict, "productDetail.auctionBidSubmitting") : t(dict, "productDetail.auctionBidSubmit")}
          </button>
          {bidFeedbackCode ? (
            <p
              className={`text-sm leading-6 ${
                bidFeedbackCode === "success"
                  ? "text-[#2f6f4f]"
                  : "text-[#8a2f2f]"
              }`}
              aria-live="polite"
            >
              {bidFeedbackCode === "success"
                ? t(dict, "productDetail.auctionBidMessage.success")
                : getAuctionBidMessage(bidFeedbackCode)}
            </p>
          ) : null}
        </form>
      ) : activeAuctionStatus === "live" ? (
        <div className="border-t border-[var(--border-soft)] pt-3">
          <p className="text-sm leading-6 text-[color:var(--text-muted)]">
            {t(dict, "productDetail.auctionBidMessage.auction_ended")}
          </p>
        </div>
      ) : null}
    </div>
  ) : null;

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

          {visibleThemes.length > 0 ? (
            <div className="space-y-3 border-t border-[var(--border-soft)] pt-3">
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

          {!auctionEvent ? (
            <div className="space-y-1 border-t border-[var(--border-soft)] pt-3">
              <p className="ui-overline">
                {t(dict, "productDetail.priceLabel")}
              </p>
              <p className="text-[2rem] font-semibold tracking-tight text-[color:var(--text-strong)] sm:text-[2.2rem]">
                {price} ₾
              </p>
            </div>
          ) : null}
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

        {auctionContent ? (
          <div className="border-t border-[var(--border-soft)] pt-4">
            {auctionContent}
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

        {!auctionEvent ? (
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
        ) : null}

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
