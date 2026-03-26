/**
 * Supabase auth client utilities for the web app.
 */

import { createBrowserClient } from '@supabase/ssr';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase credentials not configured — auth will run in demo mode');
    return null;
  }

  supabaseClient = createBrowserClient(url, key);
  return supabaseClient;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) {
    // Demo mode: simulate successful login
    return { user: { id: 'demo-user', email }, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signUp(email: string, password: string, fullName?: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return { user: { id: 'demo-user', email }, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error?.message || null };
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message || null };
}

export async function getSession() {
  const supabase = getSupabase();
  if (!supabase) {
    return { session: null, user: null };
  }

  const { data: { session } } = await supabase.auth.getSession();
  return { session, user: session?.user || null };
}

export async function getUser() {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
