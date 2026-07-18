"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";

// Authenticated app sections (operator/admin workspaces) are their own
// dashboard shell, not a marketing page — no footer, same as most SaaS
// dashboards (and the myscope.lk reference this was modeled on).
const HIDE_FOOTER_PREFIXES = ["/operator", "/admin"];

export function ConditionalFooter() {
  const pathname = usePathname();
  if (HIDE_FOOTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <SiteFooter />;
}
