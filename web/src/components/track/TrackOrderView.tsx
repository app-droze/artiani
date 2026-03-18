"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type TrackOrderViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type LookupResponse = {
  orders?: Array<{
    code: string;
    status: string;
    currency: string;
    address: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_note: string | null;
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

const formatGelCents = (amountCents: number) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountCents / 100)} ₾`;

const getProductKindLabel = (dict: Dictionary, kind: string) =>
  dict[`catalogue.types.${kind}`] ?? kind;

export const TrackOrderView = ({ lang, dict }: TrackOrderViewProps) => {
  const [formState, setFormState] = useState({ code: "", contact: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<NonNullable<LookupResponse["orders"]>>([]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ka" ? "ka-GE" : lang === "ru" ? "ru-RU" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [lang],
  );

  const formatCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? createdAt : dateFormatter.format(date);
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
      if (!response.ok || !payload.orders || payload.orders.length === 0) {
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      setResults(payload.orders);
    } catch {
      setErrorMessage(t(dict, "track.notFound"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
      <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
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
              className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "track.contactLabel")}
            <input
              required
              disabled={isSubmitting}
              value={formState.contact}
              onChange={(event) => setFormState((prev) => ({ ...prev, contact: event.target.value }))}
              className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
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
          {results.map((result) => (
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
                  {result.status}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.createdAtLabel")}:</span>{" "}
                  {formatCreatedAt(result.created_at)}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "track.totalLabel")}:</span>{" "}
                  {formatGelCents(result.total_cents)}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <h2 className="text-lg font-semibold tracking-tight text-black">
                  {t(dict, "track.itemsTitle")}
                </h2>

                <div className="space-y-3">
                  {result.items.map((item, index) => (
                    <div
                      key={`${result.code}-${item.product_slug}-${index}`}
                      className="flex items-start justify-between gap-4 border-b border-black/6 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-black">
                          {lang === "ka" ? item.title_ka : item.title_en}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-black/45">
                          {getProductKindLabel(dict, item.product_kind)}
                        </p>
                        <p className="text-xs text-black/56">
                          {t(dict, "cart.qtyLabel")}: {item.qty}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-black">
                        {formatGelCents(item.line_total_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};
