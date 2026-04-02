import type { Locale } from "@/src/i18n/locales";
import { t } from "@/src/i18n/getDictionary";

const EXPENSE_CATEGORY_ALIASES: Record<string, string> = {
  ad: "ads",
  ads: "ads",
  advertising: "ads",
  infra: "infrastructure",
  infrastructure: "infrastructure",
  hosting: "infrastructure",
  host: "infrastructure",
  domain: "infrastructure",
  domains: "infrastructure",
  vercel: "infrastructure",
  supabase: "infrastructure",
  server: "infrastructure",
  servers: "infrastructure",
  bag: "packaging",
  bags: "packaging",
  bow: "packaging",
  bows: "packaging",
  gift_bag: "packaging",
  "gift bag": "packaging",
  "gift bags": "packaging",
  packaging: "packaging",
  paper_box: "packaging",
  "paper box": "packaging",
  paper_bag_large: "packaging",
  "large paper bag": "packaging",
  paper_bag_small: "packaging",
  "small paper bag": "packaging",
  plastic_bag_large: "packaging",
  "large plastic bag": "packaging",
  plastic_bag_small: "packaging",
  "small plastic bag": "packaging",
  paper_pillow: "packaging",
  paper_pillow_bag: "packaging",
  "paper pillow": "packaging",
  "paper pillow bag": "packaging",
  ribbon: "packaging",
  sticker: "packaging",
  sticker_gift: "packaging",
  stickers: "packaging",
  wrapper: "packaging",
  wrapping: "packaging",
  fabric: "materials",
  material: "materials",
  materials: "materials",
  print: "printing",
  printing: "printing",
  courier: "courier",
  delivery: "courier",
  shipping: "courier",
  equipment: "tools",
  tool: "tools",
  tools: "tools",
  app: "software",
  software: "software",
  rent: "rent",
  utilities: "utilities",
  tax: "taxes",
  taxes: "taxes",
  other: "other",
};

const MISC_COST_CATEGORY_ALIASES: Record<string, string> = {
  remake: "remake",
  rework: "remake",
  rush: "rush",
  urgent: "rush",
  refund: "refund",
  discount: "discount_adjustment",
  discount_adjustment: "discount_adjustment",
  custom: "custom_request",
  custom_request: "custom_request",
  other: "other",
};

const COURIER_PROVIDER_ALIASES: Record<string, string> = {
  courier: "courier",
  tbilisi: "tbilisi_courier",
  tbilisi_courier: "tbilisi_courier",
  region: "regional_courier",
  regional: "regional_courier",
  regional_courier: "regional_courier",
  pickup: "pickup",
  other: "other",
};

const toNormalizedToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const normalizeAdminExpenseCategoryKey = (value: string) => {
  const normalized = toNormalizedToken(value);
  return EXPENSE_CATEGORY_ALIASES[normalized] ?? normalized;
};

export const normalizeAdminExpenseCategory = (
  value: string,
  _locale: Locale,
  dict: Record<string, string>,
) => {
  const canonical = normalizeAdminExpenseCategoryKey(value);
  return canonical ? t(dict, `admin.options.expenseCategory.${canonical}`) : value;
};

export const formatAdminMiscCostCategory = (
  value: string,
  dict: Record<string, string>,
) => {
  const normalized = toNormalizedToken(value);
  const canonical = MISC_COST_CATEGORY_ALIASES[normalized];
  return canonical ? t(dict, `admin.options.miscCostCategory.${canonical}`) : value;
};

export const formatAdminCourierProvider = (
  value: string,
  dict: Record<string, string>,
) => {
  const normalized = toNormalizedToken(value);
  const canonical = COURIER_PROVIDER_ALIASES[normalized];
  return canonical ? t(dict, `admin.options.courierProvider.${canonical}`) : value;
};
