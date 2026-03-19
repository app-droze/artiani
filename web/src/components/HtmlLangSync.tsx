"use client";

import { useEffect } from "react";
import type { Locale } from "@/src/i18n/locales";

export const HtmlLangSync = ({ lang }: { lang: Locale }) => {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
};
