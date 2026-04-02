import type { Locale } from "@/src/i18n/locales";
import { t } from "@/src/i18n/getDictionary";

export const normalizeAdminExpenseCategory = (
  value: string,
  locale: Locale,
  dict: Record<string, string>,
) => {
  const normalized = value.trim().toLowerCase();
  const packagingTerms = [
    "bag",
    "bags",
    "bow",
    "bows",
    "packaging",
    "wrapper",
    "wrapping",
    "gift bag",
    "gift bags",
    "ribbon",
    "sticker",
    "stickers",
    "paper pillow",
    "paper_pillow",
  ];

  if (packagingTerms.includes(normalized)) {
    return locale === "ka" ? "შეფუთვა" : t(dict, "admin.reports.lines.packaging");
  }

  return value;
};
