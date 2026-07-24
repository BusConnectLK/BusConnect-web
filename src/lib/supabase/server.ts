import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COOKIE_DOMAIN } from './cookie-domain';

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads the session from cookies (set by the middleware). Writes
 * (setAll) are wrapped in try/catch because Server Components can't set
 * cookies — that's fine as long as the middleware also refreshes the session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { domain: COOKIE_DOMAIN },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the
            // middleware refreshes the session on every request instead.
          }
        },
      },
    },
  );
}
