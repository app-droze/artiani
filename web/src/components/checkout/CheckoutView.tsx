"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import { ANALYTICS_CURRENCY, trackAnalyticsEvent } from "@/src/lib/analytics";
import {
  getCartDisplayProductTypeLabel,
  getCartDisplayTitle,
  writeStoredCart,
} from "@/src/lib/cart";
import { validateCartItems } from "@/src/lib/cartValidation";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { isPaintingProductType } from "@/src/lib/paintingReservation";

type CheckoutViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type DeliveryArea = "tbilisi" | "region";

type ConfirmedOrderItem = {
  productId: string;
  slug: string;
  productType: string;
  title: string;
  imageUrl: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  variantLabel: string | null;
};

type CreateOrderResponse = {
  code?: string;
  emailAttempted?: boolean;
  emailSent?: boolean;
  emailDebugReason?: string | null;
  deliveryArea?: DeliveryArea;
  subtotalAmount?: number;
  shippingAmount?: number;
  totalAmount?: number;
  items?: ConfirmedOrderItem[];
};

type SubmitResult = {
  code: string;
  emailSent: boolean;
  items: ConfirmedOrderItem[];
  subtotalAmount: number;
  shippingAmount: number;
  deliveryArea: DeliveryArea;
  totalAmount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    note: string;
  };
};

type CopyField =
  | "orderCode"
  | "amount"
  | "reference"
  | "accountName"
  | "ibanTbc"
  | "ibanBog";

