import Link from "next/link";
import { Wallet, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorRevenue, ApiError, type OperatorRevenue } from "@/lib/api";
import { ViewSlipButton } from "./view-slip-button";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function OperatorRevenuePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/revenue" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view your revenue
      </Link>
    );
  }

  let data: OperatorRevenue | null = null;
  let error: string | null = null;
  try {
    data = await getOperatorRevenue(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can view revenue."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !data) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Could not load revenue."}
      </p>
    );
  }

  const { rows, totals } = data;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <Wallet size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Your earnings per trip and what BusConnect has settled with you.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Net earned" value={money(totals.netEarned)} />
        <Stat label="Paid out" value={money(totals.paidOut)} accent />
        <Stat label="Pending" value={money(totals.pending)} />
        <Stat label="Gross fares" value={money(totals.grossEarned)} />
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {rows.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No earnings yet — revenue appears here once your trips start selling seats.
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.trip_id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</p>
                    {r.payout_status === "paid" ? (
                      <span className="ui shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Paid
                      </span>
                    ) : (
                      <span className="ui shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                    Bus {r.bus?.reg_no ?? "—"} · {dateTime(r.depart_at)}
                  </p>
                  <p className="ui mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                    <Users size={12} /> {r.seats_sold} seat{r.seats_sold === 1 ? "" : "s"} sold
                    {r.payout_status === "paid" && r.paid_at ? ` · paid ${dateTime(r.paid_at)}` : ""}
                    {r.reference ? ` · ref ${r.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="ui text-xs text-slate-400 dark:text-zinc-500">
                      {money(r.gross)} − {r.commission_pct}%
                    </p>
                    <p className="font-heading text-lg font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                  </div>
                  {r.payout_status === "paid" && r.has_slip && <ViewSlipButton tripId={r.trip_id} />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-4 text-center">
      <div className={`font-heading text-lg font-bold ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-brand dark:text-blue-400"}`}>
        {value}
      </div>
      <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">{label}</div>
    </div>
  );
}
