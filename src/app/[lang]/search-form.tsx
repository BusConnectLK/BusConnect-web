"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Calendar, MapPin, Search } from "lucide-react";
import type { Location } from "@/lib/locations";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SearchForm({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(locations[0]?.id ?? "");
  const [to, setTo] = useState(locations[1]?.id ?? locations[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());

  const hasLocations = locations.length > 0;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams({ from, to, date }).toString();
    router.push(`/search?${qs}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-end gap-2 sm:gap-3 lg:grid-cols-[1fr_auto_1fr_1fr_auto]"
    >
      <Field label="From" icon={<MapPin size={15} />}>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          disabled={!hasLocations}
          className="field appearance-none bg-[#3A3B3C]/40 py-2 text-[#E4E6EB] backdrop-blur-sm sm:bg-muted/40 sm:text-foreground sm:py-2.5"
        >
          {hasLocations ? (
            locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_en}
              </option>
            ))
          ) : (
            <option>No locations yet</option>
          )}
        </select>
      </Field>

      <button
        type="button"
        onClick={swap}
        aria-label="Swap origin and destination"
        className="hidden h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 text-slate-500 transition-colors duration-300 hover:bg-slate-50 hover:text-brand dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 lg:flex"
      >
        <ArrowLeftRight size={16} />
      </button>

      <Field label="To" icon={<MapPin size={15} />}>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          disabled={!hasLocations}
          className="field appearance-none bg-[#3A3B3C]/40 py-2 text-[#E4E6EB] backdrop-blur-sm sm:bg-muted/40 sm:text-foreground sm:py-2.5"
        >
          {hasLocations ? (
            locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_en}
              </option>
            ))
          ) : (
            <option>No locations yet</option>
          )}
        </select>
      </Field>

      <Field label="Date" icon={<Calendar size={15} />}>
        <input
          type="date"
          value={date}
          min={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          required
          className="field w-full min-w-0 bg-[#3A3B3C]/40 py-2 text-[#E4E6EB] backdrop-blur-sm sm:bg-muted/40 sm:text-foreground sm:py-2.5"
        />
      </Field>

      <button type="submit" disabled={!from || !to} className="btn-primary py-2 sm:py-2.5">
        <Search size={17} />
        Search
      </button>
    </form>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
      <span className="ui flex items-center gap-1.5 text-xs font-medium text-[#B0B3B8] sm:text-slate-600 sm:dark:text-zinc-400 sm:text-sm">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
