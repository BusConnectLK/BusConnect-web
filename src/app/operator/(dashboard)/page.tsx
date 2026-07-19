import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Users,
  PlusCircle,
  ChevronRight,
  ArrowRight,
  Clock,
  Ban,
  QrCode,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOperator,
  listOperatorTrips,
  getOperatorAnalytics,
  listJourneys,
  ApiError,
  type OperatorMembership,
  type OperatorTrip,
  type OperatorAnalytics,
  type OperatorJourney,
} from "@/lib/api";
import { formatTime, recurrenceLabel } from "@/lib/journey-format";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OperatorOverviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access your operator dashboard
      </Link>
    );
  }

  let membership: OperatorMembership | null = null;
  let notLinked = false;
  let error: string | null = null;

  try {
    membership = await getMyOperator(session.access_token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      notLinked = true;
    } else {
      error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
    }
  }

  if (notLinked) {
    return (
      <div className="card p-10 text-center">
        <Building2 size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />
        <p className="mt-4 font-heading font-semibold">Run a bus fleet?</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Apply to list your buses on BusConnect and reach passengers across the country.
        </p>
        <Link href="/operator/apply" className="btn-primary mt-5">
          <PlusCircle size={16} /> Apply as an operator
        </Link>
      </div>
    );
  }

  if (error || !membership) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Could not load your operator dashboard."}
      </p>
    );
  }

  const { operator, role } = membership;

  if (operator.status === "pending") {
    return (
      <div className="card p-10 text-center">
        {operator.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={operator.logo_url}
            alt={`${operator.name} logo`}
            className="mx-auto h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <Clock size={32} className="mx-auto text-amber-500" />
        )}
        <p className="mt-4 font-heading font-semibold">{operator.name} — application under review</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          BusConnect is reviewing your application. You&apos;ll be able to run journeys once approved.
        </p>
      </div>
    );
  }

  if (operator.status === "suspended") {
    return (
      <div className="card border-red-200 p-10 text-center dark:border-red-900/50">
        <Ban size={32} className="mx-auto text-red-500" />
        <p className="mt-4 font-heading font-semibold">{operator.name} — account suspended</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Contact BusConnect support to resolve this.
        </p>
      </div>
    );
  }

  let trips: OperatorTrip[] = [];
  let analytics: OperatorAnalytics | null = null;
  let journeys: OperatorJourney[] = [];
  try {
    if (role === "owner") {
      [trips, analytics, journeys] = await Promise.all([
        listOperatorTrips(session.access_token),
        getOperatorAnalytics(session.access_token),
        listJourneys(session.access_token),
      ]);
    } else {
      trips = await listOperatorTrips(session.access_token);
    }
  } catch (e) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {e instanceof ApiError ? e.message : "Could not load trips."}
      </p>
    );
  }

  const now = Date.now();
  const upcomingTrips = trips
    .filter((t) => new Date(t.depart_at).getTime() > now && t.status !== "cancelled")
    .sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());
  const DEPARTURES_SHOWN = 8;
  const shownTrips = upcomingTrips.slice(0, DEPARTURES_SHOWN);
  const moreTripsCount = upcomingTrips.length - shownTrips.length;

  const JOURNEYS_SHOWN = 4;
  const sortedJourneys = [...journeys].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const shownJourneys = sortedJourneys.slice(0, JOURNEYS_SHOWN);
  const activeJourneyCount = journeys.filter((j) => j.status === "active").length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {operator.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={operator.logo_url}
              alt={`${operator.name} logo`}
              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
            />
          )}
          <div>
            <p className="ui text-sm text-slate-500 dark:text-zinc-400">
              {role === "owner" ? "Operator dashboard" : "Pilot dashboard"}
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{operator.name}</h1>
          </div>
        </div>
        {role === "owner" && (
          <Link href="/operator/journeys/new" className="btn-primary shrink-0">
            <PlusCircle size={16} /> Create journey
          </Link>
        )}
      </div>

      {role === "owner" && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Active journeys" value={String(activeJourneyCount)} />
          <Stat label="Upcoming trips" value={String(analytics?.upcomingTrips ?? 0)} />
          <Stat label="Bookings" value={String(analytics?.totalBookings ?? 0)} />
          <Stat label="Fill rate" value={`${analytics?.fillRatePct ?? 0}%`} />
          <Stat label="Revenue" value={`LKR ${Number(analytics?.totalRevenue ?? 0).toLocaleString("en-LK")}`} />
        </div>
      )}

      {role === "owner" && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                <CalendarClock size={18} />
              </span>
              <h2 className="font-heading text-xl font-semibold">Your journeys</h2>
            </div>
            {journeys.length > 0 && (
              <Link
                href="/operator/journeys"
                className="ui flex items-center gap-1 text-sm font-medium text-brand hover:underline dark:text-blue-400"
              >
                View all <ArrowRight size={13} />
              </Link>
            )}
          </div>

          {shownJourneys.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-slate-500 dark:text-zinc-400">
              No journeys yet — create one to put a bus on sale for every date it runs.
              <div>
                <Link href="/operator/journeys/new" className="btn-primary mt-4">
                  <PlusCircle size={16} /> Create your first journey
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shownJourneys.map((j) => (
                <Link
                  key={j.id}
                  href={`/operator/journeys/${j.id}`}
                  className="card card-hover flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-heading font-semibold">{j.route?.name ?? "—"}</p>
                      <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[j.status]}`}>
                        {j.status}
                      </span>
                    </div>
                    <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                      {formatTime(j.depart_time)} → {formatTime(j.arrive_time)} · {recurrenceLabel(j.recurrence, j.weekdays)}
                    </p>
                    <p className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
                      {j.bus?.reg_no ?? "—"} · {j.bus?.bus_type?.name ?? "—"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <TrendingUp size={18} />
          </span>
          <h2 className="font-heading text-xl font-semibold">
            {role === "owner" ? "Upcoming departures" : "Trips you can board"}
          </h2>
        </div>

        {shownTrips.length === 0 ? (
          <div className="card mt-4 p-10 text-center text-slate-500 dark:text-zinc-400">
            {role === "owner"
              ? "No upcoming departures — create a journey and BusConnect will put seats on sale for every date it runs."
              : "No trips yet — you'll see them here once your operator assigns you to a bus."}
            {role === "owner" && journeys.length === 0 && (
              <div>
                <Link href="/operator/journeys/new" className="btn-primary mt-4">
                  <PlusCircle size={16} /> Create your first journey
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {shownTrips.map((t) => (
              <Link
                key={t.id}
                href={role === "owner" ? `/operator/trips/${t.id}` : `/operator/trips/${t.id}/scan`}
                className="card card-hover flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                  <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    <Users size={13} />
                    {t.bus.bus_type.name} · {t.bus.bus_type.seat_count} seats · Bus {t.bus.reg_no}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                    <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">{t.status}</p>
                  </div>
                  {role === "pilot" && <QrCode size={18} className="text-brand dark:text-blue-400" />}
                </div>
              </Link>
            ))}
            {moreTripsCount > 0 && (
              <p className="ui px-1 text-center text-sm text-slate-500 dark:text-zinc-400">
                +{moreTripsCount} more upcoming {moreTripsCount === 1 ? "departure" : "departures"}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="font-heading text-xl font-bold text-brand dark:text-blue-400 sm:text-2xl">
        {value}
      </div>
      <div className="ui mt-1 flex items-center justify-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        {label}
      </div>
    </div>
  );
}
