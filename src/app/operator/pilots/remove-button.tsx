"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { removePilot, ApiError } from "@/lib/api";

export function RemoveButton({ pilotUserId }: { pilotUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await removePilot(session.access_token, pilotUserId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
        Remove
      </button>
      {error && <p className="ui mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
