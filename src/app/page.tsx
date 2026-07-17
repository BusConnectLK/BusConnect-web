import Link from "next/link";
import {
  Armchair,
  ShieldCheck,
  Ticket,
  MapPinned,
  Languages,
  RefreshCw,
  Route,
  Clock,
  ArrowRight,
} from "lucide-react";
import { listLocations } from "@/lib/locations";
import { SearchForm } from "./search-form";
import { SectionHeading } from "@/components/ui";

export default async function Home() {
  const locations = await listLocations();
  return (
    <>
      <Hero locations={locations} />
      <Stats />
      <Features />
      <PopularRoutes locations={locations} />
      <HowItWorks />
      <OperatorCta />
    </>
  );
}

/* ── Hero + search widget ──────────────────────────────────────────────── */
function Hero({ locations }: { locations: Awaited<ReturnType<typeof listLocations>> }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Book bus tickets the <span className="text-brand dark:text-blue-400">smart</span> way
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-zinc-400">
            Search every major intercity route in Sri Lanka, pick your exact
            seat in real time, and pay securely. All in one place.
          </p>
        </div>

        <div className="card-lg mx-auto mt-9 max-w-4xl p-4 sm:p-6">
          <SearchForm locations={locations} />
          {locations.length === 0 && (
            <p className="ui mt-3 text-center text-sm text-slate-500 dark:text-zinc-500">
              No routes seeded yet — add locations in Supabase to enable search.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Trust stats ───────────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    ["50+", "Routes"],
    ["3", "Languages"],
    ["24/7", "Support"],
    ["100%", "Secure"],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="card px-4 py-5 text-center">
            <div className="font-heading text-2xl font-bold text-brand dark:text-blue-400 sm:text-3xl">
              {value}
            </div>
            <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Feature grid ──────────────────────────────────────────────────────── */
function Features() {
  const features = [
    [Armchair, "Real-time seat maps", "See exactly which seats are free and pick yours before you pay — no double bookings, ever."],
    [ShieldCheck, "Secure payments", "Pay by card, eZ Cash or bank through PCI-compliant gateways. Your money is protected."],
    [Ticket, "Instant e-tickets", "Get a QR e-ticket by SMS and email the moment you pay. Scan and board — even offline."],
    [MapPinned, "Live bus tracking", "Follow your bus on the map with predicted arrival at your boarding point."],
    [Languages, "Three languages", "Book fully in English, Sinhala or Tamil — whichever you prefer."],
    [RefreshCw, "Easy refunds", "Cancel or reschedule yourself in a tap. No phone calls, no queues."],
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        title="Why BusConnect"
        subtitle="Everything the old booking sites do,done smarter, faster and in your language."
      />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, title, body]) => (
          <div key={title} className="card card-hover p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
              <Icon size={21} />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Popular routes ────────────────────────────────────────────────────── */
function PopularRoutes({
  locations,
}: {
  locations: Awaited<ReturnType<typeof listLocations>>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const byName = Object.fromEntries(locations.map((l) => [l.name_en, l.id]));
  const routes: [string, string, string][] = [
    ["Colombo Fort", "Kandy", "3h"],
    ["Colombo Fort", "Jaffna", "8h"],
    ["Colombo Fort", "Galle", "2h"],
    ["Kandy", "Nuwara Eliya", "2h 30m"],
    ["Colombo Fort", "Badulla", "7h"],
    ["Galle", "Matara", "1h"],
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        id="routes"
        icon={<Route size={18} />}
        title="Popular routes"
        subtitle="Sri Lanka's most-travelled corridors."
      />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map(([from, to, dur]) => {
          const fromId = byName[from];
          const toId = byName[to];
          const href =
            fromId && toId ? `/search?from=${fromId}&to=${toId}&date=${today}` : "/";
          return (
            <Link key={`${from}-${to}`} href={href} className="card card-hover group overflow-hidden">
              <div
                className="flex aspect-[16/9] items-end p-5"
                style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
              >
                <span className="ui inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Clock size={13} /> {dur}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2 font-heading font-semibold">
                  {from}
                  <ArrowRight size={15} className="text-slate-400" />
                  {to}
                </div>
                <span className="ui flex items-center gap-1 text-sm font-medium text-brand transition-transform group-hover:translate-x-0.5 dark:text-blue-400">
                  Find buses <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ── How it works ──────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    ["Search", "Enter your route and date to see every available bus."],
    ["Pick your seat", "Choose your exact seat on a live, real-time seat map."],
    ["Pay securely", "Pay by card, eZ Cash or bank in a few taps."],
    ["Board with QR", "Get your e-ticket instantly and scan it to board."],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading id="how" title="How it works" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], i) => (
          <div key={title} className="card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-heading font-bold text-brand-fg shadow-lg shadow-brand/20">
              {i + 1}
            </span>
            <h3 className="mt-4 font-heading font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Operator CTA ──────────────────────────────────────────────────────── */
function OperatorCta() {
  return (
    <section id="operators" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
      <div
        className="overflow-hidden rounded-3xl p-8 sm:p-12"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #05235a 100%)" }}
      >
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Run a bus fleet? Fill more seats.
          </h2>
          <p className="mt-3 text-white/80">
            List your buses on BusConnect and get a live manifest, dynamic
            pricing and revenue analytics - reach passengers across the country.
          </p>
          <Link
            href="/operator"
            className="ui mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand transition-colors duration-300 hover:bg-white/90"
          >
            Operator dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
