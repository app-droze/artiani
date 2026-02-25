"use client";

import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import Link from "next/link";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { formatMoney } from "@/src/lib/money";
import { Chip } from "@/src/components/ui/Chip";

type ProductPurchasePanelProps = {
  product: Product;
  lang: Locale;
  dict: Dictionary;
  typeLabel: string;
  price: number;
  hasSignature: boolean;
  signature: boolean;
  selectedBack: "postcard" | "greeting";
  cartQty: number;
  onSignatureChange: (value: boolean) => void;
  onSelectBack: (value: "postcard" | "greeting") => void;
  onAddToCart: () => void;
  auction?: Product["paintings"] extends infer T
    ? T extends { auction: infer A }
      ? A
      : never
    : never;
  showBidForm: boolean;
  setShowBidForm: Dispatch<SetStateAction<boolean>>;
  bidForm: {
    name: string;
    email: string;
    phoneCountry: string;
    phoneLocal: string;
    amount: string;
    note: string;
  };
  setBidForm: Dispatch<
    SetStateAction<{
      name: string;
      email: string;
      phoneCountry: string;
      phoneLocal: string;
      amount: string;
      note: string;
    }>
  >;
  isBidSubmitting: boolean;
  bidSubmitError: string | null;
  onBidSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  formatAuctionDate: (iso?: string) => string | null;
};

