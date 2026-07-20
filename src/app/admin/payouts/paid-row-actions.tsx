"use client";

import { useState } from "react";
import { FileText, Loader2, Undo2 } from "lucide-react";
import { getAdminPayoutSlipUrl, reopenPayout, ApiError } from "@/lib/api";

export function PaidRowActions({
  token,
  tripId,
  reference,
  onChange,
}: {
  token: string;
  tripId: string;
  reference: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function viewSlip() {
    setError(null);
    setBusy("slip");
    try {
      const { url } = await getAdminPayoutSlipUrl(token, tripId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the slip.");
    } finally {
      setBusy(null);
    }
  }

  async function reopen() {
    setError(null);
    setBusy("reopen");
    try {
      await reopenPayout(token, tripId);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reopen.");
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span className="ui rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          Paid
        </span>
        <button
          type="button"
          onClick={viewSlip}
          disabled={!!busy}
          className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {busy === "slip" ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Slip
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Reopen payout"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
          >
            <Undo2 size={14} />
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={!!busy}
              className="ui rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200"
            >
              No
            </button>
            <button
              type="button"
              onClick={reopen}
              disabled={!!busy}
              className="ui inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {busy === "reopen" ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Reopen
            </button>
          </span>
        )}
      </div>
      {reference && <span className="ui text-[11px] text-slate-400 dark:text-zinc-500">Ref: {reference}</span>}
      {error && <span className="ui text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
