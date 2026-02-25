"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import { formatMoney } from "@/src/lib/money";
import { products, pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

const makeOrderCode = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ART-${stamp}-${rand}`;
};

type CheckoutFormProps = {
  dict: Dictionary;
  lang: Locale;
};

export const CheckoutForm = ({ dict, lang }: CheckoutFormProps) => {
  const { items, subtotal, clear } = useCart();
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phoneCountry: "+995",
    phoneLocal: "",
    notes: "",
  });

  const totalLine = useMemo(() => formatMoney(subtotal), [subtotal]);
  const separator = t(dict, "ui.separator");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) return;
    setSubmitted(true);
    setOrderCode(makeOrderCode());
    clear();
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8">
        <h1 className="text-2xl font-semibold text-black">
          {t(dict, "checkout.order_received")}
        </h1>
        <p className="mt-2 text-sm text-black/60">
          {t(dict, "checkout.order_received_subtitle")}
        </p>
        <div className="mt-5 rounded-xl border border-dashed border-black/30 bg-slate-50 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-black/50">
            {t(dict, "checkout.order_code")}
          </p>
          <p className="mt-2 text-xl font-semibold text-black">{orderCode}</p>
        </div>
        <div className="mt-6 space-y-2 text-sm text-black/60">
          <p>
            {t(dict, "checkout.bank_label")}: {t(dict, "checkout.bank_value")}
          </p>
          <p>
            {t(dict, "checkout.iban_label")}: {t(dict, "checkout.iban_value")}
          </p>
          <p>
            {t(dict, "checkout.swift_label")}: {t(dict, "checkout.swift_value")}
          </p>
          <p>
            {t(dict, "checkout.amount_label")}: {totalLine}
          </p>
          <p>
            {t(dict, "checkout.reference_label")}: {orderCode}
          </p>
        </div>
        <p className="mt-6 text-xs text-black/40">
          {t(dict, "checkout.confirmation_note")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
        <h1 className="text-2xl font-semibold text-black">
          {t(dict, "checkout.title")}
        </h1>
        <p className="text-sm text-black/60">
          {t(dict, "checkout.subtitle")}
        </p>
        <div className="grid gap-4">
          <label className="text-sm font-medium text-black">
            {t(dict, "checkout.name")}
            <input
              required
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "checkout.email")}
            <input
              required
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "checkout.phone")}
            <div className="mt-2 flex gap-2">
              <select
                value={formState.phoneCountry}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    phoneCountry: event.target.value,
                  }))
                }
                className="w-28 appearance-none rounded-xl border border-black/10 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b6b6b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat px-2 py-2 pr-8 text-sm"
              >
                <option value="+995">{t(dict, "phone.country_ge")}</option>
                <option value="+1">{t(dict, "phone.country_us")}</option>
                <option value="+44">{t(dict, "phone.country_uk")}</option>
              </select>
              <input
                value={formState.phoneLocal}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    phoneLocal: event.target.value,
                  }))
                }
                className="flex-1 rounded-xl border border-black/10 px-3 py-2"
              />
            </div>
          </label>
          <label className="text-sm font-medium text-black">
            {t(dict, "checkout.notes")}
            <textarea
              rows={4}
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <aside className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold text-black">
          {t(dict, "checkout.summary_title")}
        </h2>
        <div className="space-y-3 text-sm">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const name = product ? pick(product.name, lang) : item.name;
            const specs: string[] = [];
            const hasAddText = Boolean(product?.options.addText);
            const hasSignature = Boolean(product?.options.signature);

            if (hasAddText && item.options.addText) {
              specs.push(t(dict, "cart.option_text_yes"));
            }
            if (hasSignature && item.options.signature) {
              specs.push(t(dict, "cart.option_signature_yes"));
            }
            if (item.options.cardBack) {
              specs.push(
                item.options.cardBack === "postcard"
                  ? t(dict, "product.cards_postcard")
                  : t(dict, "product.cards_greeting"),
              );
            }

            return (
              <div key={item.id} className="flex flex-col gap-1">
                <span className="text-sm text-black/70">
                  {t(dict, `productTypeSingle.${item.type}`)} - {name}
                </span>
                {specs.length > 0 ? (
                  <span className="text-xs text-black/50">{specs.join(separator)}</span>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-black/60">
                    {t(dict, "ui.qty_prefix")}
                    {item.qty}
                  </span>
                  <span className="font-semibold text-black">
                    {formatMoney(item.unitPrice * item.qty)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-black/10 pt-3 text-sm font-semibold">
          <span>{t(dict, "checkout.total")}</span>
          <span>{totalLine}</span>
        </div>
        <button
          type="submit"
          disabled={items.length === 0}
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/40"
        >
          {t(dict, "checkout.confirm")}
        </button>
        <p className="text-xs text-black/40">
          {t(dict, "checkout.confirm_note")}
        </p>
      </aside>
    </form>
  );
};
