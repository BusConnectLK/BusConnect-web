import Link from "next/link";
import { Wallet, Armchair } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorManifest, ApiError, type OperatorManifest, type SeatLayout } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  reserved_unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  refunded: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function defaultLayout(seatCount: number): SeatLayout {
  return { rows: Math.ceil(seatCount / 4), cols: ["A", "B", null, "C", "D"] };
}

export default async function OperatorManifestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/operator/trips/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this manifest
      </Link>
    );
  }

  let manifest: OperatorManifest | null = null;
  let error: string | null = null;
  try {
    manifest = await getOperatorManifest(session.access_token, id);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !manifest) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Manifest not found."}
      </p>
    );
  }

  const layout = manifest.layout ?? defaultLayout(40);
  const taken = new Set(manifest.taken);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Trip manifest</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <Wallet size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Revenue</p>
            <p className="font-heading text-xl font-bold text-brand dark:text-blue-400">
              LKR {Number(manifest.revenue).toLocaleString("en-LK")}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <Armchair size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Seats booked</p>
            <p className="font-heading text-xl font-bold">{manifest.taken.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* seat map (read-only) */}
        <div className="lg:col-span-5">
          <h2 className="mb-3 font-heading text-lg font-semibold">Seat map</h2>
          <div className="card p-5">
            <div className="flex flex-col items-center gap-2">
              {(() => {
                // Matches seatLabels()'s iteration order in the passenger
                // seat-selector: labels[i] overrides the computed `${row}${col}`
                // label when a custom numbering scheme was registered.
                let flatIndex = 0;
                return Array.from({ length: layout.rows }).map((_, r) => {
                  const row = r + 1;
                  return (
                    <div key={row} className="flex items-center gap-2">
                      {layout.cols.map((col, ci) => {
                        if (col === null) return <span key={ci} className="w-6" aria-hidden />;
                        const idx = flatIndex++;
                        const label = layout.labels?.[idx] ?? `${row}${col}`;
                        const isTaken = taken.has(label);
                        return (
                          <span
                            key={ci}
                            className={`ui flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium ${
                              isTaken
                                ? "bg-brand text-brand-fg"
                                : "border border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600"
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* bookings list */}
        <div className="lg:col-span-7">
          <h2 className="mb-3 font-heading text-lg font-semibold">Bookings</h2>
          {manifest.bookings.length === 0 ? (
            <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">
              No bookings yet for this trip.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {manifest.bookings.map((b) => (
                <div key={b.id} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">Seats {b.seats.join(", ")}</p>
                    <p className="ui text-xs text-slate-500 dark:text-zinc-500">
                      Ref {b.id.slice(0, 8).toUpperCase()} ·{" "}
                      {new Date(b.created_at).toLocaleString("en-LK", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-brand dark:text-blue-400">
                      LKR {Number(b.amount).toLocaleString("en-LK")}
                    </p>
                    <span
                      className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
