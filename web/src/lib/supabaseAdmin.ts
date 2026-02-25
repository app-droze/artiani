import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envSupabase } from "@/src/lib/env.server";

let supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      envSupabase.SUPABASE_URL,
      envSupabase.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return supabaseAdmin;
};
