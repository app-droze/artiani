type GoogleTrackPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.trim() ?? "";
const GOOGLE_ADS_CONVERSION_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID?.trim() ??
  (GOOGLE_TAG_ID.startsWith("AW-") ? GOOGLE_TAG_ID : "");

const GOOGLE_ADS_LABELS = {
  product_view: process.env.NEXT_PUBLIC_GOOGLE_ADS_VIEW_PRODUCT_LABEL?.trim() ?? "",
  add_to_cart: process.env.NEXT_PUBLIC_GOOGLE_ADS_ADD_TO_CART_LABEL?.trim() ?? "",
  begin_checkout: process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL?.trim() ?? "",
  purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL?.trim() ?? "",
} as const;

const toStringValue = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

const toNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const getConversionSendTo = (label: string) => {
  if (!GOOGLE_ADS_CONVERSION_ID || !label) {
    return null;
  }

  return `${GOOGLE_ADS_CONVERSION_ID}/${label}`;
};

export const getGoogleTagId = () => GOOGLE_TAG_ID;

export const isGoogleTagEnabled = () => Boolean(GOOGLE_TAG_ID);

const sendGoogleEvent = (eventName: string, params: Record<string, unknown>) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !GOOGLE_TAG_ID) {
    return;
  }

  window.gtag("event", eventName, params);
};

const sendGoogleAdsConversion = (
  label: string,
  payload: {
    value?: number;
    currency?: string;
    transaction_id?: string;
  },
) => {
  const sendTo = getConversionSendTo(label);
  if (!sendTo) {
    return;
  }

  sendGoogleEvent("conversion", {
    send_to: sendTo,
    value: payload.value,
    currency: payload.currency,
    transaction_id: payload.transaction_id,
  });
};

export const trackGoogleAnalyticsEvent = (event: string, payload: GoogleTrackPayload) => {
  const currency = toStringValue(payload.currency);
  const value = toNumberValue(payload.price);
  const productId = toStringValue(payload.product_id);
  const variantId = toStringValue(payload.variant_id);
  const quantity = toNumberValue(payload.qty);
  const transactionId = toStringValue(payload.order_code);

  if (event === "product_view") {
    sendGoogleEvent("view_item", {
      currency,
      value,
      items: productId
        ? [
            {
              item_id: productId,
              item_variant: variantId,
              price: value,
              quantity: quantity ?? 1,
            },
          ]
        : undefined,
    });
    sendGoogleAdsConversion(GOOGLE_ADS_LABELS.product_view, {
      value,
      currency,
    });
    return;
  }

  if (event === "add_to_cart") {
    sendGoogleEvent("add_to_cart", {
      currency,
      value,
      items: productId
        ? [
            {
              item_id: productId,
              item_variant: variantId,
              price: value,
              quantity: quantity ?? 1,
            },
          ]
        : undefined,
    });
    sendGoogleAdsConversion(GOOGLE_ADS_LABELS.add_to_cart, {
      value,
      currency,
    });
    return;
  }

  if (event === "checkout_step" && payload.step === "details") {
    sendGoogleEvent("begin_checkout", {
      currency,
      value,
      items: quantity ? [{ quantity }] : undefined,
    });
    sendGoogleAdsConversion(GOOGLE_ADS_LABELS.begin_checkout, {
      value,
      currency,
    });
    return;
  }

  if (event === "order_created") {
    sendGoogleEvent("purchase", {
      transaction_id: transactionId,
      currency,
      value,
    });
    sendGoogleAdsConversion(GOOGLE_ADS_LABELS.purchase, {
      value,
      currency,
      transaction_id: transactionId,
    });
  }
};
