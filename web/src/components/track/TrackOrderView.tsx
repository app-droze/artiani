"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ContactHelpBlock } from "@/src/components/ContactHelpBlock";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCartDisplayTitle } from "@/src/lib/cart";
import { getPaymentBanks, type PaymentBankCode } from "@/src/lib/paymentDetails";
import { DEFAULT_PAYMENT_METHOD, isPaymentMethod, type PaymentMethod } from "@/src/lib/paymentMethod";
import { isPaintingProductType } from "@/src/lib/paintingReservation";

type TrackOrderViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type LookupResponse = {
  message?: string;
  orders?: Array<{
    code: string;
    status: string;
    paymentMethod?: PaymentMethod;
    subtotal_cents: number;
    total_cents: number;
    created_at: string;
    items: Array<{
      product_slug: string;
      product_kind: string;
      title_en: string;
      title_ka: string;
      image_url: string | null;
      qty: number;
      unit_price_cents: number;
      line_total_cents: number;
      options: Record<string, unknown> | null;
    }>;
  }>;
};

const ORDER_STATUS_COLORS = {
  awaiting_payment: "#B88A1B",
  paid: "#2F6F4F",
  processing: "#2A5C8A",
  shipped: "#5C4A8A",
  completed: "#1F7A4D",
  cancelled: "#8A2F2F",
  pending: "#888888",
} as const;

type SupportedOrderStatus = keyof typeof ORDER_STATUS_COLORS;

type CopyField =
  | "reference"
  | `recipientName:${PaymentBankCode}`
  | `iban:${PaymentBankCode}`;

