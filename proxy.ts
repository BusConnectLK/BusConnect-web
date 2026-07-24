import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { COOKIE_DOMAIN } from "@/lib/supabase/cookie-domain";

// Passenger routes that live under app/[lang]/ and get a locale prefix.
// Everything else (operator, admin, auth, api, assets) stays un-prefixed.
const LOCALIZED_SEGMENTS = new Set(["search", "trips", "bookings", "tickets", "login", "profile"]);

// partner.busconnect.lk and admin.busconnect.lk serve the existing
// /operator and /admin route trees under the hood — the URL bar shows the
// clean subdomain path (e.g. partner.busconnect.lk/trips/1), Next.js
// internally rewrites to /operator/trips/1. busconnect.lk/www keep serving
// the passenger app exactly as before; the original /operator and /admin
// paths on the main domain also keep working unchanged.
const SUBDOMAIN_PREFIX: Record<string, string> = {
  partner: "/operator",
  admin: "/admin",
};

function detectPreferred(request: NextRequest): Locale {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && isLocale(cookie)) return cookie;
  const al = request.headers.get("accept-language") ?? "";
  if (/(^|,)\s*si\b/i.test(al)) return "si";
  if (/(^|,)\s*ta\b/i.test(al)) return "ta";
  return defaultLocale;
}

function resolveLocale(request: NextRequest): { locale: Locale; redirectTo?: string } {
  const { pathname, search } = request.nextUrl;
  const seg = pathname.split("/")[1] ?? "";

  // Already locale-prefixed → honour it, no redirect.
  if (isLocale(seg)) return { locale: seg };

  const preferred = detectPreferred(request);
  const isLocalizable = pathname === "/" || LOCALIZED_SEGMENTS.has(seg);
  if (isLocalizable) {
    const target = pathname === "/" ? `/${preferred}` : `/${preferred}${pathname}`;
    return { locale: preferred, redirectTo: `${target}${search}` };
  }
  // Non-localized routes (operator/admin/auth/…): no redirect; locale reflects
  // the visitor's preference only so <html lang> is sensible.
  return { locale: preferred };
}

/**
 * Three jobs on every request: (1) subdomain routing for the partner/admin
 * workspaces, (2) i18n locale routing for passenger pages, and (3)
 * refreshing the Supabase session cookie so sessions don't silently expire.
 * (Next.js 16 renamed the middleware.ts convention to proxy.ts — see
 * src/proxy.ts for a required-but-otherwise-inert companion file this
 * project needs; don't delete it.)
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];
  const workspacePrefix = SUBDOMAIN_PREFIX[subdomain];
  const isWorkspaceSubdomain = !!workspacePrefix;

  // On a workspace subdomain, rewrite to the matching route tree first —
  // locale routing below doesn't apply there (operator/admin are English-only
  // dashboards, not under app/[lang]/), so only run it on the main domain.
  let rewriteUrl: URL | undefined;
  if (isWorkspaceSubdomain && !request.nextUrl.pathname.startsWith(workspacePrefix)) {
    rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `${workspacePrefix}${rewriteUrl.pathname === "/" ? "" : rewriteUrl.pathname}`;
  }

  let locale: Locale = defaultLocale;
  if (!isWorkspaceSubdomain) {
    const resolved = resolveLocale(request);
    if (resolved.redirectTo) {
      return NextResponse.redirect(new URL(resolved.redirectTo, request.url));
    }
    locale = resolved.locale;
  }

  // Carry the resolved locale to the app (root layout reads it via headers()).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  function freshResponse() {
    return rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = freshResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { domain: COOKIE_DOMAIN },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = freshResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) triggers a refresh if the access token expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const effectivePath = rewriteUrl?.pathname ?? request.nextUrl.pathname;
  const isAuthRoute = effectivePath.startsWith("/login");
  const isProtectedRoute =
    effectivePath.startsWith("/bookings") ||
    effectivePath.startsWith("/tickets") ||
    effectivePath.startsWith("/operator") ||
    effectivePath.startsWith("/admin");

  if (!user && isProtectedRoute) {
    if (isWorkspaceSubdomain) {
      // /login only exists on the main passenger domain — send the visitor
      // there with an absolute return URL back to where they started. The
      // login page validates this is same-site before ever following it.
      const returnTo = `${request.nextUrl.protocol}//${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
      const loginUrl = new URL("/login", "https://www.busconnect.lk");
      loginUrl.searchParams.set("next", returnTo);
      return NextResponse.redirect(loginUrl);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
