import { headers } from "next/headers";
import { SiteFooter } from "./site-footer";

// Authenticated app sections (operator/admin workspaces) are their own
// dashboard shell, not a marketing page — no footer, same as most SaaS
// dashboards.
const HIDE_FOOTER_PREFIXES = ["/operator", "/admin"];

// See conditional-header.tsx for why this reads x-effective-path instead of
// usePathname() — a subdomain rewrite is invisible to the browser's URL bar.
export async function ConditionalFooter() {
  const path = (await headers()).get("x-effective-path") ?? "/";
  if (HIDE_FOOTER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return null;
  }
  return <SiteFooter />;
}
