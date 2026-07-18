import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOperatorFleet, ApiError, type OperatorFleet } from "@/lib/api";
import { listLocations } from "@/lib/locations";
import { NewTripForm } from "./new-trip-form";

export default async function NewTripPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/trips/new" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to schedule a trip
      </Link>
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
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  const locations = await listLocations();
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name_en ?? "Unknown";

  return (
    <div className="w-full max-w-lg">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Schedule a trip</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Pick one of your routes and buses, and set the departure.
      </p>

      <div className="card mt-6 p-6">
        {fleet.routes.length === 0 || fleet.buses.length === 0 ? (
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            You don&apos;t have any routes or buses set up yet — contact BusConnect support to add your fleet.
          </p>
        ) : (
          <NewTripForm
            routes={fleet.routes.map((r) => ({
              id: r.id,
              label: `${nameOf(r.origin_id)} → ${nameOf(r.dest_id)}`,
            }))}
            buses={fleet.buses.map((b) => ({
              id: b.id,
              label: `${b.reg_no} · ${b.bus_type.name} (${b.bus_type.seat_count} seats)`,
            }))}
          />
        )}
      </div>
    </div>
  );
}
