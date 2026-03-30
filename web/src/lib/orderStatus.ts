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

export const getOrderStatusColor = (status: string) =>
  isOrderStatus(status) ? ORDER_STATUS_COLORS[status] : "#888888";
