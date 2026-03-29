"use client";

import { track } from "@vercel/analytics";
import { useEffect, useRef } from "react";
import type { Locale } from "@/src/i18n/locales";

type CatalogueViewTrackerProps = {
  lang: Locale;
};

export const CatalogueViewTracker = ({ lang }: CatalogueViewTrackerProps) => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    track("Catalogue View", {
      lang,
    });
    hasTrackedRef.current = true;
  }, [lang]);

  return null;
};
