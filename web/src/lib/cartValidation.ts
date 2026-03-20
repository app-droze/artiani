"use client";

import type { CartItem } from "@/src/lib/cart";

type ValidateCartResponse = {
  validItems?: CartItem[];
  invalidRemovedCount?: number;
};

export const validateCartItems = async (items: CartItem[]) => {
  const response = await fetch("/api/cart/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error("cart-validate-failed");
  }

  const payload = (await response.json()) as ValidateCartResponse;

  return {
    validItems: Array.isArray(payload.validItems) ? payload.validItems : items,
    invalidRemovedCount:
      typeof payload.invalidRemovedCount === "number" && payload.invalidRemovedCount > 0
        ? payload.invalidRemovedCount
        : 0,
  };
};
