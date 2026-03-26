import type { Locale } from "@/src/i18n/locales";

export type PaymentBankCode = "tbc" | "bog";

export type PaymentBankDetail = {
  code: PaymentBankCode;
  name: string;
  iban: string;
  logoPath: string;
  recipientName: string;
};

const RECIPIENT_NAME_BY_LANG: Record<Locale, string> = {
  en: "Giorgi Margiani",
  ka: "გიორგი მარგიანი",
};

const PAYMENT_BANKS = [
  {
    code: "tbc",
    name: "TBC Bank",
    iban: "GE40TB7276736010100039",
    logoPath: "/banks/tbc-bank.svg",
  },
  {
    code: "bog",
    name: "Bank of Georgia",
    iban: "GE18BG0000000353920700",
    logoPath: "/banks/bank-of-georgia.svg",
  },
] as const satisfies ReadonlyArray<{
  code: PaymentBankCode;
  name: string;
  iban: string;
  logoPath: string;
}>;

export const getPaymentRecipientName = (lang: Locale) => RECIPIENT_NAME_BY_LANG[lang];

export const getPaymentBanks = (lang: Locale): PaymentBankDetail[] =>
  PAYMENT_BANKS.map((bank) => ({
    ...bank,
    recipientName: getPaymentRecipientName(lang),
  }));
