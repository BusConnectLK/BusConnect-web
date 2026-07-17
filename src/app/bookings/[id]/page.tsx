import Link from "next/link";
import { ArrowLeft, CheckCircle2, TicketCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBooking, ApiError, type Booking } from "@/lib/api";
import { PayButton } from "./pay-button";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { id } = await params;
  const { paid, cancelled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href={`/login?next=/bookings/${id}`}
          className="font-medium text-brand underline dark:text-blue-400"
        >
          Sign in to view this booking
        </Link>
      </div>
    );
  }

  let booking: Booking | null = null;
  let error: string | null = null;
  try {
    booking = await getBooking(session.access_token, id);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Booking not found."}
        </p>
      </div>
    );
  }

  const isConfirmed = booking.status === "confirmed";
  const isPayable = booking.status === "pending" || booking.status === "reserved_unpaid";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Your booking</h1>
      <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">Ref {booking.id}</p>

      {paid && !isConfirmed && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Payment received — confirming your seats. Refresh in a moment.
        </p>
      )}
      {cancelled && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Payment cancelled. Your seats are held until the timer runs out.
        </p>
      )}

      <div className="card mt-6 p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="ui text-slate-500 dark:text-zinc-400">Seats</dt>
            <dd className="font-semibold">{booking.seats.join(", ")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="ui text-slate-500 dark:text-zinc-400">Amount</dt>
            <dd className="font-heading font-bold text-brand dark:text-blue-400">
              LKR {Number(booking.amount).toLocaleString("en-LK")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="ui text-slate-500 dark:text-zinc-400">Status</dt>
            <dd
              className={
                isConfirmed
                  ? "flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold capitalize"
              }
            >
              {isConfirmed && <CheckCircle2 size={15} />}
              {booking.status.replace("_", " ")}
            </dd>
          </div>
        </dl>
      </div>

      {isConfirmed && booking.tickets?.[0] && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <TicketCheck size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-heading font-semibold text-emerald-800 dark:text-emerald-300">
              Ticket issued
            </p>
            <p className="ui mt-1 text-emerald-700 dark:text-emerald-400/90">
              Show this reference when boarding: {booking.tickets[0].id}
            </p>
          </div>
        </div>
      )}

      {isPayable && (
        <div className="mt-6">
          <PayButton bookingId={booking.id} />
        </div>
      )}

      <Link
        href="/"
        className="ui mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to search
      </Link>
    </div>
  );
}
