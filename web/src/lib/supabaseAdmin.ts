import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envSupabase, supabaseEnvDiagnostics } from "@/src/lib/env.server";

let supabaseAdmin: SupabaseClient | null = null;
let hasLoggedSupabaseAdminInit = false;

const logSupabaseAdminInit = (message: string) => {
  if (hasLoggedSupabaseAdminInit) {
    return;
  }

  hasLoggedSupabaseAdminInit = true;
  console.info("[supabase.admin]", message, supabaseEnvDiagnostics);
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    logSupabaseAdminInit("creating admin Supabase client");
    try {
      supabaseAdmin = createClient(
        envSupabase.SUPABASE_URL,
        envSupabase.SUPABASE_ADMIN_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Supabase admin init error";
      console.error("[supabase.admin] createClient failed", {
        ...supabaseEnvDiagnostics,
        message,
      });
      throw error;
    }
  }

  return supabaseAdmin;
};
