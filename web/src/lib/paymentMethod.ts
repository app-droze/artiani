export const PAYMENT_METHODS = ["bank_transfer", "cash_on_delivery"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "bank_transfer";

export const isPaymentMethod = (value: string): value is PaymentMethod =>
  (PAYMENT_METHODS as readonly string[]).includes(value);

export const getPaymentMethodLabelKey = (paymentMethod: PaymentMethod) =>
  `paymentMethod.${paymentMethod}` as const;

export const getInitialOrderStatusForPaymentMethod = (paymentMethod: PaymentMethod) =>
  paymentMethod === "cash_on_delivery" ? "pending" : "awaiting_payment";
