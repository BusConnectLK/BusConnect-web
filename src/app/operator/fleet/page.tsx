import Link from "next/link";
import { ArrowLeft, Bus as BusIcon, Route as RouteIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorFleet, ApiError, type OperatorFleet } from "@/lib/api";
import { listLocations } from "@/lib/locations";

export default async function OperatorFleetPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/operator/fleet" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to view your fleet
        </Link>
      </div>
    );
  }

  let fleet: OperatorFleet | null = null;
  let error: string | null = null;
  try {
    fleet = await getOperatorFleet(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account isn't linked to a bus operator."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !fleet) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }

  const locations = await listLocations();
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name_en ?? "Unknown";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">My fleet</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Buses and routes registered to your account. To add a new bus or route, contact BusConnect
        support — this keeps fleet data verified across the platform.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BusIcon size={18} className="text-brand dark:text-blue-400" />
            <h2 className="font-heading text-lg font-semibold">Buses ({fleet.buses.length})</h2>
          </div>
          {fleet.buses.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
              No buses registered yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fleet.buses.map((b) => (
                <div key={b.id} className="card p-4">
                  <p className="font-medium">{b.reg_no}</p>
                  <p className="ui mt-0.5 text-sm text-slate-600 dark:text-zinc-400">
                    {b.bus_type.name} · {b.bus_type.seat_count} seats
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <RouteIcon size={18} className="text-brand dark:text-blue-400" />
            <h2 className="font-heading text-lg font-semibold">Routes ({fleet.routes.length})</h2>
          </div>
          {fleet.routes.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
              No routes registered yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fleet.routes.map((r) => (
                <div key={r.id} className="card p-4">
                  <p className="font-medium">
                    {nameOf(r.origin_id)} → {nameOf(r.dest_id)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
