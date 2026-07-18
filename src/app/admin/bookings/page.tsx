"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findAdminBookingById, findAdminBookingsByEmail, ApiError, type AdminBooking } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function AdminBookingsPage() {
  const [mode, setMode] = useState<"id" | "email">("id");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminBooking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setSearched(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");

      if (mode === "id") {
        const b = await findAdminBookingById(session.access_token, query.trim());
        setResults([b]);
      } else {
        const list = await findAdminBookingsByEmail(session.access_token, query.trim());
        setResults(list);
      }
    } catch (e) {
      setResults([]);
      setError(e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Booking lookup</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Find any booking platform-wide to help resolve a support ticket.
      </p>

      <form onSubmit={search} className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="ui flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
          {(["id", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                  : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              by {m}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === "id" ? "Booking ID (UUID)" : "passenger@email.com"}
          required
          className="field flex-1"
        />
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && searched && !busy && results.length === 0 && (
        <p className="ui mt-4 text-sm text-slate-500 dark:text-zinc-400">No bookings found.</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {results.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {b.trip?.route?.operator?.name ?? "—"} · Seats {b.seats.join(", ")}
              </p>
              <span className={`ui rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[b.status] ?? ""}`}>
                {b.status.replace("_", " ")}
              </span>
            </div>
            <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Ref {b.id} · booked {new Date(b.created_at).toLocaleString("en-LK")}
              {b.trip && ` · departs ${new Date(b.trip.depart_at).toLocaleString("en-LK")}`}
            </p>
            <p className="mt-2 font-heading font-bold text-brand dark:text-blue-400">
              LKR {Number(b.amount).toLocaleString("en-LK")}
            </p>
            {(b.payments?.length ?? 0) > 0 && (
              <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Payments: {b.payments!.map((p) => `${p.status} (LKR ${p.amount})`).join(", ")}
              </p>
            )}
            {(b.refunds?.length ?? 0) > 0 && (
              <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Refunds: {b.refunds!.map((r) => `${r.status} (LKR ${r.amount})`).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
