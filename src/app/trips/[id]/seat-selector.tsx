"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createHold, createBooking, ApiError, type SeatLayout } from "@/lib/api";

interface Props {
  tripId: string;
  layout: SeatLayout | null;
  seatCount: number;
  initialTaken: string[];
  farePerSeat: number;
  fromStopId: string;
  toStopId: string;
}

/** A sensible default when an operator hasn't defined a layout: 2+2 seating. */
function defaultLayout(seatCount: number): SeatLayout {
  return { rows: Math.ceil(seatCount / 4), cols: ["A", "B", null, "C", "D"] };
}

/** Expand a layout into ordered seat labels, capped at seatCount. */
function seatLabels(layout: SeatLayout, seatCount: number): string[] {
  const labels: string[] = [];
  for (let r = 1; r <= layout.rows; r++) {
    for (const col of layout.cols) {
      if (col === null) continue;
      if (labels.length >= seatCount) return labels;
      labels.push(`${r}${col}`);
    }
  }
  return labels;
}

export function SeatSelector(props: Props) {
  const { tripId, seatCount, farePerSeat, fromStopId, toStopId } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const layout = props.layout ?? defaultLayout(seatCount);
  const [taken, setTaken] = useState<Set<string>>(new Set(props.initialTaken));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull the current set of taken seats straight from Supabase (public read).
  const refreshTaken = useCallback(async () => {
    const { data } = await supabase
      .from("seat_holds")
      .select("seat_no, status, expires_at")
      .eq("trip_id", tripId);
    if (!data) return;
    const now = Date.now();
    const active = data
      .filter(
        (h) =>
          h.status === "booked" ||
          (h.status === "held" && new Date(h.expires_at).getTime() > now),
      )
      .map((h) => h.seat_no);
    setTaken(new Set(active));
  }, [supabase, tripId]);

  // Live seat updates: anyone holding/booking/releasing a seat on this trip.
  useEffect(() => {
    const channel = supabase
      .channel(`seat_holds:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seat_holds",
          filter: `trip_id=eq.${tripId}`,
        },
        () => void refreshTaken(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, tripId, refreshTaken]);

  function toggle(label: string) {
    if (taken.has(label)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleContinue() {
    setError(null);
    if (selected.size === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/trips/${tripId}`);
      return;
    }

    setBusy(true);
    try {
      const hold = await createHold(session.access_token, {
        tripId,
        seats: [...selected],
      });
      const booking = await createBooking(session.access_token, {
        holdGroup: hold.hold_group,
        fromStopId,
        toStopId,
      });
      router.push(`/bookings/${booking.booking_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("Some of those seats were just taken. Please pick again.");
        setSelected(new Set());
        void refreshTaken();
      } else {
        setError(
          e instanceof ApiError ? e.message : "Something went wrong. Try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const labels = seatLabels(layout, seatCount);
  const total = selected.size * farePerSeat;

  return (
    <div>
      <div className="card p-5 sm:p-6">
        <div className="ui mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          Front of bus
        </div>
        <div className="ui mb-5 flex justify-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-slate-300 dark:border-zinc-600" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-brand" />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-slate-300 dark:bg-zinc-700" />
            Taken
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          {Array.from({ length: layout.rows }).map((_, r) => {
            const row = r + 1;
            return (
              <div key={row} className="flex items-center gap-2">
                {layout.cols.map((col, ci) => {
                  if (col === null)
                    return <span key={ci} className="w-6" aria-hidden />;
                  const label = `${row}${col}`;
                  if (!labels.includes(label))
                    return <span key={ci} className="h-9 w-9" aria-hidden />;
                  const isTaken = taken.has(label);
                  const isSelected = selected.has(label);
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={isTaken || busy}
                      onClick={() => toggle(label)}
                      aria-pressed={isSelected}
                      className={[
                        "ui h-9 w-9 rounded-lg text-xs font-medium transition-colors duration-200",
                        isTaken
                          ? "cursor-not-allowed bg-slate-200 text-transparent dark:bg-zinc-700"
                          : isSelected
                            ? "bg-brand text-brand-fg shadow-md shadow-brand/30"
                            : "border border-slate-300 bg-white text-slate-700 hover:border-brand hover:text-brand dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {/* sticky action bar */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="ui pl-2 text-sm">
          {selected.size > 0 ? (
            <>
              <span className="font-semibold">{[...selected].join(", ")}</span>
              <span className="text-slate-400"> · </span>
              <span className="font-heading font-bold text-brand dark:text-blue-400">
                LKR {total.toLocaleString("en-LK")}
              </span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-zinc-400">No seats selected</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.size === 0 || busy}
          className="btn-primary"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Holding…
            </>
          ) : (
            <>
              Continue <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
