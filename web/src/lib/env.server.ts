import "server-only";

type SupabaseEnv = {
  SUPABASE_URL: string;
  SUPABASE_ADMIN_KEY: string;
};

type SupabaseEnvDiagnostics = {
  hasSupabaseUrl: boolean;
  hasSupabaseServiceRoleKey: boolean;
  hasSupabaseSecretKey: boolean;
  chosenAdminKeyEnv: "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_SECRET_KEY" | null;
};

type MailEnv = {
  GMAIL_USER: string;
  GMAIL_APP_PASSWORD: string;
  ORDERS_FROM_EMAIL: string;
  ORDERS_ADMIN_EMAIL: string;
};

type MailEnvDiagnostics = {
  hasGmailUser: boolean;
  hasGmailAppPassword: boolean;
  hasOrdersFromEmail: boolean;
  hasOrdersAdminEmail: boolean;
};

type PublicBaseUrlEnvName =
  | "PUBLIC_BASE_URL"
  | "NEXT_PUBLIC_SITE_URL"
  | "VERCEL_PROJECT_PRODUCTION_URL"
  | "VERCEL_URL";

type PublicBaseUrlDiagnostics = {
  hasConfiguredPublicBaseUrl: boolean;
  chosenPublicBaseUrlEnv: PublicBaseUrlEnvName | null;
  usesLocalhostFallback: boolean;
  isVercelRuntime: boolean;
};

const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";

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
    readEnv("SUPABASE_SECRET_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  }

  if (missing.length > 0) {
    throw new Error(
      `[env.server] Missing required Supabase environment variables: ${missing.join(", ")}. Add them to web/.env.local.`,
    );
  }

  return {
    SUPABASE_URL: supabaseUrl!,
    SUPABASE_ADMIN_KEY: supabaseServiceRoleKey!,
  };
};

const loadSupabaseEnvDiagnostics = (): SupabaseEnvDiagnostics => ({
  hasSupabaseUrl: Boolean(readEnv("SUPABASE_URL")),
  hasSupabaseServiceRoleKey: Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY")),
  hasSupabaseSecretKey: Boolean(readEnv("SUPABASE_SECRET_KEY")),
  chosenAdminKeyEnv: readEnv("SUPABASE_SECRET_KEY")
    ? "SUPABASE_SECRET_KEY"
    : readEnv("SUPABASE_SERVICE_ROLE_KEY")
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : null,
});

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

const loadMailEnvDiagnostics = (): MailEnvDiagnostics => ({
  hasGmailUser: Boolean(readEnv("GMAIL_USER")),
  hasGmailAppPassword: Boolean(readEnv("GMAIL_APP_PASSWORD")),
  hasOrdersFromEmail: Boolean(readEnv("ORDERS_FROM_EMAIL")),
  hasOrdersAdminEmail: Boolean(readEnv("ORDERS_ADMIN_EMAIL")),
});

const PUBLIC_BASE_URL_ENV_PRIORITY: PublicBaseUrlEnvName[] = [
  "PUBLIC_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
];

const getConfiguredPublicBaseUrl = () => {
  for (const envName of PUBLIC_BASE_URL_ENV_PRIORITY) {
    const value = readEnv(envName);
    if (value) {
      return { envName, value };
    }
  }

  return null;
};

const isVercelRuntime = () =>
  Boolean(
    readEnv("VERCEL") ||
    readEnv("VERCEL_ENV") ||
    readEnv("VERCEL_URL") ||
    readEnv("VERCEL_PROJECT_PRODUCTION_URL"),
  );

const canUseLocalhostPublicBaseUrl = () =>
  !isVercelRuntime() && !readEnv("CI");

const normalizePublicBaseUrl = (value: string) => {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "") || DEFAULT_PUBLIC_BASE_URL;
};

const resolvePublicBaseUrl = () => {
  const configured = getConfiguredPublicBaseUrl();

  if (configured) {
    return {
      value: normalizePublicBaseUrl(configured.value),
      diagnostics: {
        hasConfiguredPublicBaseUrl: true,
        chosenPublicBaseUrlEnv: configured.envName,
        usesLocalhostFallback: false,
        isVercelRuntime: isVercelRuntime(),
      } satisfies PublicBaseUrlDiagnostics,
    };
  }

  if (canUseLocalhostPublicBaseUrl()) {
    return {
      value: DEFAULT_PUBLIC_BASE_URL,
      diagnostics: {
        hasConfiguredPublicBaseUrl: false,
        chosenPublicBaseUrlEnv: null,
        usesLocalhostFallback: true,
        isVercelRuntime: false,
      } satisfies PublicBaseUrlDiagnostics,
    };
  }

  throw new Error(
    "[env.server] Missing required public site URL. In Vercel production set PUBLIC_BASE_URL (preferred) or NEXT_PUBLIC_SITE_URL. Accepted fallbacks are VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL.",
  );
};

export const envSupabase = loadSupabaseEnv();
export const supabaseEnvDiagnostics = loadSupabaseEnvDiagnostics();
export const envMail = loadMailEnv();
export const mailEnvDiagnostics = loadMailEnvDiagnostics();
export const getPublicBaseUrl = () => resolvePublicBaseUrl().value;
export const getPublicBaseUrlDiagnostics = () => resolvePublicBaseUrl().diagnostics;
