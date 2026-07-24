"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { goTo } from "@/lib/safe-redirect";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mb-8 flex justify-center">
          <Logo height={44} />
        </div>
        <h1 className="font-heading text-center text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="ui mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">
          Sign in with your phone number and password.
        </p>

        <div className="mt-7">
          <PhoneForm next={next} router={router} />
        </div>
      </div>
    </div>
  );
}

/* ── Phone + password ─────────────────────────────────────────────────── */
function PhoneForm({
  next,
  router,
}: {
  next: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ phone, password });
    setLoading(false);
    if (error) return setError(error.message);
    goTo(router, next);
  }

  return (
    <form onSubmit={signIn} className="flex flex-col gap-4">
      <Label text="Phone number">
        <input
          type="tel"
          inputMode="tel"
          placeholder="+94 7X XXX XXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="field"
        />
      </Label>
      <Label text="Password">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="field"
        />
      </Label>
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton loading={loading} idle="Sign in" busy="Signing in…" />
      <p className="ui text-center text-sm text-slate-600 dark:text-zinc-400">
        New to BusConnect?{" "}
        <Link
          href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand underline dark:text-blue-400"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────── */
function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
      {text}
      {children}
    </label>
  );
}
function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="ui text-sm text-red-600 dark:text-red-400">{children}</p>;
}
function SubmitButton({ loading, idle, busy }: { loading: boolean; idle: string; busy: string }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary mt-1">
      {loading && <Loader2 size={18} className="animate-spin" />}
      {loading ? busy : idle}
    </button>
  );
}
