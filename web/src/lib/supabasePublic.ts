import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : null;

const publicSupabaseDiagnostics = {
  hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  hasNextPublicSupabasePublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  hasNextPublicSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  chosenPublicKeyEnv: publicKeyEnv,
};

let hasLoggedPublicClientInit = false;

const logSupabasePublicInit = (message: string) => {
  if (typeof window !== "undefined" || hasLoggedPublicClientInit) {
    return;
  }

  hasLoggedPublicClientInit = true;
  console.info("[supabase.public]", message, publicSupabaseDiagnostics);
};

if (!supabaseUrl) {
  logSupabasePublicInit("missing public Supabase URL");
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseKey) {
  logSupabasePublicInit("missing public Supabase key");
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

logSupabasePublicInit("creating public Supabase client");
export const supabasePublic = createClient(supabaseUrl, supabaseKey);

export const getSupabasePublicReadClient = () => supabasePublic;
