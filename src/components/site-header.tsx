"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search, Route, HelpCircle, Ticket, Building2 } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { label: "Search buses", href: "/", icon: Search },
  { label: "Popular routes", href: "/#routes", icon: Route },
  { label: "How it works", href: "/#how", icon: HelpCircle },
  { label: "For operators", href: "/#operators", icon: Building2 },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
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
            <Link
              href="/login"
              className="hidden rounded-xl bg-brand px-4 py-2 font-semibold text-brand-fg shadow-lg shadow-brand/20 transition-colors duration-300 hover:bg-brand-hover sm:inline-flex"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400 lg:hidden"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
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
          <span className="ui ml-auto flex items-center gap-1.5 py-3 text-sm font-medium text-white/80">
            <Ticket size={15} /> Instant e-tickets
          </span>
        </nav>
      </div>

      {/* Mobile overlay menu */}
      {open && (
        <div className="border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-black lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="ui flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Icon size={17} className="text-brand dark:text-blue-400" />
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 w-full py-3"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
