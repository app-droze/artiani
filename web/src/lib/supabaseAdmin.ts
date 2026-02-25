import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envServer } from "@/src/lib/env.server";

let supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      envServer.SUPABASE_URL,
      envServer.SUPABASE_SERVICE_ROLE_KEY,
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
