"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAdminOperatorStatus, ApiError } from "@/lib/api";

export function StatusActions({
  operatorId,
  status,
}: {
  operatorId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "active" | "suspended" | "pending") {
    setError(null);
    setBusy(next);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setAdminOperatorStatus(session.access_token, operatorId, next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
      {status !== "active" && (
        <button
          type="button"
          onClick={() => setStatus("active")}
          disabled={!!busy}
          className="ui rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "active" ? <Loader2 size={13} className="animate-spin" /> : "Approve"}
        </button>
      )}
      {status !== "suspended" && (
        <button
          type="button"
          onClick={() => setStatus("suspended")}
          disabled={!!busy}
          className="ui rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {busy === "suspended" ? <Loader2 size={13} className="animate-spin" /> : "Suspend"}
        </button>
      )}
    </div>
  );
}
