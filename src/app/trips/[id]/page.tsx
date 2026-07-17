import Link from "next/link";
import { ArrowLeft, Star, ShieldCheck, MapPin } from "lucide-react";
import {
  getTrip,
  getSeatmap,
  ApiError,
  type TripDetail,
  type SeatMap,
} from "@/lib/api";
import { listLocations } from "@/lib/locations";
import { SeatSelector } from "./seat-selector";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stopTime(departIso: string, offsetMin: number) {
  return new Date(new Date(departIso).getTime() + offsetMin * 60000).toLocaleTimeString(
    "en-LK",
    { hour: "2-digit", minute: "2-digit" },
  );
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let trip: TripDetail | null = null;
  let seatmap: SeatMap | null = null;
  let error: string | null = null;

  try {
    [trip, seatmap] = await Promise.all([getTrip(id), getSeatmap(id)]);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !trip) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Trip not found."}
        </p>
        <Link href="/" className="ui mt-4 inline-block text-sm font-medium text-brand underline dark:text-blue-400">
          Back to search
        </Link>
      </div>
    );
  }

  const locations = await listLocations();
  const nameOf = (locId: string) => locations.find((l) => l.id === locId)?.name_en ?? "Stop";

  const stops = [...trip.route.stops].sort((a, b) => a.seq - b.seq);
  const fromStopId = stops[0]?.id ?? "";
  const toStopId = stops[stops.length - 1]?.id ?? "";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> New search
      </Link>

      {/* header banner */}
      <header
        className="mt-4 overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #05235a 100%)" }}
      >
        <div className="flex items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 font-heading text-lg font-bold backdrop-blur">
            {trip.route.operator.name.slice(0, 1)}
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {trip.route.operator.name}
            </h1>
            <p className="ui text-sm text-white/80">
              {trip.bus.bus_type.name} · {trip.bus.bus_type.class.replace("_", " ")} · Bus {trip.bus.reg_no}
            </p>
          </div>
        </div>
        <div className="ui mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur">
            Departs {formatDateTime(trip.depart_at)}
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur">
            <Star size={13} className="fill-amber-300 text-amber-300" />
            {trip.route.operator.rating.toFixed(1)}
          </span>
          <span className="rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur">
            {trip.route.operator.reliability_score.toFixed(0)}% on-time
          </span>
        </div>
      </header>

      {/* 12-col: 8 main (seat map) + 4 sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <h2 className="mb-4 font-heading text-xl font-semibold">Select your seats</h2>
          <SeatSelector
            tripId={trip.id}
            layout={seatmap?.layout ?? trip.bus.bus_type.layout_json ?? null}
            seatCount={trip.bus.bus_type.seat_count}
            initialTaken={seatmap?.taken ?? []}
            farePerSeat={Number(trip.base_fare)}
            fromStopId={fromStopId}
            toStopId={toStopId}
          />
        </section>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <div className="card p-5">
              <h3 className="font-heading font-semibold">Your journey</h3>
              <ol className="mt-4 space-y-4">
                {stops.map((s, i) => (
                  <li key={s.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <MapPin size={16} className="text-brand dark:text-blue-400" />
                      {i < stops.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-zinc-800" />
                      )}
                    </div>
                    <div className="-mt-0.5">
                      <p className="font-medium">{nameOf(s.location_id)}</p>
                      <p className="ui text-xs text-slate-500 dark:text-zinc-500">
                        {stopTime(trip.depart_at, s.scheduled_offset_min)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {trip.bus.amenities.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
                  <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    On board
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {trip.bus.amenities.map((a) => (
                      <span
                        key={a}
                        className="ui rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="ui mt-5 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
                <ShieldCheck size={15} className="text-emerald-500" />
                Secure checkout · Instant e-ticket · QR boarding
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
