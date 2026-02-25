"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type TrackOrderViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type LookupResult = {
  order: {
    code: string;
    status: string;
    currency: string;
    subtotal_cents: number;
    total_cents: number;
    created_at: string;
  };
  items: Array<{
    product_slug: string;
    product_kind: string;
    title_en: string;
    title_ka: string;
    image_url: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
    options: Record<string, unknown> | null;
  }>;
};

export const TrackOrderView = ({ lang, dict }: TrackOrderViewProps) => {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedCreatedAt = useMemo(() => {
    if (!result?.order.created_at) return "";
    const date = new Date(result.order.created_at);
    if (Number.isNaN(date.getTime())) {
      return result.order.created_at;
    }
    return new Intl.DateTimeFormat(lang === "ka" ? "ka-GE" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [lang, result?.order.created_at]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, email }),
      });

      if (response.status === 404) {
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      if (!response.ok) {
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      const payload = (await response.json()) as LookupResult;
      if (!payload?.order || !Array.isArray(payload.items)) {
        setErrorMessage(t(dict, "track.notFound"));
        return;
      }

      setResult(payload);
    } catch {
      setErrorMessage(t(dict, "track.notFound"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white p-6">
        <h1 className="text-2xl font-semibold text-black">{t(dict, "track.title")}</h1>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="text-sm font-medium text-black">
            {t(dict, "track.codeLabel")}
            <input
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "track.emailLabel")}
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/40"
          >
            {submitting ? t(dict, "track.submitting") : t(dict, "track.submit")}
          </button>
        </form>
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </div>

      {result ? (
        <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
          <div className="space-y-1 text-sm text-black/70">
            <p>
              <span className="font-semibold text-black">{t(dict, "track.statusLabel")}:</span>{" "}
              {result.order.status}
            </p>
            <p>
              <span className="font-semibold text-black">{t(dict, "track.createdAtLabel")}:</span>{" "}
              {formattedCreatedAt}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-black">{t(dict, "track.itemsTitle")}</h2>
            <div className="mt-3 space-y-2">
              {result.items.map((item, index) => (
                <div
                  key={`${item.product_slug}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2 text-sm"
                >
                  <span className="text-black/70">
                    {(lang === "ka" ? item.title_ka : item.title_en) || item.product_slug} ×{" "}
                    {item.qty}
                  </span>
                  <span className="font-semibold text-black">
                    {formatMoney(item.line_total_cents / 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-black/10 pt-3 text-sm font-semibold text-black">
            <span>{t(dict, "track.totalLabel")}</span>
            <span>{formatMoney(result.order.total_cents / 100)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
