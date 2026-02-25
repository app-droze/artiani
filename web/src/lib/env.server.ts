import "server-only";

type ServerEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  ORDERS_FROM_EMAIL: string;
  ORDERS_ADMIN_EMAIL: string;
};

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const loadServerEnv = (): ServerEnv => {
  const missing: string[] = [];

  const supabaseUrl = readEnv("SUPABASE_URL");
  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  const supabaseServiceRoleKey =
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SECRET_KEY");
  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)");
  }

  const resendApiKey = readEnv("RESEND_API_KEY");
  if (!resendApiKey) {
    missing.push("RESEND_API_KEY");
  }

  const ordersFromEmail = readEnv("ORDERS_FROM_EMAIL");
  if (!ordersFromEmail) {
    missing.push("ORDERS_FROM_EMAIL");
  }

  const ordersAdminEmail = readEnv("ORDERS_ADMIN_EMAIL");
  if (!ordersAdminEmail) {
    missing.push("ORDERS_ADMIN_EMAIL");
  }

  if (missing.length > 0) {
    throw new Error(
      `[env.server] Missing required environment variables: ${missing.join(", ")}. Add them to web/.env.local.`,
    );
  }

  return {
    SUPABASE_URL: supabaseUrl!,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey!,
    RESEND_API_KEY: resendApiKey!,
    ORDERS_FROM_EMAIL: ordersFromEmail!,
    ORDERS_ADMIN_EMAIL: ordersAdminEmail!,
  };
};

export const envServer = loadServerEnv();
