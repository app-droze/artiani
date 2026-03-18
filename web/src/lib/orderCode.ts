import "server-only";

import { randomBytes } from "node:crypto";

const ORDER_CODE_PREFIX = "ART";
const ORDER_CODE_RANDOM_LENGTH = 6;
const ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomSegment = (length: number) => {
  const bytes = randomBytes(length);
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += ORDER_CODE_ALPHABET[bytes[index] % ORDER_CODE_ALPHABET.length];
  }

  return value;
};

export const generateOrderCode = () =>
  `${ORDER_CODE_PREFIX}-${randomSegment(ORDER_CODE_RANDOM_LENGTH)}`;

const readErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if (
    "error" in error &&
    error.error &&
    typeof error.error === "object" &&
    "code" in error.error &&
    typeof error.error.code === "string"
  ) {
    return error.error.code;
  }

  return undefined;
};

const readErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if (
    "error" in error &&
    error.error &&
    typeof error.error === "object" &&
    "message" in error.error &&
    typeof error.error.message === "string"
  ) {
    return error.error.message;
  }

  return undefined;
};

const isUniqueConstraintError = (error: unknown) => {
  const code = readErrorCode(error);
  if (code === "23505") return true;

  const message = readErrorMessage(error);
  return typeof message === "string"
    ? /unique constraint|duplicate key value/i.test(message)
    : false;
};

type InsertWithOrderCode<T> = (orderCode: string) => Promise<T>;

export const insertWithOrderCodeRetry = async <T>(
  insertWithCode: InsertWithOrderCode<T>,
  maxAttempts = 5,
) => {
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