export const ProductPurchasePanel = ({
  product,
  lang,
  dict,
  typeLabel,
  price,
  hasSignature,
  signature,
  selectedBack,
  cartQty,
  onSignatureChange,
  onSelectBack,
  onAddToCart,
  auction,
  showBidForm,
  setShowBidForm,
  bidForm,
  setBidForm,
  isBidSubmitting,
  bidSubmitError,
  onBidSubmit,
  formatAuctionDate,
}: ProductPurchasePanelProps) => {
  const [highlightPanel, setHighlightPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuction = product.kind === "paintings" && Boolean(auction);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  const pulsePanel = () => {
    setHighlightPanel(true);
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = setTimeout(() => setHighlightPanel(false), 700);
  };

  const scrollToPanel = () => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    pulsePanel();
  };

  const mobilePrimaryAction = () => {
    if (isAuction) {
      setShowBidForm(true);
      scrollToPanel();
      return;
    }
    onAddToCart();
  };

  return (
    <>
      <aside
        id="purchase-panel"
        ref={panelRef}
        className={`space-y-5 rounded-2xl border border-black/10 bg-white/95 p-5 transition lg:sticky lg:top-24 ${
          highlightPanel ? "ring-2 ring-black/20" : ""
        }`}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
            <span className="rounded-full border border-black/10 px-2.5 py-1">
              {typeLabel}
            </span>
            {isAuction ? (
              <span className="rounded-full border border-black/15 bg-[#f3e6d6] px-2.5 py-1 text-black/70">
                {t(dict, "auction.badge")}
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            {pick(product.name, lang)}
          </h1>
          <p className="text-sm text-black/60">{pick(product.summary, lang)}</p>
        </div>

        {!isAuction ? (
          <>
            <p className="text-lg font-medium text-black/80">{formatMoney(price)}</p>
            <div className="space-y-3 rounded-2xl bg-[#fbfaf7] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
                {t(dict, "product.personalization_title")}
              </h2>

              {product.kind === "cards" ? (
                <div className="space-y-2 border-t border-black/10 pt-3">
                  <p className="text-xs font-medium text-black/60">{t(dict, "product.cards_back")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      onClick={() => onSelectBack("postcard")}
                      active={selectedBack === "postcard"}
                      baseClassName="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]"
                      activeClassName="border-black bg-black text-white"
                      inactiveClassName="border-black/10 text-black/60"
                    >
                      {t(dict, "product.cards_postcard")}
                    </Chip>
                    <Chip
                      onClick={() => onSelectBack("greeting")}
                      active={selectedBack === "greeting"}
                      baseClassName="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]"
                      activeClassName="border-black bg-black text-white"
                      inactiveClassName="border-black/10 text-black/60"
                    >
                      {t(dict, "product.cards_greeting")}
                    </Chip>
                  </div>
                </div>
              ) : null}

              {hasSignature ? (
                <div className="border-t border-black/10 pt-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={signature}
                      onChange={(event) => onSignatureChange(event.target.checked)}
                      suppressHydrationWarning
                      className="h-4 w-4"
                    />
                    <span className="font-medium text-black">
                      {t(dict, "product.option_signature")}
                    </span>
                  </label>
                </div>
              ) : null}

              {!hasSignature && product.kind !== "cards" ? (
                <p className="border-t border-black/10 pt-3 text-sm text-black/50">{t(dict, "product.no_options")}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={onAddToCart}
                className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
              >
                {t(dict, "product.add_to_cart")}
              </button>
              <Link
                href={`/${lang}/cart`}
                className="block w-full rounded-full border border-black px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-black hover:text-white"
              >
                {t(dict, "product.view_cart")}
              </Link>
            </div>
          </>
        ) : auction ? (
          <div className="space-y-4 rounded-2xl bg-[#fbfaf7] p-4">
            <div className="space-y-2 text-sm text-black/70">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                {t(dict, "auction.title")}
              </p>
              <div className="flex items-center justify-between">
                <span>{t(dict, "auction.min_bid")}</span>
                <span className="font-semibold text-black">{formatMoney(auction.minBidGEL)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t(dict, "auction.bid_count")}</span>
                <span className="font-semibold text-black">{auction.bidCount}</span>
              </div>
              {auction.endsAtISO ? (
                <div className="flex items-center justify-between">
                  <span>{t(dict, "auction.ends_at")}</span>
                  <span className="text-black">{formatAuctionDate(auction.endsAtISO)}</span>
                </div>
              ) : null}
              {typeof auction.depositGEL === "number" ? (
                <div className="flex items-center justify-between">
                  <span>{t(dict, "auction.deposit")}</span>
                  <span className="font-semibold text-black">
                    {formatMoney(auction.depositGEL)}
                  </span>
                </div>
              ) : null}
            </div>

            <p className="text-sm text-black/60">{t(dict, "auction.rules")}</p>
            {!showBidForm ? (
              <button
                type="button"
                disabled={isBidSubmitting}
                onClick={() => setShowBidForm(true)}
                className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/40"
              >
                {t(dict, "auction.place_bid")}
              </button>
            ) : null}

            {showBidForm ? (
              <form onSubmit={onBidSubmit} className="space-y-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-black/70">{t(dict, "auction.form.name")}</span>
                  <input
                    disabled={isBidSubmitting}
                    type="text"
                    value={bidForm.name}
                    onChange={(event) =>
                      setBidForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="rounded-xl border border-black/10 px-3 py-2"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-black/70">{t(dict, "auction.emailLabel")}</span>
                  <input
                    disabled={isBidSubmitting}
                    type="email"
                    value={bidForm.email}
                    onChange={(event) =>
                      setBidForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="rounded-xl border border-black/10 px-3 py-2"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-black/70">{t(dict, "auction.form.phone")}</span>
                  <div className="flex gap-2">
                    <select
                      disabled={isBidSubmitting}
                      value={bidForm.phoneCountry}
                      onChange={(event) =>
                        setBidForm((prev) => ({
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
                      disabled={isBidSubmitting}
                      type="tel"
                      value={bidForm.phoneLocal}
                      onChange={(event) =>
                        setBidForm((prev) => ({
                          ...prev,
                          phoneLocal: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-xl border border-black/10 px-3 py-2"
                      required
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-black/70">{t(dict, "auction.form.amount")}</span>
                  <input
                    disabled={isBidSubmitting}
                    type="number"
                    step="0.01"
                    max={2000111}
                    min={auction.minBidGEL}
                    value={bidForm.amount}
                    onChange={(event) =>
                      setBidForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    className="rounded-xl border border-black/10 px-3 py-2"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-black/70">{t(dict, "auction.form.note")}</span>
                  <textarea
                    disabled={isBidSubmitting}
                    value={bidForm.note}
                    onChange={(event) =>
                      setBidForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    className="min-h-[96px] rounded-xl border border-black/10 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isBidSubmitting}
                  className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/40"
                >
                  {isBidSubmitting ? t(dict, "auction.submitting") : t(dict, "auction.submit")}
                </button>
                {bidSubmitError ? <p className="text-sm text-red-700">{bidSubmitError}</p> : null}
              </form>
            ) : null}
          </div>
        ) : null}

        {cartQty > 0 ? (
          <p className="text-sm text-black/60">
            {t(dict, "product.inCart")}:{" "}
            <span className="font-semibold text-black">{cartQty}</span>{" "}
            <Link href={`/${lang}/cart`} className="underline underline-offset-4">
              {t(dict, "product.view_cart")}
            </Link>
          </p>
        ) : null}
      </aside>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#f8f6f2]/95 p-3 backdrop-blur md:hidden ${
          isAuction && showBidForm ? "hidden" : ""
        }`}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          {!isAuction ? (
            <span className="min-w-fit text-sm font-semibold text-black">{formatMoney(price)}</span>
          ) : null}
          <button
            type="button"
            onClick={mobilePrimaryAction}
            className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            {isAuction ? t(dict, "auction.place_bid") : t(dict, "product.add_to_cart")}
          </button>
        </div>
      </div>
    </>
  );
};
