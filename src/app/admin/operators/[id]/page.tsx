import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  MapPin,
  Phone,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminOperator, ApiError, type AdminOperator } from "@/lib/api";
import { StatusActions } from "../status-actions";
import { ViewIdButton } from "../view-id-button";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  suspended: "On hold",
};

const STATUS_CAPTION: Record<string, string> = {
  active: "This operator can schedule trips, invite pilots, and board passengers.",
  pending: "Awaiting your review — approve to let them start scheduling trips.",
  suspended: "Everything is frozen: no new trips, no new pilots, no ticket boarding.",
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

export default async function AdminOperatorDetailPage({
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
      <Link href={`/login?next=/admin/operators/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let operator: AdminOperator | null = null;
  let error: string | null = null;
  try {
    operator = await getAdminOperator(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
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
  if (!operator) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/operators"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to operators
      </Link>

      {/* ── Header: identity + status + quick actions ─────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {operator.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={operator.logo_url}
                alt={`${operator.name} logo`}
                className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700" />
            )}
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">{operator.name}</h1>
              <p className="ui mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[operator.status]}`}>
                  {STATUS_LABEL[operator.status] ?? operator.status}
                </span>
                <span>★ {Number(operator.rating).toFixed(1)} · {Number(operator.reliability_score).toFixed(0)}% reliability</span>
              </p>
            </div>
          </div>
          <StatusActions operatorId={operator.id} status={operator.status} />
        </div>

        <p className="ui mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          {STATUS_CAPTION[operator.status] ?? ""}
        </p>
      </div>

      {/* ── Application details ────────────────────────────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Application details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field icon={UserCheck} label="Witness name" value={operator.witness_name ?? "—"} />
          <Field icon={Phone} label="Mobile number" value={operator.mobile_no ?? "—"} />
          <Field icon={MapPin} label="Company address" value={operator.address ?? "—"} />
          <Field
            icon={CalendarDays}
            label="Applied on"
            value={new Date(operator.created_at).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </div>
      </div>

      {/* ── Verification document ───────────────────────────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Verification document
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <FileText size={15} />
          </div>
          {operator.id_document_path ? (
            <div>
              <p className="text-sm font-medium">Company registration / ID on file</p>
              <div className="mt-1.5">
                <ViewIdButton operatorId={operator.id} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-zinc-500">No document was submitted.</p>
          )}
        </div>
      </div>
    </div>
  );
}
