export const RESERVED_PAINTING_STOCK_STATUS = "reserved";

export const PAINTING_SALE_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "completed",
] as const;

export const PAINTING_RESERVED_ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
] as const;

export const getPaintingVariantStockStatusForOrderStatus = (status: string) => {
  if (PAINTING_SALE_ORDER_STATUSES.includes(status as (typeof PAINTING_SALE_ORDER_STATUSES)[number])) {
    return "out_of_stock";
  }

  if (PAINTING_RESERVED_ORDER_STATUSES.includes(status as (typeof PAINTING_RESERVED_ORDER_STATUSES)[number])) {
    return RESERVED_PAINTING_STOCK_STATUS;
  }

  return "in_stock";
};

export const isPaintingVariantUnavailable = (stockStatus: string | null | undefined) => {
  const normalized = stockStatus?.trim().toLowerCase() ?? null;
  return (
    normalized === RESERVED_PAINTING_STOCK_STATUS ||
    normalized === "out_of_stock" ||
    normalized === "sold_out" ||
    normalized === "unavailable"
  );
};
