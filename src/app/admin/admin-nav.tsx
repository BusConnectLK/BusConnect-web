"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Wallet, Search, Bus, Route, IdCard, CalendarRange } from "lucide-react";

const items = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Operators", href: "/admin/operators", icon: Building2 },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarRange },
  { label: "Fleet", href: "/admin/fleet", icon: Bus },
  { label: "Routes", href: "/admin/routes", icon: Route },
  { label: "Pilots", href: "/admin/pilots", icon: IdCard },
  { label: "Refunds", href: "/admin/refunds", icon: Wallet },
  { label: "Bookings", href: "/admin/bookings", icon: Search },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`ui flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
