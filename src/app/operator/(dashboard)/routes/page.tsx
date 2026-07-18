import Link from "next/link";
import { Route as RouteIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorFleet, ApiError, type OperatorFleet } from "@/lib/api";
import { listLocations } from "@/lib/locations";

export default async function OperatorRoutesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/routes" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view your routes
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
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Routes</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Routes registered to your account. To add a new route, contact BusConnect support — this
        keeps route data verified across the platform.
      </p>

      <div className="mt-6">
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
      </div>
    </div>
  );
}
