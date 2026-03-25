"use client";

import Link from "next/link";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type CartToastProps = {
  open: boolean;
  lang: Locale;
  dict: Dictionary;
  onClose: () => void;
};

export const CartToast = ({ open, lang, dict, onClose }: CartToastProps) => (
  <div
    className={`fixed inset-x-4 bottom-4 z-[80] transition duration-200 sm:left-auto sm:right-6 sm:w-[26rem] ${
      open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
    }`}
    aria-live="polite"
  >
    <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[rgba(250,247,242,0.96)] p-4 shadow-[0_18px_40px_rgba(18,16,14,0.16)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="ui-overline text-[color:var(--text-strong)]">
            {t(dict, "cart.feedback.added")}
          </p>
          <p className="text-sm leading-6 text-[color:var(--text-body)]">
            {t(dict, "productDetail.cartConfirmation")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t(dict, "nav.close")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] text-[color:var(--text-muted)] transition hover:border-[#d3c7ba] hover:text-[color:var(--text-strong)]"
        >
          <span aria-hidden="true" className="text-base leading-none">×</span>
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/${lang}/cart`}
          onClick={onClose}
          className="ui-button-secondary flex-1 justify-center whitespace-nowrap sm:px-4"
        >
          {t(dict, "cart.feedback.viewBasket")}
        </Link>
        <Link
          href={`/${lang}/checkout`}
          onClick={onClose}
          className="ui-button-primary flex-1 justify-center whitespace-nowrap sm:px-4"
        >
          {t(dict, "cart.feedback.checkout")}
        </Link>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-sm text-[color:var(--text-muted)] underline underline-offset-4 transition hover:text-[color:var(--text-body)]"
      >
        {t(dict, "cart.feedback.continue")}
      </button>
    </div>
  </div>
);
