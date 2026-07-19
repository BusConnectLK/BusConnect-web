import Link from "next/link";
import { Armchair, Star, Clock } from "lucide-react";
import { searchTrips, ApiError, type TripSearchResult } from "@/lib/api";
import { DateBadge } from "@/components/ui";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}

function duration(depart: string, arrive: string | null) {
  if (!arrive) return null;
  const mins = Math.round((new Date(arrive).getTime() - new Date(depart).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function TripCard({ trip }: { trip: TripSearchResult }) {
  const dur = duration(trip.depart_at, trip.arrive_est);
  return (
    <div className="card card-hover overflow-hidden">
      {/* poster header */}
      <div
        className="relative flex aspect-[16/9] items-start justify-between p-4"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
      >
        <DateBadge iso={trip.depart_at} />
        <span className="ui rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
          {trip.bus.bus_type.class.replace("_", " ")}
        </span>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-heading text-sm font-bold backdrop-blur">
            {trip.bus.operator.name.slice(0, 1)}
          </span>
          <span className="font-heading text-lg font-semibold">{trip.bus.operator.name}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="ui flex items-center justify-between text-sm text-slate-600 dark:text-zinc-400">
          <span>{trip.bus.bus_type.name}</span>
          <span className="flex items-center gap-1">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {trip.bus.operator.rating.toFixed(1)} · {trip.bus.operator.reliability_score.toFixed(0)}%
          </span>
        </div>

        {trip.bus.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {trip.bus.amenities.map((a) => (
              <span
                key={a}
                className="ui rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4 dark:border-zinc-800">
          <div>
            <p className="ui flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              <Clock size={12} /> {formatTime(trip.depart_at)}
              {dur && ` · ${dur}`}
            </p>
            <p className="mt-0.5 font-heading text-2xl font-bold text-brand dark:text-blue-400">
              LKR {Number(trip.base_fare).toLocaleString("en-LK")}
            </p>
          </div>
          <Link href={`/trips/${trip.id}`} className="btn-primary">
            <Armchair size={16} /> Select seats
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
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}
