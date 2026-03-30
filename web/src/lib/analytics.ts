"use client";

import { trackGoogleAnalyticsEvent } from "@/src/lib/googleTag";

type AnalyticsEventName =
  | "product_view"
  | "add_to_cart"
  | "checkout_step"
  | "order_created"
  | "order_paid_confirmed";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    artianiAnalytics?: (event: { event: AnalyticsEventName } & AnalyticsPayload) => void;
  }
}

export const ANALYTICS_CURRENCY = "GEL";

export const trackAnalyticsEvent = (
  event: AnalyticsEventName,
  payload: AnalyticsPayload,
) => {
  if (typeof window === "undefined") {
    return;
  }

  const eventPayload = { event, ...payload };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }

  window.dispatchEvent(
    new CustomEvent("artiani:analytics", {
      detail: eventPayload,
    }),
  );

  if (typeof window.artianiAnalytics === "function") {
    window.artianiAnalytics(eventPayload);
  }

  trackGoogleAnalyticsEvent(event, payload);
};
