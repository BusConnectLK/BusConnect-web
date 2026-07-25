import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminOperators, ApiError, type AdminOperator } from "@/lib/api";
import { OperatorList } from "./operator-list";

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

      <OperatorList operators={operators} />
    </div>
  );
}
