import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const env = getSupabaseBrowserEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Route handlers and
          // server actions can, so this helper is still safe to reuse there.
        }
      },
    },
  });
}

