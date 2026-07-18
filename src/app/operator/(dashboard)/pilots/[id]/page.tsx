import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Hash, Phone, Route as RouteIcon, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPilot,
  getPilotPhotoUrl,
  getOperatorFleet,
  ApiError,
  type OperatorPilotDetail,
} from "@/lib/api";
import { AssignFleetButton } from "../assign-fleet-button";
import { DeletePilotButton } from "../delete-pilot-button";
import { LinkAccountForm } from "./link-account-form";

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

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
        <Icon size={15} />
      </div>
      <div>
        <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default async function OperatorPilotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/operator/pilots/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this pilot
      </Link>
    );
  }

  let pilot: OperatorPilotDetail | null = null;
  let error: string | null = null;
  try {
    pilot = await getPilot(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (!pilot) notFound();

  let photoUrl: string | null = null;
  if (pilot.profile_image_url) {
    try {
      photoUrl = (await getPilotPhotoUrl(session.access_token, pilot.id)).url;
    } catch {
      photoUrl = null;
    }
  }

  let busOptions: { id: string; label: string }[] = [];
  try {
    const fleet = await getOperatorFleet(session.access_token);
    busOptions = fleet.buses
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b.id, label: `${b.reg_no} · ${b.bus_type?.name ?? "—"}` }));
  } catch {
    busOptions = [];
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/operator/pilots"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to pilots
      </Link>

      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={`${pilot.name} photo`}
                className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                <User size={20} />
              </div>
            )}
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">{pilot.name}</h1>
              <span className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[pilot.status]}`}>
                {STATUS_LABEL[pilot.status] ?? pilot.status}
              </span>
            </div>
          </div>
          <DeletePilotButton pilotId={pilot.id} pilotName={pilot.name} />
        </div>

        <dl className="ui mt-6 grid grid-cols-1 gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
          <Field icon={Hash} label="ID number" value={pilot.id_number} />
          <Field icon={Phone} label="Phone number" value={pilot.phone_no} />
          <Field
            icon={CalendarDays}
            label="Registered on"
            value={new Date(pilot.created_at).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <Field
            icon={RouteIcon}
            label="Fleet assignment"
            value={
              pilot.bus ? (
                <span className="capitalize">
                  {pilot.assigned_role} · {pilot.bus.reg_no}
                  {pilot.bus.bus_type && ` (${pilot.bus.bus_type.name})`}
                </span>
              ) : (
                "Not assigned yet"
              )
            }
          />
        </dl>
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Assign to fleet
        </h2>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          {pilot.status !== "active"
            ? "Only approved pilots can be assigned to a fleet."
            : !pilot.user_id
              ? "Link this pilot to a BusConnect account below before assigning them to a fleet."
              : "Choose one of your approved buses and whether they'll work as driver or conductor."}
        </p>
        <div className="mt-3">
          <AssignFleetButton
            pilotId={pilot.id}
            busOptions={busOptions}
            disabled={pilot.status !== "active" || !pilot.user_id}
          />
        </div>
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          BusConnect account
        </h2>
        {pilot.user_id ? (
          <p className="ui mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            Linked — this pilot can sign in and scan boarding tickets for their assigned trips.
          </p>
        ) : (
          <div className="mt-3">
            <LinkAccountForm pilotId={pilot.id} />
          </div>
        )}
      </div>
    </div>
  );
}
