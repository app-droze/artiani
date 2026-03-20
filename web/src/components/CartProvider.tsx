"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  buildCartItemKey,
  clearStoredCart,
  getCartServerSnapshot,
  getCartSnapshot,
  subscribeToCart,
  writeStoredCart,
  type CartItem,
  type CartItemInput,
} from "@/src/lib/cart";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addFeedbackToken: number;
  addItem: (item: CartItemInput) => void;
  updateItemQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getCartServerSnapshot);
  const [addFeedbackToken, setAddFeedbackToken] = useState(0);
  const cartValidationRequestRef = useRef(0);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const requestId = cartValidationRequestRef.current + 1;
    cartValidationRequestRef.current = requestId;
    let cancelled = false;

    const validateCartItems = async () => {
      const productIds = [...new Set(items.map((item) => item.productId))];
      if (productIds.length === 0) {
        return;
      }

      const { data, error } = await getSupabasePublicReadClient()
        .from("products")
        .select("id, slug, product_variants(id)")
        .in("id", productIds)
        .eq("is_active", true);

      if (cancelled || cartValidationRequestRef.current !== requestId || error) {
        return;
      }

      const validProductMap = new Map(
        (data ?? []).map((product) => [
          product.id,
          {
            slug: product.slug,
            variantIds: new Set((product.product_variants ?? []).map((variant) => variant.id)),
          },
        ]),
      );

      const validItems = items.filter((item) => {
        const product = validProductMap.get(item.productId);

        return Boolean(product && product.slug === item.slug && product.variantIds.has(item.variantId));
      });

      if (validItems.length !== items.length) {
        writeStoredCart(validItems);
      }
    };

    void validateCartItems();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.selectedPrice * item.qty, 0);

    return {
      items,
      itemCount,
      totalAmount,
      addFeedbackToken,
      addItem: (item) => {
        const key = buildCartItemKey(item);
        const existingItem = items.find((currentItem) => currentItem.key === key);

        if (existingItem) {
          writeStoredCart(
            items.map((currentItem) =>
              currentItem.key === key
                ? { ...currentItem, qty: currentItem.qty + (item.qty ?? 1) }
                : currentItem,
            ),
          );
          setAddFeedbackToken((current) => current + 1);
          return;
        }

        writeStoredCart([
          ...items,
          {
            ...item,
            key,
            qty: item.qty ?? 1,
          },
        ]);
        setAddFeedbackToken((current) => current + 1);
      },
      removeItem: (key) => {
        writeStoredCart(items.filter((item) => item.key !== key));
      },
      updateItemQty: (key, qty) => {
        if (qty <= 0) {
          writeStoredCart(items.filter((item) => item.key !== key));
          return;
        }

        writeStoredCart(items.map((item) => (item.key === key ? { ...item, qty } : item)));
      },
      clear: () => {
        clearStoredCart();
      },
    };
  }, [addFeedbackToken, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
};
