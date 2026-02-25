"use client";

import { useMemo, useState } from "react";
import { products } from "@/src/data/products";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type TrackOrderViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type LookupResult = {
  orders: Array<{
    code: string;
    status: string;
    currency: string;
    subtotal_cents: number;
    total_cents: number;
    created_at: string;
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
  }>;
  bids: Array<{
    code: string;
    status: string;
    product_slug: string;
    bid_amount_cents: number;
    note: string | null;
    created_at: string;
  }>;
};

export const TrackOrderView = ({ lang, dict }: TrackOrderViewProps) => {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (Number.isNaN(date.getTime())) {
      return createdAt;
    }
    return dateFormatter.format(date);
  };

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
      if (
        !payload ||
        !Array.isArray(payload.orders) ||
        !Array.isArray(payload.bids)
      ) {
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
              disabled={submitting}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "track.emailLabel")}
            <input
              disabled={submitting}
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
        <div className="space-y-4">
          {result.bids.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold text-black">
                {t(dict, "track.bidsTitle")}
              </h2>
              {result.bids.map((bid) => {
                const painting = products.find(
                  (item) => item.slug === bid.product_slug && item.kind === "paintings",
                );

                return (
                  <div
                    key={bid.code}
                    className="space-y-4 rounded-2xl border border-black/10 bg-white p-6"
                  >
                    <div className="space-y-1 text-sm text-black/70">
                      <p>
                        <span className="font-semibold text-black">
                          {t(dict, "auction.bidCodeLabel")}:
                        </span>{" "}
                        {bid.code}
                      </p>
                      <p>
                        <span className="font-semibold text-black">
                          {t(dict, "auction.resultPaintingLabel")}:
                        </span>{" "}
                        {painting
                          ? (lang === "ka" ? painting.name.ka : painting.name.en)
                          : bid.product_slug}
                      </p>
                      <p>
                        <span className="font-semibold text-black">
                          {t(dict, "auction.resultAmountLabel")}:
                        </span>{" "}
                        {formatMoney(bid.bid_amount_cents / 100)}
                      </p>
                      <p>
                        <span className="font-semibold text-black">
                          {t(dict, "track.statusLabel")}:
                        </span>{" "}
                        {bid.status}
                      </p>
                      <p>
                        <span className="font-semibold text-black">
                          {t(dict, "track.createdAtLabel")}:
                        </span>{" "}
                        {formatCreatedAt(bid.created_at)}
                      </p>
                      {bid.note ? (
                        <p>
                          <span className="font-semibold text-black">
                            {t(dict, "checkout.notes")}:
                          </span>{" "}
                          {bid.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}

          {result.orders.length > 0 ? (
            <>
              <h2 className="pt-2 text-lg font-semibold text-black">
                {t(dict, "track.ordersTitle")}
              </h2>
              {result.orders.map((order) => (
                <div
                  key={order.code}
                  className="space-y-4 rounded-2xl border border-black/10 bg-white p-6"
                >
                  <div className="space-y-1 text-sm text-black/70">
                    <p>
                      <span className="font-semibold text-black">
                        {t(dict, "checkout.orderCodeLabel")}:
                      </span>{" "}
                      {order.code}
                    </p>
                    <p>
                      <span className="font-semibold text-black">{t(dict, "track.statusLabel")}:</span>{" "}
                      {order.status}
                    </p>
                    <p>
                      <span className="font-semibold text-black">
                        {t(dict, "track.createdAtLabel")}:
                      </span>{" "}
                      {formatCreatedAt(order.created_at)}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-black">{t(dict, "track.itemsTitle")}</h2>
                    <div className="mt-3 space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={`${order.code}-${item.product_slug}-${index}`}
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
                    <span>{formatMoney(order.total_cents / 100)}</span>
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
