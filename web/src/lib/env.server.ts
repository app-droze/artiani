import "server-only";

type SupabaseEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type MailEnv = {
  GMAIL_USER: string;
  GMAIL_APP_PASSWORD: string;
  ORDERS_FROM_EMAIL: string;
  ORDERS_ADMIN_EMAIL: string;
};

const readEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const loadSupabaseEnv = (): SupabaseEnv => {
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

  if (missing.length > 0) {
    throw new Error(
      `[env.server] Missing required Supabase environment variables: ${missing.join(", ")}. Add them to web/.env.local.`,
    );
  }

  return {
    SUPABASE_URL: supabaseUrl!,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey!,
  };
};

const loadMailEnv = (): MailEnv | null => {
  const gmailUser = readEnv("GMAIL_USER");
  const gmailAppPassword = readEnv("GMAIL_APP_PASSWORD");
  const ordersFromEmail = readEnv("ORDERS_FROM_EMAIL");
  const ordersAdminEmail = readEnv("ORDERS_ADMIN_EMAIL");

  if (!gmailUser || !gmailAppPassword || !ordersFromEmail || !ordersAdminEmail) {
    return null;
  }

  return {
    GMAIL_USER: gmailUser,
    GMAIL_APP_PASSWORD: gmailAppPassword,
    ORDERS_FROM_EMAIL: ordersFromEmail,
    ORDERS_ADMIN_EMAIL: ordersAdminEmail,
  };
};

export const envSupabase = loadSupabaseEnv();
export const envMail = loadMailEnv();
