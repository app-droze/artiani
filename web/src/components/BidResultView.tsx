"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { products } from "@/src/data/products";
import { formatMoney } from "@/src/lib/money";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type BidResultViewProps = {
  lang: Locale;
  dict: Dictionary;
};

export const BidResultView = ({ lang, dict }: BidResultViewProps) => {
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";
  const emailSent = searchParams.get("emailSent") !== "0";
  const productSlug = searchParams.get("slug")?.trim() ?? "";
  const amountRaw = Number(searchParams.get("amount"));
  const hasAmount = Number.isFinite(amountRaw) && amountRaw > 0;
  const painting = products.find(
    (item) => item.slug === productSlug && item.kind === "paintings",
  );

  if (!code) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8">
        <p className="text-sm text-red-700">{t(dict, "auction.resultMissing")}</p>
        <Link
          href={`/${lang}/catalogue`}
          className="mt-5 inline-flex rounded-full border border-black px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
        >
          {t(dict, "product.back_to_catalogue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-8">
      <h1 className="text-2xl font-semibold text-black">{t(dict, "auction.successTitle")}</h1>
      <div className="mt-5 rounded-xl border border-dashed border-black/30 bg-slate-50 p-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-black/50">
          {t(dict, "auction.bidCodeLabel")}
        </p>
        <p className="mt-2 text-xl font-semibold text-black">{code}</p>
      </div>
      <p className="mt-6 text-sm text-black/60">
        {emailSent
          ? t(dict, "auction.successEmailSent")
          : t(dict, "auction.successEmailFailed")}
      </p>
      {painting || productSlug || hasAmount ? (
        <div className="mt-6 space-y-2 rounded-xl border border-black/10 bg-[#f8f6f2] p-4 text-sm text-black/70">
          {painting || productSlug ? (
            <p>
              <span className="font-semibold text-black">
                {t(dict, "auction.resultPaintingLabel")}:
              </span>{" "}
              {painting ? (lang === "ka" ? painting.name.ka : painting.name.en) : productSlug}
            </p>
          ) : null}
          {hasAmount ? (
            <p>
              <span className="font-semibold text-black">
                {t(dict, "auction.resultAmountLabel")}:
              </span>{" "}
              {formatMoney(amountRaw)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3 rounded-xl border border-black/10 bg-[#f8f6f2] p-4 text-sm text-black/70">
        <h2 className="text-base font-semibold text-black">
          {t(dict, "checkout.transfer_title")}
        </h2>
        <p>{t(dict, "auction.confirm_note")}</p>
        <p>
          <span className="font-semibold text-black">{t(dict, "checkout.reference_label")}:</span>{" "}
          {code}
        </p>
        <p>
          <span className="font-semibold text-black">
            {t(dict, "checkout.account_name_label")}:
          </span>{" "}
          {t(dict, "checkout.account_name_value")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="font-semibold text-black">{t(dict, "checkout.bank_tbc_label")}</p>
            <p className="mt-1 text-xs text-black/60">
              <span className="font-semibold text-black">{t(dict, "checkout.iban_label")}:</span>{" "}
              {t(dict, "checkout.iban_tbc_value")}
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="font-semibold text-black">{t(dict, "checkout.bank_bog_label")}</p>
            <p className="mt-1 text-xs text-black/60">
              <span className="font-semibold text-black">{t(dict, "checkout.iban_label")}:</span>{" "}
              {t(dict, "checkout.iban_bog_value")}
            </p>
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
};
