import Link from "next/link";
import { ArrowLeft, Wallet, Armchair, UserCheck, ScanLine, User, Phone } from "lucide-react";
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
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  const isPilot = manifest.role === "pilot";
  const layout = manifest.layout ?? defaultLayout(40);
  const taken = new Set(manifest.taken);
  const confirmed = manifest.bookings.filter((b) => b.status === "confirmed");

  return (
    <div>
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {manifest.route_name ?? "Trip manifest"}
          </h1>
          <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {dateTime(manifest.depart_at)} · Bus {manifest.bus?.reg_no ?? "—"}
          </p>
        </div>
        <Link href="/operator/scan" className="btn-primary shrink-0">
          <ScanLine size={16} /> Scan tickets
        </Link>
      </div>

      {/* stat tiles */}
      <div className={`mt-6 grid gap-3 ${isPilot ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <UserCheck size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Boarded</p>
            <p className="font-heading text-xl font-bold">
              {manifest.boarded_count}
              <span className="text-slate-400"> / {manifest.confirmed_count}</span>
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
        {!isPilot && (
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
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* seat map (read-only) */}
        <div className="lg:col-span-5">
          <h2 className="mb-3 font-heading text-lg font-semibold">Seat map</h2>
          <div className="card p-5">
            <div className="flex flex-col items-center gap-2">
              {(() => {
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

        {/* passenger list */}
        <div className="lg:col-span-7">
          <h2 className="mb-3 font-heading text-lg font-semibold">Passengers</h2>
          {confirmed.length === 0 ? (
            <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">
              No confirmed passengers yet for this trip.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {manifest.bookings.map((b) => (
                <div key={b.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <User size={14} className="shrink-0 text-slate-400" />
                      {b.passenger_name ?? "Passenger"}
                    </p>
                    <p className="ui mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-zinc-500">
                      <span>Seats {b.seats.join(", ")}</span>
                      {b.passenger_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {b.passenger_phone}
                        </span>
                      )}
                      <span>Ref {b.id.slice(0, 6).toUpperCase()}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {b.status === "confirmed" ? (
                      b.boarded ? (
                        <span className="ui flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <UserCheck size={12} /> Boarded
                        </span>
                      ) : (
                        <span className="ui rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Not boarded
                        </span>
                      )
                    ) : (
                      <span
                        className={`ui rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    )}
                    {!isPilot && (
                      <span className="font-heading text-sm font-bold text-brand dark:text-blue-400">
                        LKR {Number(b.amount).toLocaleString("en-LK")}
                      </span>
                    )}
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
