"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

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
        <h1 className="font-heading text-center text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="ui mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">
          Enter your phone number to get a one-time code.
        </p>

        <div className="mt-7">
          <PhoneForm next={next} router={router} />
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />
          <span className="ui text-xs text-slate-400 dark:text-zinc-500">or</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />
        </div>

        <GoogleButton next={next} />
      </div>
    </div>
  );
}

/* ── Google OAuth (redirects to Google, comes back via /auth/confirm) ───── */
function GoogleButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setLoading(true);
    const redirect = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
    // On success the browser navigates away to Google immediately; we only
    // reach here (still mounted) if something went wrong before the redirect.
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={signIn} disabled={loading} className="btn-secondary w-full py-3">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p className="ui mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.12C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/* ── Phone OTP (needs an SMS provider configured in Supabase) ───────────── */
function PhoneForm({
  next,
  router,
}: {
  next: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  if (stage === "otp") {
    return (
      <form onSubmit={verifyOtp} className="flex flex-col gap-4">
        <p className="ui text-sm text-slate-600 dark:text-zinc-400">Enter the code sent to {phone}.</p>
        <Label text="One-time code">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="field tracking-[0.4em]"
          />
        </Label>
        {error && <ErrorText>{error}</ErrorText>}
        <SubmitButton loading={loading} idle="Verify & sign in" busy="Verifying…" />
        <button type="button" onClick={() => setStage("phone")} className="ui text-sm text-slate-500 underline dark:text-zinc-400">
          Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestOtp} className="flex flex-col gap-4">
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
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton loading={loading} idle="Send code" busy="Sending…" />
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
    <button type="submit" disabled={loading} className="btn-primary mt-1 py-3.5">
      {loading && <Loader2 size={18} className="animate-spin" />}
      {loading ? busy : idle}
    </button>
  );
}
