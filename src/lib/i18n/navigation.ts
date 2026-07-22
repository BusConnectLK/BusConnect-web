import { isLocale, type Locale } from "./config";

// Routes that are NOT under app/[lang]/ — never prefix these.
const NON_LOCALIZED = /^\/(operator|admin|auth|api)(\/|$)/;

/** Prefix an app path with the active locale, unless it targets a
 * non-localized route (dashboards/auth) or isn't an internal absolute path. */
export function localizePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path; // external URL or bare hash
  if (NON_LOCALIZED.test(path)) return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

/** Remove a leading locale prefix from a pathname, e.g. /si/search → /search. */
export function stripLocale(pathname: string): string {
  const seg = pathname.split("/")[1] ?? "";
  if (isLocale(seg)) return pathname.slice(seg.length + 1) || "/";
  return pathname;
}
