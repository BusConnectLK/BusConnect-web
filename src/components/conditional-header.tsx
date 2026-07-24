"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { WorkspaceHeader } from "./workspace-header";

/**
 * The operator and admin dashboards are their own workspaces, not the
 * passenger site with a sidebar bolted on — mirrors ConditionalFooter, which
 * already hides the marketing footer on these same routes.
 */
export function ConditionalHeader() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <WorkspaceHeader label="Admin" homeHref="/admin" />;
  }
  if (pathname === "/operator" || pathname.startsWith("/operator/")) {
    return <WorkspaceHeader label="Partner" homeHref="/operator" />;
  }
  return <SiteHeader />;
}
