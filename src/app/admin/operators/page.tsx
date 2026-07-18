import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminOperators, ApiError, type AdminOperator } from "@/lib/api";
import { StatusActions } from "./status-actions";
import { ViewIdButton } from "./view-id-button";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function AdminOperatorsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/operators" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let operators: AdminOperator[] = [];
  let error: string | null = null;
  try {
    operators = await listAdminOperators(session.access_token);
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
      <h1 className="font-heading text-2xl font-bold tracking-tight">Operators</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Approve new bus companies before their trips become bookable, or suspend one if needed.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {operators.map((op) => (
          <div key={op.id} className="card flex items-start justify-between gap-4 p-4">
            <div className="flex items-start gap-3">
              {op.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={op.logo_url}
                  alt={`${op.name} logo`}
                  className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                />
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
              )}
              <div>
                <p className="font-medium">{op.name}</p>
                <p className="ui mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_STYLE[op.status]}`}>
                    {op.status}
                  </span>
                  ★ {Number(op.rating).toFixed(1)} · {Number(op.reliability_score).toFixed(0)}% reliability
                </p>
                <dl className="ui mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2 dark:text-zinc-400">
                  {op.witness_name && (
                    <div>
                      <dt className="inline font-medium text-slate-500 dark:text-zinc-500">Witness: </dt>
                      <dd className="inline">{op.witness_name}</dd>
                    </div>
                  )}
                  {op.mobile_no && (
                    <div>
                      <dt className="inline font-medium text-slate-500 dark:text-zinc-500">Mobile: </dt>
                      <dd className="inline">{op.mobile_no}</dd>
                    </div>
                  )}
                  {op.address && (
                    <div className="sm:col-span-2">
                      <dt className="inline font-medium text-slate-500 dark:text-zinc-500">Address: </dt>
                      <dd className="inline">{op.address}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusActions operatorId={op.id} status={op.status} />
              {op.id_document_path && <ViewIdButton operatorId={op.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