const formatGelCents = (amountCents: number) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountCents / 100)} ₾`;

const getProductKindLabel = (dict: Dictionary, kind: string) =>
  dict[`catalogue.types.${kind}`] ?? kind;

const isSupportedOrderStatus = (status: string): status is SupportedOrderStatus =>
  status in ORDER_STATUS_COLORS;

const getOrderStatusLabel = (dict: Dictionary, status: string) =>
  isSupportedOrderStatus(status) ? t(dict, `orderStatus.${status}`) : status;

const getOrderStatusColor = (status: string) =>
  isSupportedOrderStatus(status) ? ORDER_STATUS_COLORS[status] : "#888888";

export const TrackOrderView = ({ lang, dict }: TrackOrderViewProps) => {
  const paymentBanks = getPaymentBanks(lang);
  const [formState, setFormState] = useState({ code: "", contact: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<NonNullable<LookupResponse["orders"]>>([]);
  const [copiedFields, setCopiedFields] = useState<Partial<Record<CopyField, boolean>>>({});
  const copyTimeoutRef = useRef<Partial<Record<CopyField, number>>>({});

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ka" ? "ka-GE" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [lang],
  );

  const formatCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? createdAt : dateFormatter.format(date);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResults([]);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (response.status === 404) {
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      const payload = (await response.json()) as LookupResponse;
      if (!response.ok) {
        console.error("[track] order lookup failed", {
          status: response.status,
          hasCode: formState.code.trim().length > 0,
          contactLength: formState.contact.trim().length,
        });
        setErrorMessage(t(dict, "track.errorGeneric"));
        return;
      }

      if (!payload.orders || payload.orders.length === 0) {
        console.warn("[track] order lookup returned no orders after successful response", {
          hasCode: formState.code.trim().length > 0,
          contactLength: formState.contact.trim().length,
        });
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      setResults(payload.orders);
    } catch (error) {
      console.error("[track] order lookup request failed", {
        hasCode: formState.code.trim().length > 0,
        contactLength: formState.contact.trim().length,
        reason: error instanceof Error ? error.message : "unknown",
      });
      setErrorMessage(t(dict, "track.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
      <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
        <div className="mb-5 flex items-center gap-3 border-b border-black/8 pb-4">
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
            <p className="text-xs text-black/54">{t(dict, "track.title")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
            {t(dict, "track.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            {t(dict, "track.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-black/66">
            {t(dict, "track.body")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-medium text-black">
            {t(dict, "track.codeLabel")}
            <input
              required
              disabled={isSubmitting}
              value={formState.code}
              onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
              className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "track.contactLabel")}
            <input
              required
              disabled={isSubmitting}
              value={formState.contact}
              onChange={(event) => setFormState((prev) => ({ ...prev, contact: event.target.value }))}
              className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-base text-black outline-none transition-colors focus:border-black/30 sm:text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t(dict, "track.submitting") : t(dict, "track.submit")}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 text-sm text-[#9b1c1c]">{errorMessage}</p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => {
            const deliveryCents = Math.max(0, result.total_cents - result.subtotal_cents);
            const paymentMethod = isPaymentMethod(result.paymentMethod ?? "")
              ? result.paymentMethod
              : DEFAULT_PAYMENT_METHOD;
            const isAwaitingPayment =
              result.status === "awaiting_payment" && paymentMethod === "bank_transfer";
            const isPaintingAwaitingPayment =
              isAwaitingPayment &&
              result.items.some((item) => isPaintingProductType(item.product_kind));

            return (
              <div
                key={result.code}
                className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7"
              >
              <div className="grid gap-3 border-b border-black/8 pb-5 text-sm text-black/68 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.codeLabel")}:</span>{" "}
                  {result.code}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.statusLabel")}:</span>{" "}
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.04em] text-white"
                    style={{ backgroundColor: getOrderStatusColor(result.status) }}
                  >
                    {getOrderStatusLabel(dict, result.status)}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.createdAtLabel")}:</span>{" "}
                  {formatCreatedAt(result.created_at)}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.totalLabel")}:</span>{" "}
                  {formatGelCents(result.total_cents)}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.paymentMethodLabel")}:</span>{" "}
                  {t(dict, `paymentMethod.${paymentMethod}`)}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {isPaintingAwaitingPayment ? (
                  <div className="rounded-[1.15rem] border border-[#d6b46a] bg-[#fbf3df] px-4 py-3.5 text-sm leading-6 text-[#6b4d16]">
                    {t(dict, "track.paintingAwaitingPaymentNotice")}
                  </div>
                ) : null}
                {paymentMethod === "cash_on_delivery" ? (
                  <div className="rounded-[1.15rem] border border-black/6 bg-[#fbf9f5] px-4 py-3.5 text-sm leading-6 text-black/72">
                    {t(dict, "track.cashOnDeliveryNotice")}
                  </div>
                ) : null}
                <h2 className="text-lg font-semibold tracking-tight text-black">
                  {t(dict, "track.itemsTitle")}
                </h2>

                <div className="space-y-3">
                  {result.items.map((item, index) => (
                    (() => {
                      const displayTitle = getCartDisplayTitle({
                        title: lang === "ka" ? item.title_ka : item.title_en,
                        slug: item.product_slug,
                        lang,
                      });

                      return (
                        <div
                          key={`${result.code}-${item.product_slug}-${index}`}
                          className="flex items-start justify-between gap-4 border-b border-black/6 pb-3 last:border-b-0 last:pb-0"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-black">{displayTitle}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-black/45">
                              {getProductKindLabel(dict, item.product_kind)}
                            </p>
                            <p className="text-xs text-black/56">
                              {t(dict, "cart.qtyLabel")}: {item.qty}
                              {item.product_kind !== "painting" &&
                              typeof item.options?.variant_summary === "string" &&
                              item.options.variant_summary
                                ? ` · ${item.options.variant_summary}`
                                : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-medium text-black">
                            {formatGelCents(item.line_total_cents)}
                          </p>
                        </div>
                      );
                    })()
                  ))}
                </div>

                <div className="rounded-[1.15rem] border border-black/6 bg-[#fbf9f5] px-4 py-3.5">
                  <div className="flex items-center justify-between text-sm text-black/66">
                    <span>{t(dict, "checkout.subtotalLabel")}</span>
                    <span>{formatGelCents(result.subtotal_cents)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-black/66">
                    <span>{t(dict, "checkout.deliveryFeeLabel")}</span>
                    <span>{formatGelCents(deliveryCents)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-black/8 pt-3 text-sm font-semibold text-black">
                    <span>{t(dict, "checkout.totalLabel")}</span>
                    <span>{formatGelCents(result.total_cents)}</span>
                  </div>
                </div>

                {isAwaitingPayment ? (
                  <div className="rounded-[1.15rem] border border-black/6 bg-[#fbf9f5] px-4 py-3.5">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-black">
                        {t(dict, "checkout.transferTitle")}
                      </h3>
                      <p className="text-sm leading-6 text-black/66">
                        {t(dict, "checkout.transferBody")}
                      </p>
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-black/8 bg-white/72 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                            {t(dict, "checkout.referenceLabel")}
                          </p>
                          <p className="mt-1 break-all text-[15px] font-semibold text-black">
                            {result.code}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyValue("reference", result.code)}
                          className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            copiedFields.reference
                              ? "border-[#2D7A46] bg-[#2D7A46] text-white"
                              : "border-black/12 bg-white text-black hover:bg-white/90"
                          }`}
                        >
                          {copiedFields.reference ? t(dict, "checkout.copied") : t(dict, "checkout.copy")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {paymentBanks.map((bank) => {
                        const recipientField = `recipientName:${bank.code}` as const;
                        const ibanField = `iban:${bank.code}` as const;
                        const isRecipientCopied = Boolean(copiedFields[recipientField]);
                        const isIbanCopied = Boolean(copiedFields[ibanField]);

                        return (
                          <div
                            key={`${result.code}-${bank.code}`}
                            className="rounded-[1rem] border border-black/8 bg-white/72 px-3 py-3"
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
                              <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-black/8 bg-[#faf7f1] px-3 py-3">
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

                              <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-black/8 bg-[#faf7f1] px-3 py-3">
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
              </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ContactHelpBlock dict={dict} />
    </section>
  );
};
