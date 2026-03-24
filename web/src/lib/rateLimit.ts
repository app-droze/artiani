import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

type RateLimitConfig = {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

declare global {
  var __artianiRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const RATE_LIMIT_STORE = globalThis.__artianiRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__artianiRateLimitStore) {
  globalThis.__artianiRateLimitStore = RATE_LIMIT_STORE;
}

const extractClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
};

const getRateLimitStoreKey = (request: NextRequest, config: RateLimitConfig) =>
  `${config.keyPrefix}:${extractClientIp(request)}`;

const pruneExpiredEntries = (now: number) => {
  if (RATE_LIMIT_STORE.size < 256) {
    return;
  }

  for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
    if (entry.resetAt <= now) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
};

export const applyRateLimit = (
  request: NextRequest,
  config: RateLimitConfig,
): RateLimitResult => {
  const now = Date.now();
  pruneExpiredEntries(now);

  const key = getRateLimitStoreKey(request, config);
  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    RATE_LIMIT_STORE.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - 1),
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
      resetAt,
    };
  }

  existing.count += 1;
  RATE_LIMIT_STORE.set(key, existing);

  return {
    allowed: existing.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    resetAt: existing.resetAt,
  };
};

export const getRateLimitFingerprint = (request: NextRequest, config: RateLimitConfig) =>
  createHash("sha256")
    .update(getRateLimitStoreKey(request, config))
    .digest("hex")
    .slice(0, 12);

