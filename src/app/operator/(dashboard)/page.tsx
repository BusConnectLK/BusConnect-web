import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Users,
  PlusCircle,
  ChevronRight,
  Clock,
  Ban,
  QrCode,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOperator,
  listOperatorTrips,
  getOperatorAnalytics,
  ApiError,
  type OperatorMembership,
  type OperatorTrip,
  type OperatorAnalytics,
} from "@/lib/api";
import { listLocations } from "@/lib/locations";

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
          BusConnect is reviewing your application. You&apos;ll be able to schedule trips once approved.
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
  try {
    if (role === "owner") {
      [trips, analytics] = await Promise.all([
        listOperatorTrips(session.access_token),
        getOperatorAnalytics(session.access_token),
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

  const locations = await listLocations();
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name_en ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            {role === "owner" ? "Operator dashboard" : "Conductor dashboard"}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{operator.name}</h1>
        </div>
        {role === "owner" && (
          <Link href="/operator/trips/new" className="btn-primary">
            <PlusCircle size={16} /> Schedule trip
          </Link>
        )}
      </div>

      {role === "owner" && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total trips" value={String(analytics?.totalTrips ?? 0)} />
          <Stat label="Upcoming" value={String(analytics?.upcomingTrips ?? 0)} />
          <Stat label="Bookings" value={String(analytics?.totalBookings ?? 0)} />
          <Stat label="Revenue" value={`LKR ${Number(analytics?.totalRevenue ?? 0).toLocaleString("en-LK")}`} />
        </div>
      )}

      <div className="mt-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <TrendingUp size={18} />
        </span>
        <h2 className="font-heading text-xl font-semibold">
          {role === "owner" ? "Your trips" : "Trips you can board"}
        </h2>
      </div>

      {trips.length === 0 ? (
        <div className="card mt-5 p-10 text-center text-slate-500 dark:text-zinc-400">
          No trips scheduled yet.
          {role === "owner" && (
            <Link href="/operator/trips/new" className="btn-primary mt-4">
              <PlusCircle size={16} /> Schedule your first trip
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={role === "owner" ? `/operator/trips/${t.id}` : `/operator/trips/${t.id}/scan`}
              className="card card-hover flex items-center justify-between p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-heading font-semibold">
                  {nameOf(t.route.origin_id)}
                  <ChevronRight size={14} className="text-slate-400" />
                  {nameOf(t.route.dest_id)}
                </p>
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
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="font-heading text-xl font-bold text-brand dark:text-blue-400 sm:text-2xl">
        {value}
      </div>
      <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        {label}
      </div>
    </div>
  );
}
