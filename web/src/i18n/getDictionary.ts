import type { Locale } from "@/src/i18n/locales";

export type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ka: () => import("@/src/i18n/ka.json").then((module) => module.default),
  en: () => import("@/src/i18n/en.json").then((module) => module.default),
};

export const getDictionary = async (lang: Locale) => dictionaries[lang]();

export const t = (dict: Dictionary, key: string) => dict[key] ?? key;
