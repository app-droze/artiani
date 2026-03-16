import "server-only";

import type { Locale } from "@/src/i18n/locales";

type PaymentInstructions = {
  html: string;
  text: string;
};

export type PaymentVariant = "order" | "auction";

type PaymentCopy = {
  titleByVariant: Record<PaymentVariant, string>;
  introByVariant: Record<PaymentVariant, string>;
  accountNameLabel: string;
  transferReference: string;
  confirmationNoteByVariant: Record<PaymentVariant, string>;
};

const TBC_IBAN = "GE00TB0000000000000000";
const BOG_IBAN = "GE00BG0000000000000000";
const ACCOUNT_NAME = "Artiani Studio LLC";

const COPY_BY_LANG: Record<Locale, PaymentCopy> = {
  en: {
    titleByVariant: {
      order: "Payment instructions",
      auction: "Deposit instructions",
    },
    introByVariant: {
      order: "Please complete your bank transfer using one of the accounts below:",
      auction:
        "Please send the auction deposit using one of the bank accounts below:",
    },
    accountNameLabel: "Account name",
    transferReference: "Transfer reference",
    confirmationNoteByVariant: {
      order: "After transfer, keep your receipt and wait for order confirmation.",
      auction:
        "After transfer, keep your receipt and wait for bid deposit confirmation.",
    },
  },
  ka: {
    titleByVariant: {
      order: "გადახდის ინსტრუქცია",
      auction: "დეპოზიტის ინსტრუქცია",
    },
    introByVariant: {
      order:
        "გთხოვთ, საბანკო გადარიცხვა შეასრულოთ ქვემოთ მოცემული ერთ-ერთი ანგარიშით:",
      auction:
        "გთხოვთ, აუქციონის დეპოზიტი გადააგზავნოთ ქვემოთ მოცემული ერთ-ერთი ანგარიშით:",
    },
    accountNameLabel: "ანგარიშის სახელი",
    transferReference: "დანიშნულება",
    confirmationNoteByVariant: {
      order:
        "გადარიცხვის შემდეგ შეინახეთ ქვითარი და დაელოდეთ შეკვეთის დადასტურებას.",
      auction:
        "გადარიცხვის შემდეგ შეინახეთ ქვითარი და დაელოდეთ დეპოზიტის დადასტურებას.",
    },
  },
  ru: {
    titleByVariant: {
      order: "Инструкция по оплате",
      auction: "Инструкция по депозиту",
    },
    introByVariant: {
      order:
        "Пожалуйста, выполните банковский перевод на один из счетов ниже:",
      auction:
        "Пожалуйста, отправьте аукционный депозит на один из счетов ниже:",
    },
    accountNameLabel: "Название счета",
    transferReference: "Назначение перевода",
    confirmationNoteByVariant: {
      order:
        "После перевода сохраните квитанцию и дождитесь подтверждения заказа.",
      auction:
        "После перевода сохраните квитанцию и дождитесь подтверждения депозита.",
    },
  },
};

export const getPaymentInstructions = (
  lang: Locale,
  referenceCode: string,
  variant: PaymentVariant = "order",
): PaymentInstructions => {
  const copy = COPY_BY_LANG[lang];
  const title = copy.titleByVariant[variant];
  const intro = copy.introByVariant[variant];
  const confirmationNote = copy.confirmationNoteByVariant[variant];

  const html = `
    <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafaf9;">
      <p><strong>${title}</strong></p>
      <p>${intro}</p>
      <ul>
        <li>TBC Bank — IBAN: <strong>${TBC_IBAN}</strong> (${copy.accountNameLabel}: ${ACCOUNT_NAME})</li>
        <li>Bank of Georgia — IBAN: <strong>${BOG_IBAN}</strong> (${copy.accountNameLabel}: ${ACCOUNT_NAME})</li>
      </ul>
      <p><strong>${copy.transferReference}:</strong> ${referenceCode}</p>
      <p>${confirmationNote}</p>
    </div>
  `;

  const text = [
    title,
    intro,
    `- TBC Bank | IBAN: ${TBC_IBAN} | ${copy.accountNameLabel}: ${ACCOUNT_NAME}`,
    `- Bank of Georgia | IBAN: ${BOG_IBAN} | ${copy.accountNameLabel}: ${ACCOUNT_NAME}`,
    `${copy.transferReference}: ${referenceCode}`,
    confirmationNote,
  ].join("\n");

  return { html, text };
};
