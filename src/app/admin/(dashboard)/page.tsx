import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminAnalytics, ApiError, type AdminAnalytics } from "@/lib/api";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let analytics: AdminAnalytics | null = null;
  let error: string | null = null;
  try {
    analytics = await getAdminAnalytics(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !analytics) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Platform overview</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Operators" value={String(analytics.totalOperators)} sub={`${analytics.pendingOperators} pending`} />
        <Stat label="Trips" value={String(analytics.totalTrips)} />
        <Stat label="Bookings" value={String(analytics.totalBookings)} />
        <Stat label="Revenue" value={`LKR ${analytics.totalRevenue.toLocaleString("en-LK")}`} />
      </div>

      {analytics.pendingRefundsCount > 0 && (
        <Link
          href="/admin/refunds"
          className="card mt-4 flex items-center justify-between p-4 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40"
        >
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {analytics.pendingRefundsCount} refund(s) awaiting manual processing — LKR{" "}
            {analytics.pendingRefundsAmount.toLocaleString("en-LK")}
          </span>
          <span className="ui text-sm font-medium text-amber-700 dark:text-amber-400">View →</span>
        </Link>
      )}

      <h2 className="mt-8 font-heading text-lg font-semibold">By operator</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
        <table className="ui w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2.5">Operator</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Bookings</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {analytics.perOperator.map((op) => (
              <tr key={op.operatorId} className="border-t border-slate-200 dark:border-zinc-800">
                <td className="px-4 py-2.5 font-medium">{op.name}</td>
                <td className="px-4 py-2.5 capitalize text-slate-500 dark:text-zinc-400">{op.status}</td>
                <td className="px-4 py-2.5 text-right">{op.bookings}</td>
                <td className="px-4 py-2.5 text-right font-medium text-brand dark:text-blue-400">
                  LKR {op.revenue.toLocaleString("en-LK")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="font-heading text-xl font-bold text-brand dark:text-blue-400 sm:text-2xl">{value}</div>
      <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">{label}</div>
      {sub && <div className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-600">{sub}</div>}
    </div>
  );
}
