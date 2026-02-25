import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvServer } from "@/src/lib/env.server";

let supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    const envServer = getEnvServer();
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
