"use client";

import type { Locale } from "@/src/i18n/locales";

type CartListener = () => void;
const EMPTY_CART: CartItem[] = [];
let cartSnapshot: CartItem[] = EMPTY_CART;
let hasLoadedSnapshot = false;

export const CART_STORAGE_KEY = "artiani_cart_v1";

export type CartItem = {
  key: string;
  productId: string;
  productType: string;
  slug: string;
  title: string;
  productTypeLabel: string;
  variantId: string;
  selectedColorLabel: string | null;
  selectedBackgroundLabel: string | null;
  selectedMaterialLabel: string | null;
  selectedPhoneModelCode: string | null;
  selectedPhoneModelLabel: string | null;
  selectedSize: string | null;
  selectedPrintSide: "one_sided" | "both_sided" | null;
  selectedPrintSideLabel: string | null;
  selectedImage: string | null;
  selectedPrice: number;
  qty: number;
};

export type CartItemInput = Omit<CartItem, "key" | "qty"> & {
  qty?: number;
};

const listeners = new Set<CartListener>();

export const buildCartItemKey = (item: {
  productId: string;
  variantId: string;
  selectedPhoneModelCode: string | null;
  selectedSize: string | null;
  selectedPrintSide?: "one_sided" | "both_sided" | null;
}) => [
  item.productId,
  item.variantId,
  item.selectedPhoneModelCode ?? "nophonemodel",
  item.selectedSize ?? "nosize",
  item.selectedPrintSide ?? "noprintside",
].join(":");

export const readStoredCart = () => {
  if (typeof window === "undefined") return [] as CartItem[];

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.key !== "string" ||
        typeof item.productId !== "string" ||
        typeof item.slug !== "string" ||
        typeof item.title !== "string" ||
        typeof item.variantId !== "string" ||
        typeof item.selectedPrice !== "number" ||
        typeof item.qty !== "number"
      ) {
        return [];
      }

      return [
        (() => {
          const selectedPhoneModelCode =
            typeof item.selectedPhoneModelCode === "string" ? item.selectedPhoneModelCode : null;
          const selectedPrintSide =
            item.selectedPrintSide === "one_sided" || item.selectedPrintSide === "both_sided"
              ? item.selectedPrintSide
              : null;

          return {
          ...item,
          key: buildCartItemKey({
            productId: item.productId,
            variantId: item.variantId,
            selectedPhoneModelCode,
            selectedSize: typeof item.selectedSize === "string" ? item.selectedSize : null,
            selectedPrintSide,
          }),
          productType: typeof item.productType === "string" ? item.productType : "",
          selectedMaterialLabel:
            typeof item.selectedMaterialLabel === "string" ? item.selectedMaterialLabel : null,
          selectedPhoneModelCode,
          selectedPhoneModelLabel:
            typeof item.selectedPhoneModelLabel === "string" ? item.selectedPhoneModelLabel : null,
          selectedPrintSide,
          selectedPrintSideLabel:
            typeof item.selectedPrintSideLabel === "string" ? item.selectedPrintSideLabel : null,
        } satisfies CartItem;
        })(),
      ];
    });
  } catch {
    return [];
  }
};

export const writeStoredCart = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  cartSnapshot = items;
  hasLoadedSnapshot = true;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
};

export const clearStoredCart = () => {
  writeStoredCart([]);
};

export const subscribeToCart = (listener: CartListener) => {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      cartSnapshot = readStoredCart();
      hasLoadedSnapshot = true;
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
};

export const getCartSnapshot = () => {
  if (!hasLoadedSnapshot && typeof window !== "undefined") {
    cartSnapshot = readStoredCart();
    hasLoadedSnapshot = true;
  }

  return cartSnapshot;
};

export const getCartServerSnapshot = () => EMPTY_CART;

const isRunnerCartSlug = (slug: string) => slug.startsWith("table-runner-");

const stripRunnerSizePrefix = (value: string) =>
  value
    .replace(/^(small|large)\s+/iu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const getRunnerDisplayText = ({
  value,
  slug,
}: {
  value: string;
  slug: string;
}) => {
  if (isRunnerCartSlug(slug)) {
    return stripRunnerSizePrefix(value);
  }

  return value;
};

export const getCartDisplayTitle = ({
  title,
  slug,
  lang,
}: {
  title: string;
  slug: string;
  lang: Locale;
}) => {
  void lang;
  return getRunnerDisplayText({ value: title, slug });
};

export const getCartDisplayProductTypeLabel = ({
  productTypeLabel,
  slug,
  lang,
}: {
  productTypeLabel: string;
  slug: string;
  lang: Locale;
}) => {
  void lang;
  return getRunnerDisplayText({ value: productTypeLabel, slug });
};
