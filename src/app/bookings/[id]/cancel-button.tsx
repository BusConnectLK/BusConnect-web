"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelBooking, ApiError } from "@/lib/api";

/** Mirrors BookingsService's refund tiers — see plan "easy refunds". Preview only; the server is authoritative. */
function previewRefundPct(departAt: string): number {
  const hours = (new Date(departAt).getTime() - Date.now()) / 3_600_000;
  if (hours >= 24) return 100;
  if (hours >= 3) return 50;
  return 0;
}

export function CancelButton({
  bookingId,
  amount,
  departAt,
}: {
  bookingId: string;
  amount: number;
  departAt: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = previewRefundPct(departAt);
  const previewAmount = Math.round(amount * pct) / 100;

  async function confirmCancel() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/bookings/${bookingId}`);
        return;
      }
      await cancelBooking(session.access_token, bookingId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel this booking. Try again.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        <XCircle size={15} /> Cancel booking
      </button>
    );
  }

  return (
    <div className="card border-red-200 p-4 dark:border-red-900/50">
      <p className="font-medium">Cancel this booking?</p>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        {pct > 0 ? (
          <>
            You&apos;ll get back <strong>LKR {previewAmount.toLocaleString("en-LK")}</strong> ({pct}% —
            based on how close to departure this is).
          </>
        ) : (
          "This is inside the no-refund window, so no amount will be returned."
        )}
      </p>
      {error && <p className="ui mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirmCancel}
          disabled={busy}
          className="ui inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="ui rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Keep booking
        </button>
      </div>
    </div>
  );
}
