"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = getSupabaseBrowserEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient(env.url, env.anonKey);
}

