"use client";

import { track } from "@vercel/analytics";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { getPaymentBanks, type PaymentBankCode } from "@/src/lib/paymentDetails";
import {
  DEFAULT_PAYMENT_METHOD,
  getPaymentMethodLabelKey,
  isPaymentMethod,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/src/lib/paymentMethod";
import { getOrderStatusColor, isOrderStatus } from "@/src/lib/orderStatus";

type CheckoutViewProps = {
  lang: Locale;
  dict: Dictionary;
  onSubmitted?: (result: CheckoutSubmitResult) => void;
  persistedSubmitResult?: CheckoutSubmitResult | null;
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
  orderStatus?: string;
  paymentMethod?: PaymentMethod;
  emailAttempted?: boolean;
  emailSent?: boolean;
  emailDebugReason?: string | null;
  deliveryArea?: DeliveryArea;
  subtotalAmount?: number;
  shippingAmount?: number;
  totalAmount?: number;
  items?: ConfirmedOrderItem[];
};

export type CheckoutSubmitResult = {
  code: string;
  orderStatus: string;
  paymentMethod: PaymentMethod;
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
  | `recipientName:${PaymentBankCode}`
  | `iban:${PaymentBankCode}`;

const formatGel = (amount: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ₾`;

const SHIPPING_AMOUNTS: Record<DeliveryArea, number> = {
  tbilisi: 5,
  region: 10,
};
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "artiani.checkout.idempotencyKey";

export const CheckoutView = ({ lang, dict, onSubmitted, persistedSubmitResult }: CheckoutViewProps) => {
  const { items, totalAmount, clear } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<CheckoutSubmitResult | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [copiedFields, setCopiedFields] = useState<Partial<Record<CopyField, boolean>>>({});
  const copyTimeoutRef = useRef<Partial<Record<CopyField, number>>>({});
  const validationRequestRef = useRef(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  const hasTrackedCheckoutEntryRef = useRef(false);
  const hasTrackedCheckoutConfirmationRef = useRef(false);
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    deliveryArea: "tbilisi" as DeliveryArea,
    paymentMethod: DEFAULT_PAYMENT_METHOD as PaymentMethod,
    address: "",
    note: "",
  });
  const shippingAmount = SHIPPING_AMOUNTS[formState.deliveryArea];
  const grandTotal = totalAmount + shippingAmount;
  const effectiveSubmitResult = persistedSubmitResult ?? submitResult;

  const canSubmit = items.length > 0 && !isSubmitting;
  const selectedPaymentMethod = formState.paymentMethod;
  const handlePaymentMethodChange = (paymentMethod: PaymentMethod) => {
    setFormState((prev) => {
      if (prev.paymentMethod === paymentMethod) {
        return prev;
      }

      return {
        ...prev,
        paymentMethod,
      };
    });

    if (selectedPaymentMethod === paymentMethod) {
      return;
    }

    trackAnalyticsEvent("payment_method_selected", {
      payment_method: paymentMethod,
      lang,
      qty: items.reduce((sum, item) => sum + item.qty, 0),
      price: grandTotal,
      currency: ANALYTICS_CURRENCY,
    });
    track("Payment Method Selected", {
      paymentMethod,
      lang,
    });
  };

  useEffect(() => {
    const timeoutMap = copyTimeoutRef.current;

    return () => {
      Object.values(timeoutMap).forEach((timeoutId) => {
        if (typeof timeoutId === "number") {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!effectiveSubmitResult) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [effectiveSubmitResult]);

  useEffect(() => {
    if (effectiveSubmitResult || items.length === 0 || hasTrackedCheckoutEntryRef.current) {
      return;
    }

    trackAnalyticsEvent("checkout_step", {
      step: "details",
      lang,
      qty: items.reduce((sum, item) => sum + item.qty, 0),
      price: grandTotal,
      currency: ANALYTICS_CURRENCY,
    });
    track("Begin Checkout");
    hasTrackedCheckoutEntryRef.current = true;
  }, [effectiveSubmitResult, grandTotal, items, lang]);

  useEffect(() => {
    if (!effectiveSubmitResult || hasTrackedCheckoutConfirmationRef.current) {
      return;
    }

    trackAnalyticsEvent("checkout_step", {
      step: "confirmation",
      lang,
      qty: effectiveSubmitResult.items.reduce((sum, item) => sum + item.qty, 0),
      price: effectiveSubmitResult.totalAmount,
      currency: ANALYTICS_CURRENCY,
      order_code: effectiveSubmitResult.code,
    });
    hasTrackedCheckoutConfirmationRef.current = true;
  }, [effectiveSubmitResult, lang]);

  useEffect(() => {
    if (items.length === 0 || effectiveSubmitResult) {
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
          writeStoredCart(result.validItems);
        }
      } catch (error) {
        console.warn("[checkout] cart validation failed", {
          itemCount: items.length,
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    };

    void runValidation();

    return () => {
      cancelled = true;
    };
  }, [effectiveSubmitResult, items]);

  const setCopiedFeedback = (field: CopyField) => {
    const existingTimeout = copyTimeoutRef.current[field];
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
    }

    setCopiedFields((current) => ({
      ...current,
      [field]: true,
    }));
    copyTimeoutRef.current[field] = window.setTimeout(() => {
      setCopiedFields((current) => ({
        ...current,
        [field]: false,
      }));
      delete copyTimeoutRef.current[field];
    }, 1600);
  };

  const handleCopyValue = async (field: CopyField, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedFeedback(field);
    } catch {
      setCopiedFields((current) => ({
        ...current,
        [field]: false,
      }));
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
          paymentMethod: selectedPaymentMethod,
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
      const responsePaymentMethod = payload.paymentMethod;
      if (
        !response.ok ||
        !payload.code ||
        typeof payload.orderStatus !== "string" ||
        !isPaymentMethod(responsePaymentMethod ?? "") ||
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

      const confirmedPaymentMethod = responsePaymentMethod as PaymentMethod;

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
      track("Order Submitted", {
        orderCode: payload.code,
      });

      const nextSubmitResult: CheckoutSubmitResult = {
        code: payload.code,
        orderStatus: payload.orderStatus,
        paymentMethod: confirmedPaymentMethod,
        emailSent: payload.emailSent !== false,
        items: payload.items,
        subtotalAmount: payload.subtotalAmount,
        shippingAmount: payload.shippingAmount,
        deliveryArea: payload.deliveryArea,
        totalAmount: payload.totalAmount,
        customer: {
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          address: formState.address,
          note: formState.note,
        },
      };

      setSubmitResult(nextSubmitResult);
      onSubmitted?.(nextSubmitResult);
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

  if (effectiveSubmitResult) {
    const orderStatus = effectiveSubmitResult.orderStatus;
    const paymentMethod = effectiveSubmitResult.paymentMethod;
    const paymentReference = effectiveSubmitResult.code;
    const formattedTotal = formatGel(effectiveSubmitResult.totalAmount);
    const paymentBanks = getPaymentBanks(lang);
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
                {effectiveSubmitResult.emailSent
                  ? t(dict, "checkout.successEmailSent")
                  : t(dict, "checkout.successEmailFailed")}
              </p>
              <p className="max-w-3xl text-sm leading-7 text-black/62">
                {t(
                  dict,
                  paymentMethod === "bank_transfer"
                    ? "checkout.successNextTransfer"
                    : "checkout.successNextCashOnDelivery",
                )}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-[#f6f0e5] px-5 py-5 shadow-[0_14px_34px_rgba(72,52,20,0.06)] sm:px-7 sm:py-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/46">
                  {t(dict, "checkout.orderCodeLabel")}
                </p>
              </div>
              <span
                className="inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-semibold tracking-[0.04em] text-white"
                style={{ backgroundColor: getOrderStatusColor(orderStatus) }}
              >
                {isOrderStatus(orderStatus) ? t(dict, `orderStatus.${orderStatus}`) : orderStatus}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[1.9rem] font-semibold tracking-tight text-black sm:text-[2.2rem]">
                  {effectiveSubmitResult.code}
                </p>
                <p className="mt-2 text-sm text-black/62">
                  <span className="font-medium text-black">{t(dict, "checkout.paymentMethodLabel")}:</span>{" "}
                  {t(dict, getPaymentMethodLabelKey(paymentMethod))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyValue("orderCode", effectiveSubmitResult.code)}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                  copiedFields.orderCode
                    ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                    : "border-black/12 bg-white/86 text-black hover:bg-white"
                }`}
              >
                {copiedFields.orderCode ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
            <h2 className="text-base font-semibold text-black sm:text-lg">
              {t(dict, "checkout.nextStepsTitle")}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-black/72">
              <p>
                {t(
                  dict,
                  paymentMethod === "bank_transfer"
                    ? "checkout.nextStepsBodyTransfer"
                    : "checkout.nextStepsBodyCashOnDelivery",
                )}
              </p>
              <p>
                {t(
                  dict,
                  paymentMethod === "bank_transfer"
                    ? "checkout.afterPaymentBodyTransfer"
                    : "checkout.afterPaymentBodyCashOnDelivery",
                )}
              </p>
            </div>
          </div>

          {paymentMethod === "bank_transfer" ? (
            <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-black sm:text-lg">
                  {t(dict, "checkout.transferTitle")}
                </h2>
                <p className="text-sm leading-7 text-black/68">{t(dict, "checkout.transferBody")}</p>
              </div>

              <div className="mt-5 grid gap-3">
                {paymentItems.map((entry) => {
                  const isCopied = Boolean(copiedFields[entry.field]);

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

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {paymentBanks.map((bank) => {
                  const recipientField = `recipientName:${bank.code}` as const;
                  const ibanField = `iban:${bank.code}` as const;
                  const isRecipientCopied = Boolean(copiedFields[recipientField]);
                  const isIbanCopied = Boolean(copiedFields[ibanField]);

                  return (
                    <div
                      key={bank.code}
                      className="rounded-[1.2rem] border border-black/8 bg-[#faf7f1] px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] ${
                            bank.code === "tbc" ? "bg-[#00ADEE]" : "bg-[#171411]"
                          }`}
                        >
                          <Image
                            src={bank.logoPath}
                            alt={bank.name}
                            width={24}
                            height={24}
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                        <p className="text-sm font-semibold text-black">{bank.name}</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-black/8 bg-white/72 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                              {t(dict, "checkout.accountNameLabel")}
                            </p>
                            <p className="mt-1 break-words text-[15px] font-semibold text-black">
                              {bank.recipientName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyValue(recipientField, bank.recipientName)}
                            className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                              isRecipientCopied
                                ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                                : "border-black/12 bg-white text-black hover:bg-white/90"
                            }`}
                          >
                            {isRecipientCopied ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
                          </button>
                        </div>
                        <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-black/8 bg-white/72 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                              {t(dict, bank.code === "tbc" ? "checkout.bankTbcLabel" : "checkout.bankBogLabel")}
                            </p>
                            <p className="mt-1 break-all text-[15px] font-semibold text-black">
                              {bank.iban}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyValue(ibanField, bank.iban)}
                            className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                              isIbanCopied
                                ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                                : "border-black/12 bg-white text-black hover:bg-white/90"
                            }`}
                          >
                            {isIbanCopied ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-black/8 bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.04)] sm:px-7 sm:py-6">
            <h2 className="text-base font-semibold text-black sm:text-lg">
              {t(dict, "checkout.summaryTitle")}
            </h2>
            <div className="mt-5 space-y-3">
              {effectiveSubmitResult.items.map((item) => {
                const displayTitle = getCartDisplayTitle({
                  title: item.title,
                  slug: item.slug,
                  lang,
                });
                const displayProductTypeLabel = getCartDisplayProductTypeLabel({
                  productTypeLabel: dict[`catalogue.types.${item.productType}`] ?? item.productType,
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
                <span className="font-medium text-black">{formatGel(effectiveSubmitResult.subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  {t(dict, "checkout.deliveryFeeLabel")} ·{" "}
                  {t(dict, `checkout.deliveryArea.${effectiveSubmitResult.deliveryArea}`)}
                </span>
                <span className="font-medium text-black">{formatGel(effectiveSubmitResult.shippingAmount)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4 text-base font-semibold text-black">
              <span>{t(dict, "checkout.totalLabel")}</span>
              <span>{formatGel(effectiveSubmitResult.totalAmount)}</span>
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
    return null;
  }

  return (
    <section className="space-y-4" id="cart-order-details">
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
                  <span className="font-medium text-black">{t(dict, "checkout.paymentMethodLabel")}:</span>{" "}
                  {t(dict, getPaymentMethodLabelKey(selectedPaymentMethod))}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[1.5rem] bg-white/82 px-5 py-5 sm:px-6 sm:py-6">
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-black">
              {t(dict, "checkout.paymentMethodLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentMethod === method;

                return (
                  <label
                    key={method}
                    className={`flex cursor-pointer flex-col rounded-[1rem] border px-3 py-3 transition-colors sm:px-3.5 ${
                      isSelected
                        ? "border-black/24 bg-black/[0.04]"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={method}
                      checked={isSelected}
                      onChange={() => handlePaymentMethodChange(method)}
                      className="sr-only"
                    />
                    <span className="text-[13px] font-medium leading-5 text-black sm:text-sm">
                      {t(dict, getPaymentMethodLabelKey(method))}
                    </span>
                    <span className="mt-1 text-xs leading-5 text-black/48">
                      {t(dict, `checkout.paymentMethodDescription.${method}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-4 space-y-2.5">
            <legend className="text-sm font-medium text-black">
              {t(dict, "checkout.deliveryAreaLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(["tbilisi", "region"] as const).map((area) => (
                <label
                  key={area}
                  className={`flex cursor-pointer flex-col rounded-[1rem] border px-3 py-3 transition-colors sm:px-3.5 ${
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
                  <span className="text-[13px] font-medium leading-5 text-black sm:text-sm">
                    {t(dict, `checkout.deliveryArea.${area}`)}
                  </span>
                  <span className="mt-1 text-xs leading-5 text-black/48">
                    {formatGel(SHIPPING_AMOUNTS[area])} · {t(dict, `checkout.deliveryAreaTiming.${area}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.phoneLabel")}
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                pattern="^\\+?[\\d\\s\\-()]{7,20}$"
                title={t(dict, "checkout.phoneHint")}
                disabled={isSubmitting}
                value={formState.phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
              />
            </label>
          </div>

          <label className="mt-3 block text-sm font-medium text-black/72">
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

          <label className="mt-4 block text-sm font-medium text-black">
            {t(dict, "checkout.addressLabel")}
            <p className="mt-1 text-xs leading-5 text-black/48">
              {t(dict, "checkout.deliveryNoteAddressCompact")}
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

          <div className="mt-4 rounded-[1rem] border border-black/8 bg-[#f8f5ef] px-4 py-3">
            <button
              type="button"
              onClick={() => setIsNoteOpen((current) => !current)}
              className="inline-flex items-center gap-2 text-sm font-medium text-black"
            >
              <span>{t(dict, "checkout.noteToggle")}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                className={`h-3 w-3 transition-transform ${isNoteOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m2.5 4.5 3.5 3 3.5-3" />
              </svg>
            </button>
            {isNoteOpen ? (
              <label className="mt-3 block text-sm font-medium text-black">
                {t(dict, "checkout.noteLabel")}
                <textarea
                  rows={4}
                  disabled={isSubmitting}
                  value={formState.note}
                  onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                  className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white/82 px-5 py-4 sm:px-6">
          <div className="space-y-2.5 border-b border-black/8 pb-4 text-sm text-black/68">
            <div className="flex items-center justify-between gap-4 text-black/62">
              <span className="font-semibold uppercase tracking-[0.14em] text-black/48">
                {t(dict, "checkout.summaryTitle")}
              </span>
              <span>
                {items.length} {t(dict, "checkout.summaryCount")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t(dict, "checkout.subtotalLabel")}</span>
              <span className="font-medium text-black">{formatGel(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>
                {t(dict, "checkout.deliveryFeeLabel")} · {t(dict, `checkout.deliveryArea.${formState.deliveryArea}`)}
              </span>
              <span className="font-medium text-black">{formatGel(shippingAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-base font-semibold text-black">
              <span>{t(dict, "checkout.totalLabel")}</span>
              <span>{formatGel(grandTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t(dict, "checkout.submitting") : t(dict, "checkout.submit")}
          </button>

          {submitError ? (
            <p className="mt-3 text-sm text-[#9b1c1c]">{submitError}</p>
          ) : null}

          <p className="mt-3 text-xs leading-5 text-black/48">
            {t(dict, "checkout.confirmationHintCompact")}
          </p>
        </div>
      </form>
    </section>
  );
};
