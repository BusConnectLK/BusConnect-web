import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminBuses, ApiError, type AdminBus } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function AdminFleetPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/fleet" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let buses: AdminBus[] = [];
  let error: string | null = null;
  try {
    buses = await listAdminBuses(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Fleet</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Buses operators have registered — approve before they can be scheduled for trips.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {buses.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No buses registered yet.
          </div>
        ) : (
          buses.map((b) => {
            const photos: [string, string | null | undefined][] = [
              ["Front", b.front_image_url],
              ["Side 1", b.side_image_urls?.[0]],
              ["Side 2", b.side_image_urls?.[1]],
              ["Interior", b.interior_image_url],
              ["Seat layout", b.seat_layout_image_url],
            ];
            return (
              <div key={b.id} className="card flex items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-3">
                  {b.front_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.front_image_url}
                      alt={`${b.reg_no} front`}
                      className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                    />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{b.reg_no}</p>
                      <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[b.status]}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                      {b.operator?.name ?? "—"} · {b.bus_type?.name ?? "—"} · {b.bus_type?.seat_count ?? "—"} seats
                    </p>
                    {b.amenities.length > 0 && (
                      <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">{b.amenities.join(", ")}</p>
                    )}
                    {b.notes && (
                      <p className="ui mt-1 text-xs italic text-slate-500 dark:text-zinc-500">&ldquo;{b.notes}&rdquo;</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {photos.map(([label, url]) =>
                        url ? (
                          <a
                            key={label}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand underline dark:text-blue-400"
                          >
                            {label}
                          </a>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
                <StatusActions busId={b.id} status={b.status} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
