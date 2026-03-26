import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

type PhoneCaseModelRow = {
  code: string;
  brand: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

export type PhoneCaseModelOption = {
  code: string;
  brand: string;
  label: string;
  sortOrder: number;
};

const FALLBACK_PHONE_CASE_MODEL_DATA = [
  ["iphone-16", "Apple", "iPhone 16"],
  ["iphone-16-plus", "Apple", "iPhone 16+"],
  ["iphone-16-pro", "Apple", "iPhone 16 Pro"],
  ["iphone-16-pro-max", "Apple", "iPhone 16 Pro Max"],
  ["iphone-15", "Apple", "iPhone 15"],
  ["iphone-15-plus", "Apple", "iPhone 15+"],
  ["iphone-15-pro", "Apple", "iPhone 15 Pro"],
  ["iphone-15-pro-max", "Apple", "iPhone 15 Pro Max"],
  ["iphone-14", "Apple", "iPhone 14"],
  ["iphone-14-plus", "Apple", "iPhone 14+"],
  ["iphone-14-pro", "Apple", "iPhone 14 Pro"],
  ["iphone-14-pro-max", "Apple", "iPhone 14 Pro Max"],
  ["iphone-13", "Apple", "iPhone 13"],
  ["iphone-13-mini", "Apple", "iPhone 13 Mini"],
  ["iphone-13-pro", "Apple", "iPhone 13 Pro"],
  ["iphone-13-pro-max", "Apple", "iPhone 13 Pro Max"],
  ["iphone-12", "Apple", "iPhone 12"],
  ["iphone-12-mini", "Apple", "iPhone 12 Mini"],
  ["iphone-12-pro", "Apple", "iPhone 12 Pro"],
  ["iphone-12-pro-max", "Apple", "iPhone 12 Pro Max"],
  ["iphone-11", "Apple", "iPhone 11"],
  ["iphone-11-pro", "Apple", "iPhone 11 Pro"],
  ["iphone-11-pro-max", "Apple", "iPhone 11 Pro Max"],
  ["iphone-xs-max", "Apple", "iPhone XS Max"],
  ["iphone-xr", "Apple", "iPhone XR"],
  ["iphone-x-xs", "Apple", "iPhone X/XS"],
  ["iphone-7", "Apple", "iPhone 7"],
  ["iphone-7-plus", "Apple", "iPhone 7+"],
  ["samsung-galaxy-s25", "Samsung", "Samsung Galaxy S25"],
  ["samsung-galaxy-s25-plus", "Samsung", "Samsung Galaxy S25+"],
  ["samsung-galaxy-s25-ultra", "Samsung", "Samsung Galaxy S25 Ultra"],
  ["samsung-galaxy-s24", "Samsung", "Samsung Galaxy S24"],
  ["samsung-galaxy-s24-plus", "Samsung", "Samsung Galaxy S24+"],
  ["samsung-galaxy-s24-ultra", "Samsung", "Samsung Galaxy S24 Ultra"],
  ["samsung-galaxy-s23", "Samsung", "Samsung Galaxy S23"],
  ["samsung-galaxy-s23-plus", "Samsung", "Samsung Galaxy S23+"],
  ["samsung-galaxy-s23-ultra", "Samsung", "Samsung Galaxy S23 Ultra"],
  ["samsung-galaxy-s22", "Samsung", "Samsung Galaxy S22"],
  ["samsung-galaxy-s22-plus", "Samsung", "Samsung Galaxy S22+"],
  ["samsung-galaxy-s22-ultra", "Samsung", "Samsung Galaxy S22 Ultra"],
  ["samsung-galaxy-s21", "Samsung", "Samsung Galaxy S21"],
  ["samsung-galaxy-s21-ultra", "Samsung", "Samsung Galaxy S21 Ultra"],
  ["samsung-galaxy-s20-fe", "Samsung", "Samsung Galaxy S20 FE"],
  ["samsung-galaxy-s21-fe", "Samsung", "Samsung Galaxy S21 FE"],
  ["samsung-galaxy-s23-fe", "Samsung", "Samsung Galaxy S23 FE"],
  ["samsung-galaxy-s24-fe", "Samsung", "Samsung Galaxy S24 FE"],
  ["samsung-galaxy-s8", "Samsung", "Samsung Galaxy S8"],
  ["samsung-galaxy-s9", "Samsung", "Samsung Galaxy S9"],
  ["samsung-galaxy-s10", "Samsung", "Samsung Galaxy S10"],
  ["samsung-galaxy-s20", "Samsung", "Samsung Galaxy S20"],
  ["samsung-galaxy-a02s", "Samsung", "Samsung Galaxy A02s"],
  ["samsung-galaxy-a03", "Samsung", "Samsung Galaxy A03"],
  ["samsung-galaxy-a04", "Samsung", "Samsung Galaxy A04"],
  ["samsung-galaxy-a04e", "Samsung", "Samsung Galaxy A04E"],
  ["samsung-galaxy-a04s", "Samsung", "Samsung Galaxy A04S"],
  ["samsung-galaxy-a06", "Samsung", "Samsung Galaxy A06"],
  ["samsung-galaxy-a12", "Samsung", "Samsung Galaxy A12"],
  ["samsung-galaxy-a13-4g", "Samsung", "Samsung Galaxy A13 4G"],
  ["samsung-galaxy-a13-5g", "Samsung", "Samsung Galaxy A13 5G"],
  ["samsung-galaxy-a14", "Samsung", "Samsung Galaxy A14"],
  ["samsung-galaxy-a15", "Samsung", "Samsung Galaxy A15"],
  ["samsung-galaxy-a16", "Samsung", "Samsung Galaxy A16"],
  ["samsung-galaxy-a22", "Samsung", "Samsung Galaxy A22"],
  ["samsung-galaxy-a23", "Samsung", "Samsung Galaxy A23"],
  ["samsung-galaxy-a24", "Samsung", "Samsung Galaxy A24"],
  ["samsung-galaxy-a25", "Samsung", "Samsung Galaxy A25"],
  ["samsung-galaxy-a32-4g", "Samsung", "Samsung Galaxy A32 4G"],
  ["samsung-galaxy-a32-5g", "Samsung", "Samsung Galaxy A32 5G"],
  ["samsung-galaxy-a33", "Samsung", "Samsung Galaxy A33"],
  ["samsung-galaxy-a34", "Samsung", "Samsung Galaxy A34"],
  ["samsung-galaxy-a35", "Samsung", "Samsung Galaxy A35"],
  ["samsung-galaxy-a53", "Samsung", "Samsung Galaxy A53"],
  ["samsung-galaxy-a54", "Samsung", "Samsung Galaxy A54"],
  ["samsung-galaxy-a55", "Samsung", "Samsung Galaxy A55"],
  ["samsung-galaxy-a72", "Samsung", "Samsung Galaxy A72"],
  ["samsung-galaxy-a73", "Samsung", "Samsung Galaxy A73"],
  ["xiaomi-redmi-8", "Xiaomi", "Xiaomi Redmi 8"],
  ["xiaomi-redmi-note-10-pro", "Xiaomi", "Xiaomi Redmi Note 10 Pro"],
  ["xiaomi-redmi-note-11-pro", "Xiaomi", "Xiaomi Redmi Note 11 Pro"],
  ["xiaomi-redmi-12-pro", "Xiaomi", "Xiaomi Redmi 12 Pro"],
  ["xiaomi-redmi-note-12-4g", "Xiaomi", "Xiaomi Redmi Note 12 4G"],
  ["xiaomi-redmi-note-12-5g", "Xiaomi", "Xiaomi Redmi Note 12 5G"],
  ["xiaomi-redmi-note-12s-4g", "Xiaomi", "Xiaomi Redmi Note 12S 4G"],
  ["xiaomi-redmi-note-12s-5g", "Xiaomi", "Xiaomi Redmi Note 12S 5G"],
  ["xiaomi-redmi-note-13-4g", "Xiaomi", "Xiaomi Redmi Note 13 4G"],
  ["xiaomi-redmi-note-13-pro-4g", "Xiaomi", "Xiaomi Redmi Note 13 Pro 4G"],
  ["xiaomi-redmi-note-13-pro-plus", "Xiaomi", "Xiaomi Redmi Note 13 Pro+"],
  ["xiaomi-poco-m6-pro", "Xiaomi", "Xiaomi Poco M6 Pro"],
] as const;

const readSupabaseErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      message: "Unknown Supabase error",
      details: null,
      hint: null,
    };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    message:
      typeof candidate.message === "string" && candidate.message.trim().length > 0
        ? candidate.message
        : "Unknown Supabase error",
    details: typeof candidate.details === "string" ? candidate.details : null,
    hint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
};

const mapPhoneCaseModelRow = (row: PhoneCaseModelRow): PhoneCaseModelOption => ({
  code: row.code,
  brand: row.brand,
  label: row.name,
  sortOrder: row.sort_order ?? 9999,
});

export const FALLBACK_PHONE_CASE_MODELS: PhoneCaseModelOption[] =
  FALLBACK_PHONE_CASE_MODEL_DATA.map(([code, brand, label], index) => ({
    code,
    brand,
    label,
    sortOrder: (index + 1) * 10,
  }));

export const getPhoneCaseModels = async (): Promise<PhoneCaseModelOption[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_phone_models")
    .select("code, brand, name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[phoneCaseModels] fetch unavailable; using fallback phone model list", {
      ...readSupabaseErrorDetails(error),
      clientPath: "public",
    });
    return FALLBACK_PHONE_CASE_MODELS;
  }

  const rows = (data ?? []) as PhoneCaseModelRow[];
  if (rows.length === 0) {
    return FALLBACK_PHONE_CASE_MODELS;
  }

  return rows.map((row) => mapPhoneCaseModelRow(row));
};

export const getPhoneCaseModelMap = async () =>
  new Map((await getPhoneCaseModels()).map((model) => [model.code, model]));
