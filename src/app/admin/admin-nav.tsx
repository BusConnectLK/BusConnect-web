import Link from "next/link";
import { LayoutDashboard, Building2, Wallet, Search, Bus } from "lucide-react";

const items = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Operators", href: "/admin/operators", icon: Building2 },
  { label: "Refunds", href: "/admin/refunds", icon: Wallet },
  { label: "Bookings", href: "/admin/bookings", icon: Search },
  { label: "Fleet", href: "/admin/fleet", icon: Bus },
] as const;

export function AdminNav() {
  return (
    <nav className="ui -mx-1 mb-8 flex gap-1 overflow-x-auto pb-1">
      {items.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          <Icon size={15} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
