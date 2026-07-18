"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { applyAsOperator, ApiError } from "@/lib/api";

export default function ApplyOperatorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/apply");
        return;
      }
      await applyAsOperator(session.access_token, name);
      router.push("/operator");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not submit your application. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Apply as an operator</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Tell us your fleet&apos;s name. BusConnect will review your application before you can
        schedule trips.
      </p>

      <form onSubmit={submit} className="card mt-6 flex flex-col gap-4 p-6">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Fleet / company name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Southern Express (Pvt) Ltd"
            required
            minLength={2}
            className="field"
          />
        </label>

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-1 py-3.5">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
