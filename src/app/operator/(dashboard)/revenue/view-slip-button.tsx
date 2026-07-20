"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOperatorPayoutSlipUrl, ApiError } from "@/lib/api";

export function ViewSlipButton({ tripId }: { tripId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function view() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { url } = await getOperatorPayoutSlipUrl(session.access_token, tripId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the slip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={view}
        disabled={busy}
        className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Slip
      </button>
      {error && <span className="ui ml-2 text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </>
  );
}
