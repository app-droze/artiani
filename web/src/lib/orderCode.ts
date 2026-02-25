import "server-only";

import { randomBytes } from "node:crypto";

const ORDER_CODE_PREFIX = "ART";
const ORDER_CODE_RANDOM_LENGTH = 6;
const ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const formatDateSegment = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

const randomSegment = (length: number) => {
  const bytes = randomBytes(length);
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += ORDER_CODE_ALPHABET[bytes[index] % ORDER_CODE_ALPHABET.length];
  }
  return value;
};

export const generateOrderCode = (date = new Date()) =>
  `${ORDER_CODE_PREFIX}-${formatDateSegment(date)}-${randomSegment(ORDER_CODE_RANDOM_LENGTH)}`;

const readErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "error" in error &&
          error.error &&
          typeof error.error === "object" &&
          "code" in error.error &&
          typeof error.error.code === "string"
        ? error.error.code
        : undefined;

  return code;
};

const readErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "error" in error &&
          error.error &&
          typeof error.error === "object" &&
          "message" in error.error &&
          typeof error.error.message === "string"
        ? error.error.message
        : undefined;

  return message;
};

export const isUniqueConstraintError = (error: unknown) => {
  const code = readErrorCode(error);
  if (code === "23505") return true;

  const message = readErrorMessage(error);
  return typeof message === "string"
    ? /unique constraint|duplicate key value/i.test(message)
    : false;
};

type InsertWithOrderCode<T> = (orderCode: string) => Promise<T>;

type OrderCodeRetryOptions = {
  maxAttempts?: number;
};

// Uses node:crypto; call from Node runtime handlers (not Edge).
export const insertWithOrderCodeRetry = async <T>(
  insertWithCode: InsertWithOrderCode<T>,
  options?: OrderCodeRetryOptions,
) => {
  const maxAttempts = options?.maxAttempts ?? 5;
  if (maxAttempts < 1) {
    throw new Error("insertWithOrderCodeRetry maxAttempts must be at least 1.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const orderCode = generateOrderCode();
    try {
      const result = await insertWithCode(orderCode);
      return { order_code: orderCode, result };
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate a unique order code after retries.");
};
