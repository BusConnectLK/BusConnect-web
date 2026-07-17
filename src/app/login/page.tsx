"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Phone OTP sign-in — the primary auth method for the Sri Lankan market.
 * Requires an SMS provider (e.g. Twilio) configured in the Supabase project
 * (Authentication → Providers → Phone) before OTPs will be delivered.
 */
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

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-7">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="ui mt-2 text-sm text-slate-600 dark:text-zinc-400">
          {stage === "phone"
            ? "We'll text you a one-time code."
            : `Enter the code sent to ${phone}.`}
        </p>

        {stage === "phone" ? (
          <form onSubmit={requestOtp} className="mt-6 flex flex-col gap-4">
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Phone number
              <input
                type="tel"
                inputMode="tel"
                placeholder="+94 7X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="field"
              />
            </label>
            {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-1 py-3.5">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 flex flex-col gap-4">
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              One-time code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="field tracking-[0.4em]"
              />
            </label>
            {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-1 py-3.5">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => setStage("phone")}
              className="ui text-sm text-slate-500 underline dark:text-zinc-400"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
