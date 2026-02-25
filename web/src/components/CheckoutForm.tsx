"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/src/components/CartProvider";
import type { CartItem } from "@/src/lib/cart";
import { formatMoney } from "@/src/lib/money";
import { products, pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type CheckoutFormProps = {
  dict: Dictionary;
  lang: Locale;
};

type CreateOrderResponse = {
  code?: string;
  emailSent?: boolean;
};

type SubmitResult = {
  code: string;
  emailSent: boolean;
  customer: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  items: CartItem[];
  subtotal: number;
};

export const CheckoutForm = ({ dict, lang }: CheckoutFormProps) => {
  const { items, subtotal, clear } = useCart();
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phoneCountry: "+995",
    phoneLocal: "",
    notes: "",
  });

  const totalLine = useMemo(() => formatMoney(subtotal), [subtotal]);
  const separator = t(dict, "ui.separator");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const customerPhone = `${formState.phoneCountry} ${formState.phoneLocal}`.trim();
      const submittedItems = items.map((item) => ({
        ...item,
        options: { ...item.options },
      }));
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lang,
          customer: {
            name: formState.name,
            email: formState.email,
            phone: customerPhone,
            note: formState.notes,
          },
          items: submittedItems.map((item) => ({
            slug: item.slug,
            qty: item.qty,
            options: item.options,
          })),
        }),
      });

      const payload = (await response.json()) as CreateOrderResponse;
      if (!response.ok || !payload.code) {
        throw new Error("create-order-failed");
      }

      clear();
      setSubmitResult({
        code: payload.code,
        emailSent: payload.emailSent !== false,
        customer: {
          name: formState.name,
          email: formState.email,
          phone: customerPhone,
          notes: formState.notes,
        },
        items: submittedItems,
        subtotal,
      });
    } catch {
      setSubmitError(t(dict, "checkout.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8">
        <h1 className="text-2xl font-semibold text-black">
          {t(dict, "checkout.successTitle")}
        </h1>
        <div className="mt-5 rounded-xl border border-dashed border-black/30 bg-slate-50 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-black/50">
            {t(dict, "checkout.orderCodeLabel")}
          </p>
          <p className="mt-2 text-xl font-semibold text-black">{submitResult.code}</p>
        </div>
        <p className="mt-6 text-sm text-black/60">
          {submitResult.emailSent
            ? t(dict, "checkout.successEmailSent")
            : t(dict, "checkout.successEmailFailed")}
        </p>
        <div className="mt-6 space-y-4 rounded-xl border border-black/10 bg-[#f8f6f2] p-4">
          <div className="grid gap-2 text-sm text-black/70 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-black">{t(dict, "checkout.name")}:</span>{" "}
              {submitResult.customer.name}
            </p>
            <p>
              <span className="font-semibold text-black">{t(dict, "checkout.email")}:</span>{" "}
              {submitResult.customer.email}
            </p>
            <p>
              <span className="font-semibold text-black">{t(dict, "checkout.phone")}:</span>{" "}
              {submitResult.customer.phone}
            </p>
            <p>
              <span className="font-semibold text-black">{t(dict, "checkout.notes")}:</span>{" "}
              {submitResult.customer.notes.trim().length > 0
                ? submitResult.customer.notes
                : "-"}
            </p>
          </div>
          <div className="space-y-2 border-t border-black/10 pt-4">
            <h2 className="text-base font-semibold text-black">
              {t(dict, "checkout.summary_title")}
            </h2>
            <div className="space-y-3 text-sm">
              {submitResult.items.map((item) => {
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
              <span>{formatMoney(submitResult.subtotal)}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/${lang}/track`}
          className="mt-6 inline-flex rounded-full border border-black px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
        >
          {t(dict, "track.linkLabel")}
        </Link>
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
                required
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
          disabled={items.length === 0 || isSubmitting}
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/40"
        >
          {isSubmitting ? t(dict, "checkout.submitting") : t(dict, "checkout.submit")}
        </button>
        {submitError ? (
          <p className="text-sm text-red-700">{submitError}</p>
        ) : null}
        <p className="text-xs text-black/40">
          {t(dict, "checkout.confirm_note")}
        </p>
      </aside>
    </form>
  );
};
