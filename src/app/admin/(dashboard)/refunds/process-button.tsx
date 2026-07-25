"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processAdminRefund, ApiError } from "@/lib/api";

export function ProcessButton({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await processAdminRefund(session.access_token, refundId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not mark as processed.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={process}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        Mark processed
      </button>
      {error && <p className="ui mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
