import Link from "next/link";
import { ChevronRight, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminPilots, getAdminPilotPhotoUrl, ApiError, type AdminPilot } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

export default async function AdminPilotsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/pilots" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let pilots: AdminPilot[] = [];
  let error: string | null = null;
  try {
    pilots = await listAdminPilots(session.access_token);
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

  const photoUrls = new Map(
    (
      await Promise.all(
        pilots
          .filter((p) => p.profile_image_url)
          .map(async (p) => {
            try {
              const { url } = await getAdminPilotPhotoUrl(session.access_token, p.id);
              return [p.id, url] as const;
            } catch {
              return [p.id, null] as const;
            }
          }),
      )
    ).filter((entry): entry is [string, string] => !!entry[1]),
  );

  const pending = pilots.filter((p) => p.status === "pending");
  const others = pilots.filter((p) => p.status !== "pending");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Pilots</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Drivers and conductors operators have registered — approve before they can be assigned to
        a fleet.
      </p>

      <h2 className="mt-6 font-heading text-lg font-semibold">Awaiting approval ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
          Nothing pending — all caught up.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {pending.map((p) => (
            <PilotRow key={p.id} pilot={p} photoUrl={photoUrls.get(p.id) ?? null} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-lg font-semibold">All other pilots ({others.length})</h2>
          <div className="mt-3 flex flex-col gap-2">
            {others.map((p) => (
              <PilotRow key={p.id} pilot={p} photoUrl={photoUrls.get(p.id) ?? null} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PilotRow({ pilot, photoUrl }: { pilot: AdminPilot; photoUrl: string | null }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-4">
      <Link href={`/admin/pilots/${pilot.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`${pilot.name} photo`}
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
            <User size={16} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{pilot.name}</p>
          <p className="ui mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[pilot.status]}`}>
              {STATUS_LABEL[pilot.status] ?? pilot.status}
            </span>
            <span>{pilot.operator?.name ?? "—"}</span>
            <span>{pilot.phone_no}</span>
            {pilot.bus && (
              <span className="capitalize">
                {pilot.assigned_role} · {pilot.bus.reg_no}
              </span>
            )}
            {pilot.user_id && <span className="text-emerald-600 dark:text-emerald-400">Account linked</span>}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <StatusActions pilotId={pilot.id} status={pilot.status} />
        <Link
          href={`/admin/pilots/${pilot.id}`}
          className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
