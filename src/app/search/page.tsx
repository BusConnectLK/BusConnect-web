import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { searchTrips, ApiError, type TripSearchResult } from "@/lib/api";
import { ImageCarousel } from "@/components/image-carousel";
import { DateFilter } from "./date-filter";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "today" for the current date, else "22nd June". */
function pageTitleDate(dateIso: string) {
  if (dateIso === todayIso()) return "today";
  const d = new Date(`${dateIso}T00:00:00`);
  const month = d.toLocaleDateString("en-LK", { month: "long" });
  return `${ordinal(d.getDate())} ${month}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}

function duration(depart: string, arrive: string) {
  const mins = Math.round((new Date(arrive).getTime() - new Date(depart).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function routeEndpoints(routeName: string): [string, string] {
  const parts = routeName.split(/\s*-\s*/);
  if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
  return [routeName, ""];
}

function TripCard({ trip }: { trip: TripSearchResult }) {
  const dur = duration(trip.boarding_at, trip.drop_at);
  const overnight =
    new Date(trip.drop_at).toDateString() !== new Date(trip.boarding_at).toDateString();
  const [origin, destination] = routeEndpoints(trip.route_name);
  const amenities = trip.bus_amenities.slice(0, 4);

  return (
    <div className="card card-hover overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        {/* thumbnail */}
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32">
          {trip.bus_images.length > 0 ? (
            <ImageCarousel images={trip.bus_images} alt={`${trip.bus_reg_no} photos`} />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
            >
              {trip.operator_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trip.operator_logo_url}
                  alt={`${trip.operator_name} logo`}
                  className="h-10 w-10 rounded-lg border border-white/30 bg-white object-cover"
                />
              ) : (
                <span className="font-heading text-xl font-bold text-white">
                  {trip.operator_name.slice(0, 1)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill">{trip.bus_type_class.replace("_", " ")}</span>
            <span className="ui text-sm font-medium text-slate-600 dark:text-zinc-400">
              {trip.operator_name} · {trip.bus_type_name}
            </span>
            <span className="ui ml-auto flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-500 sm:ml-0">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {trip.operator_rating.toFixed(1)} · {trip.operator_reliability_score.toFixed(0)}%
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 sm:gap-5">
            <div>
              <p className="font-heading text-xl font-bold leading-none">{formatTime(trip.boarding_at)}</p>
              <p className="ui mt-1 truncate text-xs text-slate-500 dark:text-zinc-500">{origin}</p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-zinc-600">
              <span className="ui text-[11px] font-medium">
                {dur}
                {overnight && (
                  <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    +1 day
                  </span>
                )}
              </span>
              <div className="flex w-full items-center gap-1">
                <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
                <ArrowRight size={13} />
                <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-xl font-bold leading-none">{formatTime(trip.drop_at)}</p>
              <p className="ui mt-1 truncate text-xs text-slate-500 dark:text-zinc-500">{destination}</p>
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="ui rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* price + cta */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="ui text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              LKR
            </p>
            <p className="font-heading text-xl font-bold leading-tight text-brand dark:text-blue-400">
              {Number(trip.fare).toLocaleString("en-LK")}
            </p>
          </div>
          <Link
            href={`/trips/${trip.trip_id}?from=${trip.from_stop_id}&to=${trip.to_stop_id}`}
            className="btn-primary py-2! px-5! text-sm!"
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

  if (!from || !to) {
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

  // No date in the URL yet (e.g. a bookmarked from/to link) — default to today.
  const effectiveDate = date || todayIso();

  let trips: TripSearchResult[] = [];
  let error: string | null = null;
  try {
    trips = await searchTrips({ from, to, date: effectiveDate });
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Available buses for {pageTitleDate(effectiveDate)}
        </h1>
        <DateFilter from={from} to={to} date={effectiveDate} />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && trips.length === 0 && (
        <div className="card p-12 text-center text-slate-500 dark:text-zinc-400">
          No trips found for this route on {effectiveDate}. Try another date above.
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {trips.map((trip) => (
          <TripCard key={`${trip.trip_id}-${trip.from_stop_id}-${trip.to_stop_id}`} trip={trip} />
        ))}
      </div>
    </div>
  );
}
