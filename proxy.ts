import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

// Passenger routes that live under app/[lang]/ and get a locale prefix.
// Everything else (operator, admin, auth, api, assets) stays un-prefixed.
const LOCALIZED_SEGMENTS = new Set(["search", "trips", "bookings", "tickets", "login", "profile"]);

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
 * Two jobs on every request: (1) i18n locale routing for passenger pages, and
 * (2) refreshing the Supabase session cookie so sessions don't silently expire.
 * (Next.js 16 renamed the middleware.ts convention to proxy.ts.)
 */
export async function proxy(request: NextRequest) {
  const { locale, redirectTo } = resolveLocale(request);
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Carry the resolved locale to the app (root layout reads it via headers()).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) triggers a refresh if the access token expired.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
