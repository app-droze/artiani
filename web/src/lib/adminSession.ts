const ADMIN_SESSION_COOKIE_NAME = "artiani_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const textEncoder = new TextEncoder();

type AdminSessionPayload = {
  role: "admin";
  exp: number;
};

const readRequiredAdminSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[admin.session] Missing required ADMIN_SESSION_SECRET. Add it to web/.env.local.",
    );
  }

  return secret;
};

const base64UrlEncode = (value: string | Uint8Array) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
};

const importHmacKey = async (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

const signPayload = async (payload: string) => {
  const key = await importHmacKey(readRequiredAdminSessionSecret());
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
};

export const getAdminSessionCookieName = () => ADMIN_SESSION_COOKIE_NAME;

export const getAdminSessionMaxAgeSeconds = () => ADMIN_SESSION_MAX_AGE_SECONDS;

export const createAdminSessionToken = async () => {
  const payload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  } satisfies AdminSessionPayload;
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyAdminSessionToken = async (token: string | null | undefined) => {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  try {
    const expectedSignature = await signPayload(encodedPayload);
    if (signature !== expectedSignature) {
      return false;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as Partial<AdminSessionPayload>;
    return (
      payload.role === "admin" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
};

export const getAdminSessionCookieOptions = (isSecure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecure,
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
});

export const resolveSafeAdminRedirectPath = (value: string | null) => {
  if (!value || !value.startsWith("/admin")) {
    return "/admin/dashboard";
  }

  return value;
};
