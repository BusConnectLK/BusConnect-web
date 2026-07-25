"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { PhoneField } from "@/components/phone-field";
import { toE164 } from "@/lib/phone";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

/**
 * Verifying the OTP itself completes sign-in (Supabase treats a correct
 * phone OTP as a full authentication, same as it does during sign-up) —
 * so by the time the user reaches the "new password" stage they already
 * have a live session, and updateUser({ password }) just sets it on that
 * session. No separate "reset token" concept needed.
 */
function ForgotPasswordForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"phone" | "otp" | "password">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({ phone: toE164(phone) });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("otp");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: otp, type: "sms" });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("password");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mb-8 flex justify-center">
          <Logo height={44} />
        </div>
        <h1 className="font-heading text-center text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="ui mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">
          {stage === "phone" && "Enter your phone number and we'll send you a code."}
          {stage === "otp" && `Enter the code sent to ${toE164(phone)}.`}
          {stage === "password" && "Choose a new password for your account."}
        </p>

        <div className="mt-7">
          {stage === "phone" && (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <Label text="Phone number">
                <PhoneField value={phone} onChange={setPhone} required />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <SubmitButton loading={loading} idle="Send code" busy="Sending…" />
            </form>
          )}

          {stage === "otp" && (
            <form onSubmit={verifyCode} className="flex flex-col gap-4">
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
              <SubmitButton loading={loading} idle="Verify code" busy="Verifying…" />
            </form>
          )}

          {stage === "password" && (
            <form onSubmit={setNewPassword} className="flex flex-col gap-4">
              <Label text="New password">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field"
                />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <SubmitButton loading={loading} idle="Save new password" busy="Saving…" />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

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
