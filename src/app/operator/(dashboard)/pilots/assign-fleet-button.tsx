"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ChevronDown, Loader2, Route, Ticket, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { assignPilot, ApiError } from "@/lib/api";

const ROLES = [
  { value: "driver", label: "Driver", icon: Car },
  { value: "conductor", label: "Conductor", icon: Ticket },
] as const;

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

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="ui inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Route size={13} /> Assign to fleet
      </button>

      {open && (
        // Floats above the page instead of sitting in normal flow, so
        // opening it never grows the pilot row/card it's anchored to.
        <div className="card-lg absolute right-0 top-full z-20 mt-2 w-72 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="ui flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              <Route size={15} className="text-brand dark:text-blue-400" /> Assign to fleet
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              aria-label="Close"
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X size={15} />
            </button>
          </div>

          <label className="ui mt-4 flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
            Bus
            <div className="relative">
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                className="field appearance-none pr-9 text-sm"
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

          <div className="mt-4">
            <p className="ui mb-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">Role</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`ui flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                    role === value
                      ? "bg-brand text-brand-fg"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="ui mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="ui flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || busOptions.length === 0}
              className="ui flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : "Save assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
