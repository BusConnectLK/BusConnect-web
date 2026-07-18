import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminOperators, ApiError, type AdminOperator } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "On hold",
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
        Approve new bus companies before their trips become bookable, or put one on hold if needed.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {operators.map((op) => (
          <div key={op.id} className="card flex items-center justify-between gap-4 p-4">
            <Link
              href={`/admin/operators/${op.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
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
              <div className="min-w-0">
                <p className="truncate font-medium">{op.name}</p>
                <p className="ui mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[op.status]}`}>
                    {STATUS_LABEL[op.status] ?? op.status}
                  </span>
                  ★ {Number(op.rating).toFixed(1)} · {Number(op.reliability_score).toFixed(0)}% reliability
                </p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <StatusActions operatorId={op.id} status={op.status} />
              <Link
                href={`/admin/operators/${op.id}`}
                className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                View details <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
