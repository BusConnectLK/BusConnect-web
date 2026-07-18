"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listAdminLocations,
  listAdminRoutes,
  createAdminRoute,
  listAdminOperators,
  ApiError,
  type AdminLocation,
  type AdminRoute,
  type AdminOperator,
} from "@/lib/api";

export default function AdminRoutesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setToken(session.access_token);
      const [ops, locs, routeList] = await Promise.all([
        listAdminOperators(session.access_token),
        listAdminLocations(session.access_token),
        listAdminRoutes(session.access_token),
      ]);
      setOperators(ops);
      setLocations(locs);
      setRoutes(routeList);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 403
            ? "Your account does not have admin access."
            : e.message
          : "Could not reach BusConnect-api. Is it running?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading routes…
      </div>
    );
  }
  if (error || !token) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Routes</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Origin/destination corridors — trips can only be scheduled on a route that exists here.
      </p>

      <div className="mt-6">
        <RoutesForm token={token} routes={routes} operators={operators} locations={locations} onCreated={loadAll} />
      </div>
    </div>
  );
}

function RoutesForm({
  token,
  routes,
  operators,
  locations,
  onCreated,
}: {
  token: string;
  routes: AdminRoute[];
  operators: AdminOperator[];
  locations: AdminLocation[];
  onCreated: () => void;
}) {
  const [operatorId, setOperatorId] = useState(operators[0]?.id ?? "");
  const [originLocationId, setOriginLocationId] = useState(locations[0]?.id ?? "");
  const [destLocationId, setDestLocationId] = useState(locations[1]?.id ?? locations[0]?.id ?? "");
  const [durationMinutes, setDurationMinutes] = useState("180");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAdminRoute(token, {
        operatorId,
        originLocationId,
        destLocationId,
        durationMinutes: Number(durationMinutes),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create route.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">Routes ({routes.length})</h2>
        {routes.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">Nothing yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {routes.map((r) => (
              <div key={r.id} className="card p-4">
                <p className="font-medium">
                  {r.origin?.name_en ?? "—"} → {r.dest?.name_en ?? "—"}
                </p>
                <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{r.operator?.name ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
        <h3 className="font-heading font-semibold">New route</h3>
        <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} required className="field appearance-none">
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={originLocationId} onChange={(e) => setOriginLocationId(e.target.value)} required className="field appearance-none">
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              From: {l.name_en}
            </option>
          ))}
        </select>
        <select value={destLocationId} onChange={(e) => setDestLocationId(e.target.value)} required className="field appearance-none">
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              To: {l.name_en}
            </option>
          ))}
        </select>
        <input
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="Duration (minutes)"
          type="number"
          min="1"
          className="field"
        />
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !operatorId || !originLocationId || !destLocationId || originLocationId === destLocationId}
          className="btn-primary mt-1"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
          {busy ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
