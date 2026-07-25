"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PhoneField } from "@/components/phone-field";
import { toE164 } from "@/lib/phone";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

/**
 * Same account/auth as everywhere else — phone + password. This page exists
 * so admin staff land on admin.busconnect.lk without passenger-app chrome,
 * not because the underlying auth is different. There's no public sign-up
 * here on purpose: admin_users rows are granted directly, not self-applied.
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ phone: toE164(phone), password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <ShieldCheck size={22} />
          </span>
          <h1 className="font-heading text-center text-2xl font-bold tracking-tight">Admin Console</h1>
        </div>
        <p className="ui text-center text-sm text-slate-600 dark:text-zinc-400">
          Sign in with your BusConnect phone number and password.
        </p>

        <form onSubmit={signIn} className="mt-7 flex flex-col gap-4">
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Phone number
            <PhoneField value={phone} onChange={setPhone} required />
          </label>
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field"
            />
          </label>
          <a
            href="https://www.busconnect.lk/forgot-password"
            className="ui -mt-2 self-end text-sm font-medium text-brand underline dark:text-blue-400"
          >
            Forgot password?
          </a>
          {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
