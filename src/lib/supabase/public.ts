import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * A plain, session-independent Supabase client for genuinely public reads
 * (location catalog, route catalog, trip counts — all readable by anon under
 * RLS). Unlike `@/lib/supabase/server`, this never touches `cookies()`, so
 * queries made with it are safe to wrap in `unstable_cache`: Next.js forbids
 * calling cookies()/headers() inside a cached function, which the
 * cookie-aware server client would otherwise trip on.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
