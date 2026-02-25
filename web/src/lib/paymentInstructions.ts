import "server-only";

import type { Locale } from "@/src/i18n/locales";

type PaymentInstructions = {
  html: string;
  text: string;
};

type PaymentCopy = {
  title: string;
  intro: string;
  accountNameLabel: string;
  transferReference: string;
  confirmationNote: string;
};

const TBC_IBAN = "GE00TB0000000000000000";
const BOG_IBAN = "GE00BG0000000000000000";
const ACCOUNT_NAME = "Artiani Studio LLC";

const COPY_BY_LANG: Record<Locale, PaymentCopy> = {
  en: {
    title: "Payment instructions",
    intro: "Please complete your bank transfer using one of the accounts below:",
    accountNameLabel: "Account name",
    transferReference: "Transfer reference",
    confirmationNote: "After transfer, keep your receipt and wait for order confirmation.",
  },
  ka: {
    title: "გადახდის ინსტრუქცია",
    intro: "გთხოვთ, საბანკო გადარიცხვა შეასრულოთ ქვემოთ მოცემული ერთ-ერთი ანგარიშით:",
    accountNameLabel: "ანგარიშის სახელი",
    transferReference: "დანიშნულება",
    confirmationNote:
      "გადარიცხვის შემდეგ შეინახეთ ქვითარი და დაელოდეთ შეკვეთის დადასტურებას.",
  },
};

export const getPaymentInstructions = (
  lang: Locale,
  orderCode: string,
): PaymentInstructions => {
  const copy = COPY_BY_LANG[lang];

  const html = `
    <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafaf9;">
      <p><strong>${copy.title}</strong></p>
      <p>${copy.intro}</p>
      <ul>
        <li>TBC Bank — IBAN: <strong>${TBC_IBAN}</strong> (${copy.accountNameLabel}: ${ACCOUNT_NAME})</li>
        <li>Bank of Georgia — IBAN: <strong>${BOG_IBAN}</strong> (${copy.accountNameLabel}: ${ACCOUNT_NAME})</li>
      </ul>
      <p><strong>${copy.transferReference}:</strong> ${orderCode}</p>
      <p>${copy.confirmationNote}</p>
    </div>
  `;

  const text = [
    copy.title,
    copy.intro,
    `- TBC Bank | IBAN: ${TBC_IBAN} | ${copy.accountNameLabel}: ${ACCOUNT_NAME}`,
    `- Bank of Georgia | IBAN: ${BOG_IBAN} | ${copy.accountNameLabel}: ${ACCOUNT_NAME}`,
    `${copy.transferReference}: ${orderCode}`,
    copy.confirmationNote,
  ].join("\n");

  return { html, text };
};
