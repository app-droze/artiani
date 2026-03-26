import "server-only";

import { getPublicBaseUrl } from "@/src/lib/env.server";
import type { Locale } from "@/src/i18n/locales";
import { getPaymentBanks } from "@/src/lib/paymentDetails";

type PaymentInstructions = {
  html: string;
  text: string;
};

export type PaymentVariant = "order" | "auction";

type PaymentCopy = {
  titleByVariant: Record<PaymentVariant, string>;
  introByVariant: Record<PaymentVariant, string>;
  recipientNameLabel: string;
  ibanLabel: string;
  transferReference: string;
  confirmationNoteByVariant: Record<PaymentVariant, string>;
};

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
    recipientNameLabel: "Recipient name",
    ibanLabel: "IBAN",
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
    recipientNameLabel: "მიმღების სახელი",
    ibanLabel: "IBAN",
    transferReference: "დანიშნულება",
    confirmationNoteByVariant: {
      order:
        "გადარიცხვის შემდეგ შეინახეთ ქვითარი და დაელოდეთ შეკვეთის დადასტურებას.",
      auction:
        "გადარიცხვის შემდეგ შეინახეთ ქვითარი და დაელოდეთ დეპოზიტის დადასტურებას.",
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
  const publicBaseUrl = getPublicBaseUrl();
  const banks = getPaymentBanks(lang);
  const bankCardsHtml = banks
    .map(
      (bank) => `
        <div style="margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;padding:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${publicBaseUrl}${bank.logoPath}" alt="${bank.name}" width="120" height="33" style="display:block;height:33px;width:auto;" />
            <strong style="font-size:15px;color:#111827;">${bank.name}</strong>
          </div>
          <p style="margin:10px 0 0;color:#111827;"><strong>${copy.ibanLabel}:</strong> ${bank.iban}</p>
          <p style="margin:6px 0 0;color:#111827;"><strong>${copy.recipientNameLabel}:</strong> ${bank.recipientName}</p>
        </div>
      `,
    )
    .join("");

  const html = `
    <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafaf9;">
      <p><strong>${title}</strong></p>
      <p>${intro}</p>
      ${bankCardsHtml}
      <p><strong>${copy.transferReference}:</strong> ${referenceCode}</p>
      <p>${confirmationNote}</p>
    </div>
  `;

  const text = [
    title,
    intro,
    ...banks.flatMap((bank) => [
      `- ${bank.name}`,
      `  ${copy.ibanLabel}: ${bank.iban}`,
      `  ${copy.recipientNameLabel}: ${bank.recipientName}`,
    ]),
    `${copy.transferReference}: ${referenceCode}`,
    confirmationNote,
  ].join("\n");

  return { html, text };
};
