"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/src/data/products";
import {
  buildCartItem,
  type CartItem,
  type CartItemOptions,
  type CartState,
  getCartTotals,
  loadCart,
  saveCart,
} from "@/src/lib/cart";

export type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  count: number;
  addItem: (product: Product, options: CartItemOptions, unitPrice: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<CartState>({ items: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(state);
  }, [hydrated, state]);

  const { subtotal, count } = useMemo(
    () => getCartTotals(state.items),
    [state.items],
  );

  const addItem = (product: Product, options: CartItemOptions, unitPrice: number) => {
    setState((prev) => {
      const id = `${product.id}|text:${options.addText ? "1" : "0"}|sig:${options.signature ? "1" : "0"}`;
      const existing = prev.items.find((item) => item.id === id);
      if (existing) {
        return {
          items: prev.items.map((item) =>
            item.id === id ? { ...item, qty: item.qty + 1 } : item,
          ),
        };
      }
      return { items: [...prev.items, buildCartItem(product, options, unitPrice)] };
    });
  };

  const updateQty = (id: string, qty: number) => {
    setState((prev) => ({
      items: prev.items
        .map((item) => (item.id === id ? { ...item, qty } : item))
        .filter((item) => item.qty > 0),
    }));
  };

  const removeItem = (id: string) => {
    setState((prev) => ({ items: prev.items.filter((item) => item.id !== id) }));
  };

  const clear = () => setState({ items: [] });

  const value = useMemo(
    () => ({ items: state.items, subtotal, count, addItem, updateQty, removeItem, clear }),
    [state.items, subtotal, count],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
};