const formatGel = (amount: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ₾`;

const SHIPPING_AMOUNTS: Record<DeliveryArea, number> = {
  tbilisi: 5,
  region: 10,
};
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "artiani.checkout.idempotencyKey";

const ORDER_STATUS_COLORS = {
  awaiting_payment: "#B88A1B",
  paid: "#2F6F4F",
  processing: "#2A5C8A",
  shipped: "#5C4A8A",
  completed: "#1F7A4D",
  cancelled: "#8A2F2F",
  pending: "#888888",
} as const;

export const CheckoutView = ({ lang, dict }: CheckoutViewProps) => {
  const { items, totalAmount, clear } = useCart();
  const checkoutBody = t(dict, "checkout.body").trim();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [removedItemCount, setRemovedItemCount] = useState(0);
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const validationRequestRef = useRef(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  const hasTrackedCheckoutEntryRef = useRef(false);
  const hasTrackedCheckoutConfirmationRef = useRef(false);
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    deliveryArea: "tbilisi" as DeliveryArea,
    address: "",
    note: "",
  });
  const shippingAmount = SHIPPING_AMOUNTS[formState.deliveryArea];
  const grandTotal = totalAmount + shippingAmount;

  const canSubmit = items.length > 0 && !isSubmitting;
  const hasPaintingInCart = items.some((item) => isPaintingProductType(item.productType));
  const summaryItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        displayTitle: getCartDisplayTitle({
          title: item.title,
          slug: item.slug,
          lang,
        }),
        displayProductTypeLabel: getCartDisplayProductTypeLabel({
          productTypeLabel: item.productTypeLabel,
          slug: item.slug,
          lang,
        }),
        lineTotal: item.selectedPrice * item.qty,
      })),
    [items, lang],
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!submitResult) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [submitResult]);

  useEffect(() => {
    if (submitResult || items.length === 0 || hasTrackedCheckoutEntryRef.current) {
      return;
    }

    trackAnalyticsEvent("checkout_step", {
      step: "details",
      lang,
      qty: items.reduce((sum, item) => sum + item.qty, 0),
      price: grandTotal,
      currency: ANALYTICS_CURRENCY,
    });
    hasTrackedCheckoutEntryRef.current = true;
  }, [grandTotal, items, lang, submitResult]);

  useEffect(() => {
    if (!submitResult || hasTrackedCheckoutConfirmationRef.current) {
      return;
    }

    trackAnalyticsEvent("checkout_step", {
      step: "confirmation",
      lang,
      qty: submitResult.items.reduce((sum, item) => sum + item.qty, 0),
      price: submitResult.totalAmount,
      currency: ANALYTICS_CURRENCY,
      order_code: submitResult.code,
    });
    hasTrackedCheckoutConfirmationRef.current = true;
  }, [lang, submitResult]);

  useEffect(() => {
    if (items.length === 0 || submitResult) {
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
      } catch (error) {
        console.warn("[checkout] cart validation failed", {
          itemCount: items.length,
          reason: error instanceof Error ? error.message : "unknown",
        });
        // Keep checkout behavior non-blocking if validation cannot be reached.
      }
    };

    void runValidation();

    return () => {
      cancelled = true;
    };
  }, [items, submitResult]);

  const setCopiedFeedback = (field: CopyField) => {
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    setCopiedField(field);
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
      copyTimeoutRef.current = null;
    }, 1600);
  };

  const handleCopyValue = async (field: CopyField, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedFeedback(field);
    } catch {
      setCopiedField(null);
    }
  };

  const getIdempotencyKey = () => {
    if (idempotencyKeyRef.current) {
      return idempotencyKeyRef.current;
    }

    if (typeof window === "undefined") {
      throw new Error("checkout-idempotency-unavailable");
    }

    const stored = window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    if (stored) {
      idempotencyKeyRef.current = stored;
      return stored;
    }

    const generated =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    window.sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, generated);
    idempotencyKeyRef.current = generated;
    return generated;
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    setIsConfirmOpen(false);
    setSubmitError(null);

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: getIdempotencyKey(),
          lang,
          customer: {
            name: formState.name,
            phone: formState.phone,
            email: formState.email,
            delivery_area: formState.deliveryArea,
            address: formState.address,
            note: formState.note,
          },
          items: items.map((item) => ({
            product_id: item.productId,
            product_slug: item.slug,
            variant_id: item.variantId,
            qty: item.qty,
            material_label: item.selectedMaterialLabel,
            phone_model_code: item.selectedPhoneModelCode,
            print_side: item.selectedPrintSide,
            print_side_label: item.selectedPrintSideLabel,
          })),
        }),
      });

      const payload = (await response.json()) as CreateOrderResponse;
      if (
        !response.ok ||
        !payload.code ||
        !payload.deliveryArea ||
        typeof payload.subtotalAmount !== "number" ||
        typeof payload.shippingAmount !== "number" ||
        typeof payload.totalAmount !== "number" ||
        !Array.isArray(payload.items)
      ) {
        console.error("[checkout] order submission returned invalid confirmation payload", {
          status: response.status,
          itemCount: items.length,
          deliveryArea: formState.deliveryArea,
          hasCode: Boolean(payload.code),
          hasItems: Array.isArray(payload.items),
        });
        throw new Error("create-order-failed");
      }

      clear();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
      }
      idempotencyKeyRef.current = null;
      trackAnalyticsEvent("order_created", {
        order_code: payload.code,
        lang,
        qty: payload.items.reduce((sum, item) => sum + item.qty, 0),
        price: payload.totalAmount,
        currency: ANALYTICS_CURRENCY,
      });
      setSubmitResult({
        code: payload.code,
        emailSent: payload.emailSent !== false,
        items: payload.items,
        subtotalAmount: payload.subtotalAmount,
        shippingAmount: payload.shippingAmount,
        deliveryArea: payload.deliveryArea,
        totalAmount: payload.totalAmount,
        customer: { ...formState },
      });
    } catch (error) {
      console.error("[checkout] order submission failed", {
        itemCount: items.length,
        deliveryArea: formState.deliveryArea,
        reason: error instanceof Error ? error.message : "unknown",
      });
      setSubmitError(t(dict, "checkout.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    setIsConfirmOpen(true);
  };

  if (submitResult) {
    const orderStatus = "awaiting_payment" as const;
    const hasPaintingInSubmittedOrder = submitResult.items.some((item) =>
      isPaintingProductType(item.productType),
    );
    const paymentReference = submitResult.code;
    const formattedTotal = formatGel(submitResult.totalAmount);
    const paymentItems = [
      {
        field: "amount" as const,
        label: t(dict, "checkout.amountLabel"),
        value: formattedTotal,
      },
      {
        field: "reference" as const,
        label: t(dict, "checkout.referenceLabel"),
        value: paymentReference,
      },
      {
        field: "accountName" as const,
        label: t(dict, "checkout.accountNameLabel"),
        value: t(dict, "checkout.accountNameValue"),
      },
      {
        field: "ibanTbc" as const,
        label: t(dict, "checkout.bankTbcLabel"),
        value: t(dict, "checkout.ibanTbcValue"),
      },
      {
        field: "ibanBog" as const,
        label: t(dict, "checkout.bankBogLabel"),
        value: t(dict, "checkout.ibanBogValue"),
      },
    ];

    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-black/8 bg-white/85 px-5 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.04)] sm:px-7 sm:py-7">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
                {t(dict, "checkout.successEyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-[2.4rem]">
                {t(dict, "checkout.successTitle")}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-black/72">
                {submitResult.emailSent
                  ? t(dict, "checkout.successEmailSent")
                  : t(dict, "checkout.successEmailFailed")}
              </p>
              <p className="max-w-3xl text-sm leading-7 text-black/62">
                {t(dict, "checkout.successNext")}
              </p>
              {hasPaintingInSubmittedOrder ? (
                <p className="max-w-3xl text-sm leading-7 text-[#8a5a15]">
                  {t(dict, "checkout.paintingTransferSuccessNotice")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-[#f6f0e5] px-5 py-5 shadow-[0_14px_34px_rgba(72,52,20,0.06)] sm:px-7 sm:py-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/46">
                  {t(dict, "checkout.orderCodeLabel")}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/46">
                  {t(dict, "track.statusLabel")}
                </p>
              </div>
              <span
                className="inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-semibold tracking-[0.04em] text-white"
                style={{ backgroundColor: ORDER_STATUS_COLORS[orderStatus] }}
              >
                {t(dict, `orderStatus.${orderStatus}`)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[1.9rem] font-semibold tracking-tight text-black sm:text-[2.2rem]">
                {submitResult.code}
              </p>
              <button
                type="button"
                onClick={() => handleCopyValue("orderCode", submitResult.code)}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                  copiedField === "orderCode"
                    ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                    : "border-black/12 bg-white/86 text-black hover:bg-white"
                }`}
              >
                {copiedField === "orderCode" ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
            <h2 className="text-base font-semibold text-black sm:text-lg">
              {t(dict, "checkout.nextStepsTitle")}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-black/72">
              <p>{t(dict, "checkout.nextStepsBody")}</p>
              <p>{t(dict, "checkout.afterPaymentBody")}</p>
              {hasPaintingInSubmittedOrder ? (
                <p className="text-[#8a5a15]">{t(dict, "checkout.paintingTransferSuccessNotice")}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-black sm:text-lg">
                {t(dict, "checkout.transferTitle")}
              </h2>
              <p className="text-sm leading-7 text-black/68">{t(dict, "checkout.transferBody")}</p>
            </div>

            <div className="mt-5 grid gap-3">
              {paymentItems.map((entry) => {
                const isCopied = copiedField === entry.field;

                return (
                  <div
                    key={entry.field}
                    className="flex flex-col gap-3 rounded-[1.2rem] border border-black/8 bg-[#faf7f1] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                        {entry.label}
                      </p>
                      <p className="mt-1 break-all text-[15px] font-semibold text-black sm:text-base">
                        {entry.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(entry.field, entry.value)}
                      className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        isCopied
                          ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                          : "border-black/12 bg-white text-black hover:bg-white/90"
                      }`}
                    >
                      {isCopied ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
            <h2 className="text-base font-semibold text-black sm:text-lg">
              {t(dict, "checkout.summaryTitle")}
            </h2>
            <div className="mt-5 space-y-3">
              {submitResult.items.map((item) => {
                const displayTitle = getCartDisplayTitle({
                  title: item.title,
                  slug: item.slug,
                  lang,
                });
                const displayProductTypeLabel = getCartDisplayProductTypeLabel({
                  productTypeLabel:
                    dict[`catalogue.types.${item.productType}`] ?? item.productType,
                  slug: item.slug,
                  lang,
                });

                return (
                  <div
                    key={`${item.productId}:${item.slug}:${item.variantLabel ?? "default"}`}
                    className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-black/6 bg-[#fbf9f5] px-4 py-3.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-black">{displayTitle}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-black/45">
                        {displayProductTypeLabel}
                      </p>
                      <p className="text-xs text-black/58">
                        {t(dict, "cart.qtyLabel")}: {item.qty}
                        {item.productType !== "painting" && item.variantLabel ? ` · ${item.variantLabel}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-black/48">
                        {formatGel(item.unitPrice)} × {item.qty}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-black">
                        {formatGel(item.lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 space-y-2.5 border-t border-black/8 pt-4 text-sm text-black/68">
              <div className="flex items-center justify-between">
                <span>{t(dict, "checkout.subtotalLabel")}</span>
                <span className="font-medium text-black">{formatGel(submitResult.subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  {t(dict, "checkout.deliveryFeeLabel")} ·{" "}
                  {t(dict, `checkout.deliveryArea.${submitResult.deliveryArea}`)}
                </span>
                <span className="font-medium text-black">{formatGel(submitResult.shippingAmount)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4 text-base font-semibold text-black">
              <span>{t(dict, "checkout.totalLabel")}</span>
              <span>{formatGel(submitResult.totalAmount)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/${lang}/track`}
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium !text-white transition-colors hover:bg-black/90"
            >
              {t(dict, "track.linkLabel")}
            </Link>
            <Link
              href={`/${lang}/catalogue`}
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white/72 px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-white"
            >
              {t(dict, "cart.continueShopping")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
        <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            {t(dict, "checkout.title")}
          </h1>
          {removedItemCount > 0 ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#8a5a15]">
              {t(dict, "cart.validationNotice")}
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/66">
            {t(dict, "checkout.emptyBody")}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/${lang}/cart`}
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium !text-white transition-colors hover:bg-black/90"
            >
              {t(dict, "checkout.backToCart")}
            </Link>
            <Link
              href={`/${lang}/catalogue`}
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white/72 px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-white"
            >
              {t(dict, "cart.continueShopping")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
      {isConfirmOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(18,16,14,0.38)] px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-confirm-title"
            className="w-full max-w-[28rem] rounded-[1.5rem] border border-black/8 bg-[rgba(250,247,242,0.98)] p-5 shadow-[0_24px_60px_rgba(18,16,14,0.18)] sm:p-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/42">
                  {t(dict, "checkout.eyebrow")}
                </p>
                <h2 id="checkout-confirm-title" className="text-2xl font-semibold tracking-tight text-black">
                  {t(dict, "checkout.confirmDetailsTitle")}
                </h2>
                <p className="text-sm leading-7 text-black/64">
                  {t(dict, "checkout.confirmDetailsPrompt")}
                </p>
              </div>

              <div className="space-y-2 rounded-[1.1rem] border border-black/8 bg-white/84 px-4 py-4 text-sm leading-7 text-black/76">
                <p>
                  <span className="font-medium text-black">{t(dict, "checkout.nameLabel")}:</span> {formState.name}
                </p>
                <p>
                  <span className="font-medium text-black">{t(dict, "checkout.phoneLabel")}:</span> {formState.phone}
                </p>
                <p>
                  <span className="font-medium text-black">{t(dict, "checkout.emailLabel")}:</span> {formState.email}
                </p>
                <p>
                  <span className="font-medium text-black">{t(dict, "checkout.addressLabel")}:</span> {formState.address}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t(dict, "checkout.confirmDetailsBack")}
                </button>
                <button
                  type="button"
                  onClick={() => void submitOrder()}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t(dict, "checkout.submitting") : t(dict, "checkout.confirmDetailsSubmit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
              {t(dict, "checkout.eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-black">
              {t(dict, "checkout.title")}
            </h1>
            {removedItemCount > 0 ? (
              <p className="max-w-2xl text-sm leading-7 text-[#8a5a15]">
                {t(dict, "cart.validationNotice")}
              </p>
            ) : null}
            {checkoutBody ? (
              <p className="max-w-2xl text-sm leading-7 text-black/66">
                {checkoutBody}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.15rem] border border-black/8 bg-[#f8f5ef] px-4 py-4 text-sm leading-7 text-black/70">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/50">
                {t(dict, "checkout.paymentProcessTitle")}
              </h2>
              <div className="mt-3 space-y-3">
                <p>{t(dict, "checkout.paymentProcessBodyPrimary")}</p>
                <p>{t(dict, "checkout.paymentProcessBodySecondary")}</p>
                {hasPaintingInCart ? (
                  <p className="text-[#8a5a15]">{t(dict, "checkout.paintingTransferCheckoutNotice")}</p>
                ) : null}
              </div>
            </div>

            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.nameLabel")}
              <input
                required
                disabled={isSubmitting}
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-black">
                {t(dict, "checkout.phoneLabel")}
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  pattern="^\+?[\d\s\-()]{7,20}$"
                  title={t(dict, "checkout.phoneHint")}
                  disabled={isSubmitting}
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
                />
              </label>
              <label className="text-sm font-medium text-black">
                {t(dict, "checkout.emailLabel")}
                <input
                  required
                  type="email"
                  disabled={isSubmitting}
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
                />
              </label>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-black">
                {t(dict, "checkout.deliveryAreaLabel")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["tbilisi", "region"] as const).map((area) => (
                  <label
                    key={area}
                    className={`flex cursor-pointer flex-col rounded-[1rem] border px-4 py-3 transition-colors ${
                      formState.deliveryArea === area
                        ? "border-black/24 bg-black/[0.04]"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-area"
                      value={area}
                      checked={formState.deliveryArea === area}
                      onChange={() => setFormState((prev) => ({ ...prev, deliveryArea: area }))}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-black">
                      {t(dict, `checkout.deliveryArea.${area}`)}
                    </span>
                    <span className="mt-1 text-xs text-black/52">
                      {t(dict, "checkout.deliveryFeeLabel")}: {formatGel(SHIPPING_AMOUNTS[area])}
                    </span>
                    <span className="mt-1 text-xs text-black/52">
                      {t(dict, `checkout.deliveryAreaTiming.${area}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.addressLabel")}
              <p className="mt-2 text-sm font-normal leading-6 text-black/58">
                {t(dict, "checkout.deliveryNoteAddress")}
              </p>
              <textarea
                required
                rows={3}
                disabled={isSubmitting}
                value={formState.address}
                onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
              />
            </label>

            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.noteLabel")}
              <textarea
                rows={4}
                disabled={isSubmitting}
                value={formState.note}
                onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
              />
            </label>
          </div>
        </div>

        <aside className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-6 sm:py-7">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-black/8 pb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f6f0e5]">
                <Image
                  src="/brand/sheep-seal.png"
                  alt="Artiani"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
                  Artiani
                </p>
                <p className="text-xs text-black/54">{t(dict, "checkout.summaryTitle")}</p>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-black">
                {t(dict, "checkout.summaryTitle")}
              </h2>
              <p className="text-sm text-black/58">{items.length} {t(dict, "checkout.summaryCount")}</p>
            </div>

            <div className="space-y-3">
              {summaryItems.map((item) => (
                <div key={item.key} className="space-y-1 border-b border-black/6 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-black">{item.displayTitle}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                        {item.displayProductTypeLabel}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-black">
                      {formatGel(item.lineTotal)}
                    </p>
                  </div>

                  <div className="text-xs text-black/56">
                    {t(dict, "cart.qtyLabel")}: {item.qty}
                    {item.productType !== "painting" && item.selectedColorLabel ? ` · ${item.selectedColorLabel}` : ""}
                    {item.selectedPhoneModelLabel ? ` · ${item.selectedPhoneModelLabel}` : ""}
                    {item.selectedMaterialLabel ? ` · ${item.selectedMaterialLabel}` : ""}
                    {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                    {item.selectedPrintSideLabel ? ` · ${item.selectedPrintSideLabel}` : ""}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-black/8 pt-4 text-sm font-semibold text-black">
              <span>{t(dict, "checkout.subtotalLabel")}</span>
              <span>{formatGel(totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-black/66">
              <span>
                {t(dict, "checkout.deliveryFeeLabel")} ·{" "}
                {t(dict, `checkout.deliveryArea.${formState.deliveryArea}`)}
              </span>
              <span>{formatGel(shippingAmount)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-black/8 pt-4 text-sm font-semibold text-black">
              <span>{t(dict, "checkout.totalLabel")}</span>
              <span>{formatGel(grandTotal)}</span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t(dict, "checkout.submitting") : t(dict, "checkout.submit")}
            </button>

            {submitError ? (
              <p className="text-sm text-[#9b1c1c]">{submitError}</p>
            ) : null}

            <p className="text-xs leading-6 text-black/52">
              {t(dict, "checkout.confirmationHint")}
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
};
