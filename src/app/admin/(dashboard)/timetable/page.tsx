import Link from "next/link";
import { CalendarRange, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminTrips, ApiError, type AdminTrip } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  boarding: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  departed: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function colomboDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}
function prettyDate(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function colomboTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminTimetablePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/timetable" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let trips: AdminTrip[] = [];
  let error: string | null = null;
  try {
    trips = await listAdminTrips(session.access_token, true);
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

  const byDate = new Map<string, AdminTrip[]>();
  for (const t of trips) {
    const key = colomboDateKey(t.depart_at);
    const bucket = byDate.get(key);
    if (bucket) bucket.push(t);
    else byDate.set(key, [t]);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Every upcoming trip scheduled across all operators, platform-wide.
          </p>
        </div>
        <div className="ui rounded-xl bg-slate-100 px-4 py-2 text-center dark:bg-zinc-900">
          <p className="font-heading text-xl font-bold text-brand dark:text-blue-400">{trips.length}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Upcoming</p>
        </div>
      </div>

      {byDate.size === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
          <CalendarRange size={28} className="mx-auto mb-3 text-slate-300 dark:text-zinc-700" />
          No upcoming trips scheduled by any operator yet.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {[...byDate.entries()].map(([date, dayTrips]) => (
            <div key={date}>
              <p className="ui mb-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">
                {prettyDate(date)} <span className="font-normal text-slate-400 dark:text-zinc-600">· {dayTrips.length} trip{dayTrips.length === 1 ? "" : "s"}</span>
              </p>
              <div className="flex flex-col gap-2">
                {dayTrips.map((t) => (
                  <div key={t.id} className="card flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                        <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[t.status] ?? STATUS_STYLE.scheduled}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="ui mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-zinc-400">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">
                          {t.bus?.operator?.name ?? "—"}
                        </span>
                        <span className="text-slate-300 dark:text-zinc-700">·</span>
                        <span className="flex items-center gap-1">
                          <Users size={13} />
                          {t.bus?.bus_type?.name ?? "—"} · {t.bus?.bus_type?.seat_count ?? "—"} seats · Bus {t.bus?.reg_no ?? "—"}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 font-heading font-bold text-brand dark:text-blue-400">
                      {colomboTime(t.depart_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
