import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components. Uses the publishable
 * (anon-equivalent) key — safe to ship to the browser. Auth writes here
 * (sign in/out) are mirrored into cookies by the middleware so Server
 * Components and BusConnect-api requests see the same session.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
