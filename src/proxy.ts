import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// DO NOT DELETE THIS FILE, even though the actual routing/locale/auth logic
// lives in the *project-root* `proxy.ts` (../../proxy.ts), not here.
//
// Verified empirically (Next.js 16.2.10): with a `src/` app directory, Next
// requires a `src/proxy.ts` to exist for its file-based middleware discovery
// to register ANY proxy at all — but when a root-level `proxy.ts` is ALSO
// present, that root file's exported `proxy()` is what actually executes.
// Deleting this file (it looks like unused/dead code — it isn't imported by
// anything) silently breaks ALL routing: every request 404s, no error is
// logged, and `next build`'s route table stops listing "Proxy (Middleware)"
// entirely. Confirmed by deleting it and bisecting back — see git history
// around the BusConnect roadmap Stop 00 subdomain-routing work if this ever
// needs re-diagnosing.
//
// Next.js 16 renamed the `middleware` file convention to `proxy` — same API,
// same matcher config. See node_modules/next/dist/docs/.../proxy.md.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimisation.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
