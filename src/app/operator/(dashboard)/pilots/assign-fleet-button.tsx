"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { assignPilot, ApiError } from "@/lib/api";

export function AssignFleetButton({
  pilotId,
  busOptions,
  disabled,
  disabledReason,
}: {
  pilotId: string;
  busOptions: { id: string; label: string }[];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busId, setBusId] = useState(busOptions[0]?.id ?? "");
  const [role, setRole] = useState<"driver" | "conductor">("driver");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!busId) {
      setError("No approved buses available yet.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await assignPilot(session.access_token, pilotId, { busId, role });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not assign this pilot.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="ui inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Route size={13} /> Assign to fleet
      </button>
    );
  }

  return (
    <div className="card flex flex-col gap-2.5 p-3">
      <label className="ui flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-zinc-400">
        Bus
        <div className="relative">
          <select
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            className="field appearance-none pr-8 text-sm"
          >
            {busOptions.length === 0 && <option value="">No approved buses yet</option>}
            {busOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
          />
        </div>
      </label>

      <div className="flex gap-2">
        {(["driver", "conductor"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`ui flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              role === r
                ? "bg-brand text-brand-fg"
                : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {error && <p className="ui text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="ui flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || busOptions.length === 0}
          className="ui flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}
