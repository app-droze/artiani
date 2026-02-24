export const locales = ["en", "ka"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ka";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
