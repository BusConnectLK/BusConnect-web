"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, Phone, Mail, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

  const [method, setMethod] = useState<"phone" | "email">("phone");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-7">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="ui mt-2 text-sm text-slate-600 dark:text-zinc-400">
          Choose how you&apos;d like to receive your code.
        </p>

        {/* method switcher */}
        <div className="ui mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
          {(["phone", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                method === m
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                  : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              {m === "phone" ? <Phone size={15} /> : <Mail size={15} />}
              {m}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {method === "phone" ? <PhoneForm next={next} router={router} /> : <EmailForm next={next} />}
        </div>
      </div>
    </div>
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

/* ── Email magic link (works with Supabase's built-in email) ────────────── */
function EmailForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const redirect = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck size={32} className="text-brand dark:text-blue-400" />
        <p className="font-heading font-semibold">Check your inbox</p>
        <p className="ui text-sm text-slate-600 dark:text-zinc-400">
          We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="flex flex-col gap-4">
      <Label text="Email address">
        <input
          type="email"
          inputMode="email"
          placeholder="you@email.lk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="field"
        />
      </Label>
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton loading={loading} idle="Email me a link" busy="Sending…" />
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
