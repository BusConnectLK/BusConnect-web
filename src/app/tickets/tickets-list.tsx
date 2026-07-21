"use client";

import Link from "next/link";
import { useState } from "react";
import { Bus, CalendarDays, CheckCircle2, ChevronDown, MapPin, QrCode } from "lucide-react";

export interface TicketBooking {
  id: string;
  code: string;
  seats: string[];
  amount: number;
  status: string;
  createdAt: string;
  departAt: string | null;
  routeName: string | null;
  operatorName: string;
  operatorLogo: string | null;
  busType: string | null;
  busClass: string | null;
  regNo: string | null;
  qrDataUrl: string | null;
  ticketStatus: string | null;
}

type Tab = "confirmed" | "pending" | "cancelled";

function tabOf(status: string): Tab {
  if (status === "confirmed") return "confirmed";
  if (status === "cancelled" || status === "refunded") return "cancelled";
  return "pending";
}

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK")}`;
}
function dateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<Tab, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const STATUS_LABEL: Record<Tab, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
};

export function TicketsList({ bookings }: { bookings: TicketBooking[] }) {
  const [tab, setTab] = useState<Tab>("confirmed");

  const counts: Record<Tab, number> = {
    confirmed: bookings.filter((b) => tabOf(b.status) === "confirmed").length,
    pending: bookings.filter((b) => tabOf(b.status) === "pending").length,
    cancelled: bookings.filter((b) => tabOf(b.status) === "cancelled").length,
  };
  const shown = bookings.filter((b) => tabOf(b.status) === tab);

  const tabs: Tab[] = ["confirmed", "pending", "cancelled"];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`ui rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-brand text-brand-fg"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {STATUS_LABEL[t]} {counts[t]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card mt-5 p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
          No {STATUS_LABEL[tab].toLowerCase()} bookings.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {shown.map((b) => (
            <TicketCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ b }: { b: TicketBooking }) {
  const [open, setOpen] = useState(false);
  const t = tabOf(b.status);
  const boarded = b.ticketStatus === "used";

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* poster */}
        <div
          className="relative flex h-32 w-full shrink-0 items-center justify-center sm:h-auto sm:w-40"
          style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
        >
          {b.operatorLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.operatorLogo}
              alt={`${b.operatorName} logo`}
              className="h-14 w-14 rounded-2xl border border-white/30 bg-white object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 font-heading text-xl font-bold text-white backdrop-blur">
              {b.operatorName.slice(0, 1)}
            </span>
          )}
        </div>

        {/* body */}
        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`ui rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[t]}`}>
              {STATUS_LABEL[t]}
            </span>
            {b.busClass && (
              <span className="ui rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                {b.busClass.replace("_", " ")}
              </span>
            )}
            {boarded && (
              <span className="ui flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 size={12} /> Boarded
              </span>
            )}
          </div>

          <h3 className="mt-2 font-heading text-lg font-bold tracking-tight">{b.routeName ?? b.operatorName}</h3>
          <p className="ui mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} /> {dateTime(b.departAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Bus size={13} /> {b.operatorName}
              {b.regNo ? ` · ${b.regNo}` : ""}
            </span>
          </p>

          {/* stats grid */}
          <dl className="ui mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-4 dark:border-zinc-800">
            <Stat label="Booking code" value={b.code} />
            <Stat label={b.seats.length === 1 ? "Seat" : "Seats"} value={b.seats.join(", ")} />
            <Stat label="Total paid" value={b.status === "confirmed" ? money(b.amount) : "—"} />
            <Stat label="Booked on" value={dateOnly(b.createdAt)} />
          </dl>

          {/* actions */}
          <div className="mt-4">
            {t === "confirmed" && b.qrDataUrl ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="btn-primary py-2.5"
              >
                <QrCode size={16} />
                {open ? "Hide QR" : "Show QR ticket"}
                <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            ) : t === "pending" ? (
              <Link href={`/bookings/${b.id}`} className="btn-primary py-2.5">
                Pay now
              </Link>
            ) : (
              <Link href={`/bookings/${b.id}`} className="btn-secondary py-2.5">
                View booking
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* expandable QR */}
      {open && b.qrDataUrl && (
        <div className="border-t border-slate-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto flex max-w-xs flex-col items-center">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.qrDataUrl} alt="Boarding QR code" className="h-52 w-52" />
              {boarded && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-zinc-950/70">
                  <span className="rotate-[-8deg] rounded-md bg-red-600 px-4 py-1.5 font-heading text-lg font-bold uppercase tracking-widest text-white shadow-lg">
                    Used
                  </span>
                </div>
              )}
            </div>
            <p className="ui mt-3 flex items-center gap-1.5 text-center text-xs text-slate-500 dark:text-zinc-500">
              <MapPin size={12} /> Show this at boarding · covers all {b.seats.length} seat
              {b.seats.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
