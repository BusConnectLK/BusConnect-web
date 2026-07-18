"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { linkPilotAccount, ApiError } from "@/lib/api";

export function LinkAccountForm({ pilotId }: { pilotId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
      if (!session) return;
      await linkPilotAccount(session.access_token, pilotId, email);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not link this account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Pilot&apos;s BusConnect email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="pilot@gmail.com"
          required
          className="field text-sm"
        />
      </label>
      <p className="ui text-xs text-slate-500 dark:text-zinc-500">
        They must have already signed in to BusConnect themselves — this doesn&apos;t send an invite.
      </p>
      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary self-start py-2.5">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
        {busy ? "Linking…" : "Link account"}
      </button>
    </form>
  );
}
