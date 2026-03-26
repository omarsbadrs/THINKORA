/**
 * Supabase client factory for server-side use.
 *
 * Accepts environment-based configuration with fallback to demo mode
 * when no credentials are available (useful for local development).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseClientOptions {
  /** Supabase project URL (e.g., https://xxx.supabase.co) */
  supabaseUrl?: string;
  /** Service role key — bypasses RLS, use only server-side */
  serviceRoleKey?: string;
  /** Anon key — respects RLS, safe for client-side */
  anonKey?: string;
}

/** Demo/local fallback URL used when no env vars are set */
const DEMO_URL = "http://127.0.0.1:54321";
const DEMO_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const DEMO_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

let _isDemoMode = false;

/**
 * Returns true if the client was created in demo/local mode
 * (i.e., no real credentials were provided).
 */
export function isDemoMode(): boolean {
  return _isDemoMode;
}

/**
 * Create a Supabase client configured for server-side use.
 *
 * Resolution order for each config value:
 * 1. Explicit option parameter
 * 2. Environment variable
 * 3. Demo/local fallback
 */
export function createServerClient(
  opts?: SupabaseClientOptions
): SupabaseClient {
  const url =
    opts?.supabaseUrl ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    opts?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const anonKey =
    opts?.anonKey ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Determine if we're in demo mode
  const resolvedUrl = url ?? DEMO_URL;
  const resolvedKey = serviceKey ?? anonKey ?? DEMO_ANON_KEY;
  _isDemoMode = !url;

  if (_isDemoMode) {
    console.warn(
      "[@thinkora/db] No SUPABASE_URL found. Running in demo mode against local Supabase."
    );
  }

  return createClient(resolvedUrl, resolvedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase admin client that uses the service role key.
 * This bypasses RLS and should only be used in trusted server contexts.
 */
export function createAdminClient(
  opts?: SupabaseClientOptions
): SupabaseClient {
  const url =
    opts?.supabaseUrl ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    opts?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const resolvedUrl = url ?? DEMO_URL;
  const resolvedKey = serviceKey ?? DEMO_SERVICE_KEY;
  _isDemoMode = !url;

  if (!serviceKey && !_isDemoMode) {
    console.warn(
      "[@thinkora/db] No SUPABASE_SERVICE_ROLE_KEY found. Admin client may not have elevated privileges."
    );
  }

  return createClient(resolvedUrl, resolvedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
