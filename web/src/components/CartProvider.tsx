"use client";

import {
  createContext,
  useContext,
  useMemo,
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

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addFeedbackToken: number;
  addItem: (item: CartItemInput) => boolean;
  updateItemQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getCartServerSnapshot);
  const [addFeedbackToken, setAddFeedbackToken] = useState(0);

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
          if (existingItem.productType === "painting") {
            setAddFeedbackToken((current) => current + 1);
            return false;
          }

          writeStoredCart(
            items.map((currentItem) =>
              currentItem.key === key
                ? { ...currentItem, qty: currentItem.qty + (item.qty ?? 1) }
                : currentItem,
            ),
          );
          setAddFeedbackToken((current) => current + 1);
          return true;
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
        return true;
      },
      removeItem: (key) => {
        writeStoredCart(items.filter((item) => item.key !== key));
      },
      updateItemQty: (key, qty) => {
        if (qty <= 0) {
          writeStoredCart(items.filter((item) => item.key !== key));
          return;
        }

        writeStoredCart(
          items.map((item) =>
            item.key === key
              ? { ...item, qty: item.productType === "painting" ? 1 : qty }
              : item,
          ),
        );
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
