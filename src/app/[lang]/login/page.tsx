"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      shape?: string;
      text?: string;
      width?: string;
    },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

/** SHA-256 hex digest — Supabase's ID-token sign-in wants the *hashed* nonce
 * baked into the Google credential, and the original raw nonce back at
 * verification time, as replay protection. */
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

/* ── Google Identity Services (native sign-in — the consent screen shows
   busconnect.lk, since Google talks to this domain directly instead of
   redirecting through Supabase's own domain) ─────────────────────────────── */
function GoogleButton({ next }: { next: string }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string>("");
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !buttonRef.current || !window.google) return;

    let cancelled = false;
    let cleanupResize: (() => void) | undefined;
    void (async () => {
      const nonce = crypto.randomUUID();
      const hashedNonce = await sha256Hex(nonce);
      if (cancelled || !window.google || !buttonRef.current) return;
      nonceRef.current = nonce;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError(null);
          const { error } = await createClient().auth.signInWithIdToken({
            provider: "google",
            token: credential,
            nonce: nonceRef.current,
          });
          if (error) return setError(error.message);
          router.push(next);
          router.refresh();
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });

      // Google's button width must be a fixed pixel value (no responsive
      // percentage support) — measure the actual available space instead of
      // hardcoding one, or it overflows narrower screens and gets clipped.
      // Re-measure on resize/rotation so it stays correctly sized.
      function renderAtCurrentWidth() {
        if (!buttonRef.current || !window.google) return;
        buttonRef.current.innerHTML = "";
        const width = Math.min(400, Math.round(buttonRef.current.offsetWidth));
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: String(width),
        });
      }
      renderAtCurrentWidth();
      window.addEventListener("resize", renderAtCurrentWidth);
      cleanupResize = () => window.removeEventListener("resize", renderAtCurrentWidth);
    })();

    return () => {
      cancelled = true;
      cleanupResize?.();
    };
  }, [scriptReady, router, next]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={buttonRef} className="flex w-full justify-center [&>div]:w-full" />
      {error && <p className="ui mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
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
