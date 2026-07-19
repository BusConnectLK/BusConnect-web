import Link from "next/link";
import { Ticket, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface BookingRow {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  trip: {
    depart_at: string;
    bus: { operator: { name: string } | null } | null;
  } | null;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  refunded: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function TicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/tickets" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to see your tickets
        </Link>
      </div>
    );
  }

  // RLS restricts this to the signed-in user's own bookings.
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, seats, amount, status, created_at, trip:trips ( depart_at, bus:buses ( operator:operators ( name ) ) )",
    )
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <Ticket size={18} />
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My tickets</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-slate-600 dark:text-zinc-400">You haven&apos;t booked any trips yet.</p>
          <Link href="/" className="btn-primary mt-4">
            Search buses
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="card card-hover flex items-center justify-between p-4"
            >
              <div className="min-w-0">
                <p className="font-heading font-semibold">
                  {b.trip?.bus?.operator?.name ?? "Trip"}
                </p>
                <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                  <CalendarDays size={13} />
                  {b.trip?.depart_at
                    ? new Date(b.trip.depart_at).toLocaleDateString("en-LK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                  <span className="text-slate-300 dark:text-zinc-600">·</span>
                  Seats {b.seats.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-heading font-bold text-brand dark:text-blue-400">
                    LKR {Number(b.amount).toLocaleString("en-LK")}
                  </p>
                  <span
                    className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                    }`}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
