"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  Search,
  Route,
  Ticket,
  UserCircle,
  Building2,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, Avatar } from "./user-menu";
import { useIdentity } from "@/lib/use-identity";

// "Operator dashboard" is deliberately not a static item here — the drawer's
// Account section shows it (or "Become an operator") contextually based on
// the signed-in user's actual role/status, which a fixed public nav link can't do.
const navItems = [
  { label: "Search buses", href: "/", icon: Search },
  { label: "Popular routes", href: "/#routes", icon: Route },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <>
    <header className="sticky top-0 z-50">
      {/* Top bar — utility */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          <div className="ui flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-1.5 text-slate-500 dark:text-zinc-400 md:flex">
              {today}
            </span>
            <span className="hidden rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-zinc-800 dark:text-zinc-400 sm:inline">
              EN · සිං · த
            </span>
            <ThemeToggle />
            <span className="hidden sm:inline-flex">
              <UserMenu />
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400 lg:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar — primary nav (brand) */}
      <div className="hidden bg-brand text-brand-fg lg:block">
        <nav className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="ui flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-white/90 transition-colors duration-300 hover:border-white hover:text-white"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          <Link
            href="/tickets"
            className="ui flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-white/90 transition-colors duration-300 hover:border-white hover:text-white"
          >
            <Ticket size={15} />
            My tickets
          </Link>
          <span className="ui ml-auto flex items-center gap-1.5 py-3 text-sm font-medium text-white/80">
            <Ticket size={15} /> Instant e-tickets
          </span>
        </nav>
      </div>

      <MobileDrawer open={open} onClose={() => setOpen(false)} />
    </header>
    <MobileBottomNav onOpenMenu={() => setOpen(true)} />
    </>
  );
}

function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const tabs = [
    { label: "Search", href: "/", icon: Search },
    { label: "Routes", href: "/#routes", icon: Route },
    { label: "Tickets", href: "/tickets", icon: Ticket },
    { label: "Profile", href: "/profile", icon: UserCircle },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-zinc-800 dark:bg-black/95 lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={`ui flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? "text-brand dark:text-blue-400"
                  : "text-slate-500 dark:text-zinc-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="ui flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-500 transition-colors dark:text-zinc-500"
        >
          <Menu size={20} />
          Menu
        </button>
      </div>
    </nav>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { identity, roles, signOut: doSignOut } = useIdentity();

  async function signOut() {
    await doSignOut();
    onClose();
    router.push("/");
    router.refresh();
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const initial = identity ? (identity.fullName ?? identity.email).charAt(0).toUpperCase() : "";

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-zinc-900">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ui flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Browse
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Icon size={17} className="text-brand dark:text-blue-400" />
                {label}
              </Link>
            ))}
          </nav>

          <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Account
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            <Link
              href="/tickets"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Ticket size={17} className="text-brand dark:text-blue-400" />
              My tickets
            </Link>
            {identity && (
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <UserCircle size={17} className="text-brand dark:text-blue-400" />
                Profile
              </Link>
            )}
            {roles?.isOperator && (
              <Link
                href="/operator"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Building2 size={17} className="text-brand dark:text-blue-400" />
                {roles.operatorRole === "pilot" ? "Conductor dashboard" : "Operator dashboard"}
              </Link>
            )}
            {roles?.isAdmin && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <ShieldCheck size={17} className="text-brand dark:text-blue-400" />
                Admin dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="ui border-t border-slate-100 p-4 dark:border-zinc-900">
          {identity ? (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={40} />
                <div className="min-w-0">
                  {identity.fullName && (
                    <p className="truncate text-sm font-medium">{identity.fullName}</p>
                  )}
                  <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{identity.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <button type="button" onClick={() => go("/login")} className="btn-primary w-full">
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
