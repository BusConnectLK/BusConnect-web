import Link from "next/link";
import { Building2, TrendingUp, Users, PlusCircle, ChevronRight, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOperator,
  listOperatorTrips,
  getOperatorAnalytics,
  ApiError,
  type OperatorInfo,
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
      <Shell>
        <Link href="/login?next=/operator" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to access your operator dashboard
        </Link>
      </Shell>
    );
  }

  let operator: OperatorInfo | null = null;
  let trips: OperatorTrip[] = [];
  let analytics: OperatorAnalytics | null = null;
  let notAnOperator = false;
  let error: string | null = null;

  try {
    [operator, trips, analytics] = await Promise.all([
      getMyOperator(session.access_token),
      listOperatorTrips(session.access_token),
      getOperatorAnalytics(session.access_token),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      notAnOperator = true;
    } else {
      error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
    }
  }

  if (notAnOperator) {
    return (
      <Shell>
        <div className="card p-10 text-center">
          <Building2 size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />
          <p className="mt-4 font-heading font-semibold">No operator account linked</p>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Your sign-in isn&apos;t linked to a bus operator yet. Contact BusConnect to become a partner.
          </p>
          <Link href="/#operators" className="btn-primary mt-5">
            Learn about partnering
          </Link>
        </div>
      </Shell>
    );
  }

  if (error || !operator) {
    return (
      <Shell>
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Could not load your operator dashboard."}
        </p>
      </Shell>
    );
  }

  const locations = await listLocations();
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name_en ?? "—";

  return (
    <Shell>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">Operator dashboard</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{operator.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/operator/fleet" className="btn-secondary">
            <Bus size={16} /> My fleet
          </Link>
          <Link href="/operator/trips/new" className="btn-primary">
            <PlusCircle size={16} /> Schedule trip
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total trips" value={String(analytics?.totalTrips ?? 0)} />
        <Stat label="Upcoming" value={String(analytics?.upcomingTrips ?? 0)} />
        <Stat label="Bookings" value={String(analytics?.totalBookings ?? 0)} />
        <Stat
          label="Revenue"
          value={`LKR ${Number(analytics?.totalRevenue ?? 0).toLocaleString("en-LK")}`}
        />
      </div>

      <div className="mt-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <TrendingUp size={18} />
        </span>
        <h2 className="font-heading text-xl font-semibold">Your trips</h2>
      </div>

      {trips.length === 0 ? (
        <div className="card mt-5 p-10 text-center text-slate-500 dark:text-zinc-400">
          No trips scheduled yet.
          <Link href="/operator/trips/new" className="btn-primary mt-4">
            <PlusCircle size={16} /> Schedule your first trip
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/operator/trips/${t.id}`}
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
              <div className="text-right">
                <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">{t.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
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

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>;
}
