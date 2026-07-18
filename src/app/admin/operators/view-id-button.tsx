"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminIdDocumentUrl, ApiError } from "@/lib/api";

export function ViewIdButton({ operatorId }: { operatorId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { url } = await getAdminIdDocumentUrl(session.access_token, operatorId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        View ID
      </button>
    </div>
  );
}
