export const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const SALE_RECOGNIZED_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "completed",
] as const satisfies readonly OrderStatus[];
export const DELIVERY_RECOGNIZED_ORDER_STATUSES = [
  "shipped",
  "completed",
] as const satisfies readonly OrderStatus[];

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#888888",
  awaiting_payment: "#B88A1B",
  paid: "#2F6F4F",
  processing: "#2A5C8A",
  shipped: "#5C4A8A",
  completed: "#1F7A4D",
  cancelled: "#8A2F2F",
};

export const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

export const isSaleRecognizedOrderStatus = (value: string): value is (typeof SALE_RECOGNIZED_ORDER_STATUSES)[number] =>
  (SALE_RECOGNIZED_ORDER_STATUSES as readonly string[]).includes(value);

export const isDeliveryRecognizedOrderStatus = (value: string): value is (typeof DELIVERY_RECOGNIZED_ORDER_STATUSES)[number] =>
  (DELIVERY_RECOGNIZED_ORDER_STATUSES as readonly string[]).includes(value);

export const getOrderStatusColor = (status: string) =>
  isOrderStatus(status) ? ORDER_STATUS_COLORS[status] : "#888888";
