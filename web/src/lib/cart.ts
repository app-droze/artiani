import type { Product } from "@/src/data/products";

export type CartItemOptions = {
  signature: boolean;
  cardBack?: "postcard" | "greeting";
  printVariantId?: string;
  printVariantLabel?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  type: Product["kind"];
  unitPrice: number;
  qty: number;
  options: CartItemOptions;
};

export type CartState = {
  items: CartItem[];
};

export const CART_STORAGE_KEY = "artiani_cart_v1";

export const createCartItemId = (
  product: Product,
  options: CartItemOptions,
) =>
  `${product.id}|sig:${options.signature ? "1" : "0"}|back:${options.cardBack ?? "na"}|print:${options.printVariantId ?? "na"}`;

export const getCartTotals = (items: CartItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  return { subtotal, count };
};

export const loadCart = (): CartState => {
  if (typeof window === "undefined") {
    return { items: [] };
  }
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) {
    return { items: [] };
  }
  try {
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) {
      return { items: [] };
    }
    return parsed;
  } catch {
    return { items: [] };
  }
};

export const saveCart = (state: CartState) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
};

export const buildCartItem = (
  product: Product,
  options: CartItemOptions,
  unitPrice: number,
): CartItem => ({
  id: createCartItemId(product, options),
  productId: product.id,
  slug: product.slug,
  name: product.name.en,
  type: product.kind,
  unitPrice,
  qty: 1,
  options,
});
