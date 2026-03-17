"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/src/components/CartProvider";
import type { CartItem } from "@/src/lib/cart";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type CheckoutViewProps = {
  lang: Locale;
  dict: Dictionary;
};

type DeliveryArea = "tbilisi" | "region";

type CreateOrderResponse = {
  code?: string;
  emailSent?: boolean;
};

type SubmitResult = {
  code: string;
  emailSent: boolean;
  items: CartItem[];
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

const formatGel = (amount: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ₾`;

const SHIPPING_AMOUNTS: Record<DeliveryArea, number> = {
  tbilisi: 5,
  region: 10,
};

export const CheckoutView = ({ lang, dict }: CheckoutViewProps) => {
  const { items, totalAmount, clear } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
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
  const summaryItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        lineTotal: item.selectedPrice * item.qty,
      })),
    [items],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
          })),
        }),
      });

      const payload = (await response.json()) as CreateOrderResponse;
      if (!response.ok || !payload.code) {
        throw new Error("create-order-failed");
      }

      const submittedItems = [...items];
      const submittedSubtotal = totalAmount;
      const submittedShipping = shippingAmount;
      const submittedTotal = grandTotal;

      clear();
      setSubmitResult({
        code: payload.code,
        emailSent: payload.emailSent !== false,
        items: submittedItems,
        subtotalAmount: submittedSubtotal,
        shippingAmount: submittedShipping,
        deliveryArea: formState.deliveryArea,
        totalAmount: submittedTotal,
        customer: { ...formState },
      });
    } catch {
      setSubmitError(t(dict, "checkout.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 md:py-8">
        <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
                {t(dict, "checkout.successEyebrow")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-black">
                {t(dict, "checkout.successTitle")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-black/66">
                {submitResult.emailSent
                  ? t(dict, "checkout.successEmailSent")
                  : t(dict, "checkout.successEmailFailed")}
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-black/10 bg-black/[0.03] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                {t(dict, "checkout.orderCodeLabel")}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {submitResult.code}
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-black/10 bg-[#f8f6f2] px-5 py-5 text-sm text-black/70">
              <h2 className="text-base font-semibold text-black">
                {t(dict, "checkout.transferTitle")}
              </h2>
              <p className="mt-2 leading-6">{t(dict, "checkout.transferBody")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-black">{t(dict, "checkout.amountLabel")}:</span>{" "}
                  {formatGel(submitResult.totalAmount)}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "checkout.referenceLabel")}:</span>{" "}
                  {submitResult.code}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-black">{t(dict, "checkout.accountNameLabel")}:</span>{" "}
                  {t(dict, "checkout.accountNameValue")}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "checkout.bankTbcLabel")}:</span>{" "}
                  {t(dict, "checkout.ibanTbcValue")}
                </p>
                <p>
                  <span className="font-semibold text-black">{t(dict, "checkout.bankBogLabel")}:</span>{" "}
                  {t(dict, "checkout.ibanBogValue")}
                </p>
              </div>
              <p className="mt-4 text-xs leading-6 text-black/58">
                {t(dict, "checkout.transferNote")}
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-black/10 bg-white px-5 py-5">
              <h2 className="text-base font-semibold text-black">
                {t(dict, "checkout.summaryTitle")}
              </h2>
              <div className="mt-4 space-y-3">
                {submitResult.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 border-b border-black/6 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-black">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/45">
                        {item.productTypeLabel}
                      </p>
                    </div>
                    <div className="text-right text-sm text-black/70">
                      <p>
                        {t(dict, "cart.qtyLabel")}: {item.qty}
                      </p>
                      <p className="font-medium text-black">
                        {formatGel(item.selectedPrice * item.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-black/8 pt-4 text-sm text-black/68">
                <div className="flex items-center justify-between">
                  <span>{t(dict, "checkout.subtotalLabel")}</span>
                  <span>{formatGel(submitResult.subtotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    {t(dict, "checkout.deliveryFeeLabel")} ·{" "}
                    {t(dict, `checkout.deliveryArea.${submitResult.deliveryArea}`)}
                  </span>
                  <span>{formatGel(submitResult.shippingAmount)}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4 text-sm font-semibold text-black">
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
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
              {t(dict, "checkout.eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-black">
              {t(dict, "checkout.title")}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-black/66">
              {t(dict, "checkout.body")}
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.nameLabel")}
              <input
                required
                disabled={isSubmitting}
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
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
                  className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
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
                  className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
                />
              </label>
            </div>

            <div className="rounded-[1rem] border border-black/8 bg-black/[0.025] px-4 py-4 text-sm leading-6 text-black/58">
              <p>{t(dict, "checkout.deliveryNoteAddress")}</p>
              <p className="mt-2">{t(dict, "checkout.deliveryNoteTiming")}</p>
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
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.addressLabel")}
              <textarea
                required
                rows={3}
                disabled={isSubmitting}
                value={formState.address}
                onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
              />
            </label>

            <label className="text-sm font-medium text-black">
              {t(dict, "checkout.noteLabel")}
              <textarea
                rows={4}
                disabled={isSubmitting}
                value={formState.note}
                onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                className="mt-2 w-full rounded-[1rem] border border-black/10 bg-white px-3.5 py-3 text-sm text-black outline-none transition-colors focus:border-black/30"
              />
            </label>
          </div>
        </div>

        <aside className="rounded-[1.75rem] bg-white/80 px-5 py-6 sm:px-6 sm:py-7">
          <div className="space-y-4">
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
                      <p className="text-sm font-medium text-black">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                        {item.productTypeLabel}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-black">
                      {formatGel(item.lineTotal)}
                    </p>
                  </div>

                  <div className="text-xs text-black/56">
                    {t(dict, "cart.qtyLabel")}: {item.qty}
                    {item.selectedColorLabel ? ` · ${item.selectedColorLabel}` : ""}
                    {item.selectedSize ? ` · ${item.selectedSize}` : ""}
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
