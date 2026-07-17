"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createOperatorTrip, ApiError } from "@/lib/api";

interface Option {
  id: string;
  label: string;
}

function defaultDepartAt() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16); // datetime-local format
}

export function NewTripForm({ routes, buses }: { routes: Option[]; buses: Option[] }) {
  const router = useRouter();
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [busId, setBusId] = useState(buses[0]?.id ?? "");
  const [departAt, setDepartAt] = useState(defaultDepartAt());
  const [baseFare, setBaseFare] = useState("950");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/trips/new");
        return;
      }
      const trip = await createOperatorTrip(session.access_token, {
        routeId,
        busId,
        departAt: new Date(departAt).toISOString(),
        baseFare: Number(baseFare),
      });
      router.push(`/operator/trips/${trip.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not schedule this trip. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Label text="Route">
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)} required className="field appearance-none">
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </Label>

      <Label text="Bus">
        <select value={busId} onChange={(e) => setBusId(e.target.value)} required className="field appearance-none">
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Label>

      <Label text="Departure" icon={<Calendar size={14} />}>
        <input
          type="datetime-local"
          value={departAt}
          onChange={(e) => setDepartAt(e.target.value)}
          required
          className="field"
        />
      </Label>

      <Label text="Base fare (LKR)">
        <input
          type="number"
          min="0"
          step="1"
          value={baseFare}
          onChange={(e) => setBaseFare(e.target.value)}
          required
          className="field"
        />
      </Label>

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary mt-1 py-3.5">
        {busy && <Loader2 size={18} className="animate-spin" />}
        {busy ? "Scheduling…" : "Schedule trip"}
      </button>
    </form>
  );
}

function Label({
  text,
  icon,
  children,
}: {
  text: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
      <span className="flex items-center gap-1.5">
        {icon}
        {text}
      </span>
      {children}
    </label>
  );
}
