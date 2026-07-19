import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { searchTrips, ApiError, type TripSearchResult } from "@/lib/api";
import { DateBadge } from "@/components/ui";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}

function duration(depart: string, arrive: string) {
  const mins = Math.round((new Date(arrive).getTime() - new Date(depart).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function TripCard({ trip }: { trip: TripSearchResult }) {
  const dur = duration(trip.boarding_at, trip.drop_at);
  const overnight =
    new Date(trip.drop_at).toDateString() !== new Date(trip.boarding_at).toDateString();
  return (
    <div className="card card-hover overflow-hidden">
      {/* poster header */}
      <div
        className="relative flex aspect-square items-start justify-between p-4"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
      >
        <DateBadge iso={trip.boarding_at} />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-heading text-sm font-bold backdrop-blur">
            {trip.operator_name.slice(0, 1)}
          </span>
          <span className="font-heading text-lg font-semibold">{trip.operator_name}</span>
        </div>
      </div>

      <div className="p-5">
        <span className="pill">{trip.bus_type_class.replace("_", " ")}</span>
        <h3 className="mt-2 font-heading text-lg font-bold leading-snug tracking-tight">
          {trip.route_name}
        </h3>
        <div className="ui mt-1 flex items-center justify-between text-sm text-slate-600 dark:text-zinc-400">
          <span>{trip.bus_type_name}</span>
          <span className="flex items-center gap-1">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {trip.operator_rating.toFixed(1)} · {trip.operator_reliability_score.toFixed(0)}%
          </span>
        </div>

        {trip.bus_amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {trip.bus_amenities.map((a) => (
              <span
                key={a}
                className="ui rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-zinc-800">
          <p className="ui flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            <Clock size={12} /> {formatTime(trip.boarding_at)} · {dur}
            {overnight && (
              <span className="rounded bg-amber-100 px-1 py-px font-semibold text-amber-700 normal-case tracking-normal dark:bg-amber-950/50 dark:text-amber-300">
                +1 day
              </span>
            )}
          </p>
          <div className="mt-1.5">
            <p className="ui text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              LKR
            </p>
            <p className="font-heading text-2xl font-bold leading-tight text-brand dark:text-blue-400">
              {Number(trip.fare).toLocaleString("en-LK")}
            </p>
          </div>
          <Link
            href={`/trips/${trip.trip_id}?from=${trip.from_stop_id}&to=${trip.to_stop_id}`}
            className="btn-primary mt-4 w-full"
          >
            Select seats
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string }>;
}) {
  const { from, to, date } = await searchParams;

  if (!from || !to || !date) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-slate-600 dark:text-zinc-400">
          Missing search parameters.{" "}
          <Link href="/" className="font-medium text-brand underline dark:text-blue-400">
            Start a new search
          </Link>
          .
        </p>
      </div>
    );
  }

  let trips: TripSearchResult[] = [];
  let error: string | null = null;
  try {
    trips = await searchTrips({ from, to, date });
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Available buses</h1>
          <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {trips.length} {trips.length === 1 ? "trip" : "trips"} on {date}
          </p>
        </div>
        <Link href="/" className="btn-secondary">
          Edit search
        </Link>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && trips.length === 0 && (
        <div className="card p-12 text-center text-slate-500 dark:text-zinc-400">
          No trips found for this route and date.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={`${trip.trip_id}-${trip.from_stop_id}-${trip.to_stop_id}`} trip={trip} />
        ))}
      </div>
    </div>
  );
}
