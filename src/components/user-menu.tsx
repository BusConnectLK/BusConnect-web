"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Building2, ShieldCheck, LogOut, ChevronDown, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyRoles, getMyProfile, type MyRoles } from "@/lib/api";

interface Identity {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export function UserMenu() {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined); // undefined = loading
  const [roles, setRoles] = useState<MyRoles | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIdentity(null);
        return;
      }
      // Google (and most OAuth) sign-ins populate these on user_metadata;
      // phone/email OTP sign-ins won't have them, so the UI falls back to
      // an initial-letter avatar for those. The passenger's own edited
      // /me/profile (name + photo) takes priority over both when set.
      const meta = session.user.user_metadata ?? {};
      let profileName: string | undefined;
      let profileAvatar: string | undefined;
      try {
        const profile = await getMyProfile(session.access_token);
        profileName = profile.name ?? undefined;
        profileAvatar = profile.avatar_url ?? undefined;
      } catch {
        // fall through to auth metadata below
      }
      setIdentity({
        email: session.user.email ?? "",
        fullName: profileName ?? (meta.full_name as string) ?? (meta.name as string) ?? undefined,
        avatarUrl: profileAvatar ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? undefined,
      });
      try {
        setRoles(await getMyRoles(session.access_token));
      } catch {
        setRoles(null);
      }
    }
    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void load());
    window.addEventListener("passenger-profile-updated", load);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("passenger-profile-updated", load);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (identity === undefined) {
    return <span className="h-9 w-20 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />;
  }

  if (identity === null) {
    return (
      <Link
        href="/login"
        className="rounded-xl bg-brand px-4 py-2 font-semibold text-brand-fg transition-colors duration-300 hover:bg-brand-hover"
      >
        Sign in
      </Link>
    );
  }

  const initial = (identity.fullName ?? identity.email).charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={28} />
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="ui absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-zinc-900">
            <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={40} />
            <div className="min-w-0">
              {identity.fullName && <p className="truncate text-sm font-medium">{identity.fullName}</p>}
              <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{identity.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <MenuLink href="/profile" icon={UserCircle} onClick={() => setOpen(false)}>
              Profile
            </MenuLink>
            <MenuLink href="/tickets" icon={Ticket} onClick={() => setOpen(false)}>
              My tickets
            </MenuLink>
            {roles?.isOperator && (
              <MenuLink href="/operator" icon={Building2} onClick={() => setOpen(false)}>
                {roles.operatorRole === "pilot" ? "Conductor dashboard" : "Operator dashboard"}
              </MenuLink>
            )}
            {roles?.isAdmin && (
              <MenuLink href="/admin" icon={ShieldCheck} onClick={() => setOpen(false)}>
                Admin dashboard
              </MenuLink>
            )}
          </div>

          <div className="border-t border-slate-100 p-1.5 dark:border-zinc-900">
            <button
              type="button"
              onClick={signOut}
              className="ui flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Google/OAuth profile photo when available, else an initial-letter circle. */
function Avatar({
  avatarUrl,
  initial,
  size,
}: {
  avatarUrl?: string;
  initial: string;
  size: number;
}) {
  const [broken, setBroken] = useState(false);

  if (avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external OAuth provider URL, not a local/optimizable asset
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-fg"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="ui flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      <Icon size={16} className="text-slate-400 dark:text-zinc-500" />
      {children}
    </Link>
  );
}
