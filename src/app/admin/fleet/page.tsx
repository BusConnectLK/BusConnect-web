"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listAdminLocations,
  createAdminLocation,
  listAdminBusTypes,
  createAdminBusType,
  listAdminBuses,
  createAdminBus,
  listAdminRoutes,
  createAdminRoute,
  listAdminOperators,
  ApiError,
  type AdminLocation,
  type AdminBusType,
  type AdminBus,
  type AdminRoute,
  type AdminOperator,
} from "@/lib/api";

const TABS = ["locations", "bus-types", "buses", "routes"] as const;
type Tab = (typeof TABS)[number];

export default function AdminFleetPage() {
  const [tab, setTab] = useState<Tab>("locations");
  const [token, setToken] = useState<string | null>(null);
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [busTypes, setBusTypes] = useState<AdminBusType[]>([]);
  const [buses, setBuses] = useState<AdminBus[]>([]);
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
      const [ops, locs, types, busList, routeList] = await Promise.all([
        listAdminOperators(session.access_token),
        listAdminLocations(session.access_token),
        listAdminBusTypes(session.access_token),
        listAdminBuses(session.access_token),
        listAdminRoutes(session.access_token),
      ]);
      setOperators(ops);
      setLocations(locs);
      setBusTypes(types);
      setBuses(busList);
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
        <Loader2 size={16} className="animate-spin" /> Loading fleet data…
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
      <h1 className="font-heading text-2xl font-bold tracking-tight">Fleet master data</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Locations, bus types, buses and routes — operators can only schedule trips on what exists here.
      </p>

      <div className="ui mt-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                : "text-slate-500 dark:text-zinc-400"
            }`}
          >
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "locations" && <LocationsTab token={token} locations={locations} onCreated={loadAll} />}
        {tab === "bus-types" && <BusTypesTab token={token} busTypes={busTypes} onCreated={loadAll} />}
        {tab === "buses" && (
          <BusesTab token={token} buses={buses} operators={operators} busTypes={busTypes} onCreated={loadAll} />
        )}
        {tab === "routes" && (
          <RoutesTab token={token} routes={routes} operators={operators} locations={locations} onCreated={loadAll} />
        )}
      </div>
    </div>
  );
}

/* ── Locations ─────────────────────────────────────────────────────────── */
function LocationsTab({
  token,
  locations,
  onCreated,
}: {
  token: string;
  locations: AdminLocation[];
  onCreated: () => void;
}) {
  const [nameEn, setNameEn] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAdminLocation(token, { nameEn, lat: Number(lat), lng: Number(lng) });
      setNameEn("");
      setLat("");
      setLng("");
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create location.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <List title="Locations" items={locations.map((l) => ({ id: l.id, primary: l.name_en }))} />
      <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
        <h3 className="font-heading font-semibold">New location</h3>
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (e.g. Matara)" required className="field" />
        <div className="grid grid-cols-2 gap-2">
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" type="number" step="any" required className="field" />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" type="number" step="any" required className="field" />
        </div>
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <SubmitBtn busy={busy} />
      </form>
    </div>
  );
}

/* ── Bus types ─────────────────────────────────────────────────────────── */
function BusTypesTab({
  token,
  busTypes,
  onCreated,
}: {
  token: string;
  busTypes: AdminBusType[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [busClass, setBusClass] = useState("luxury");
  const [seatCount, setSeatCount] = useState("45");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAdminBusType(token, { name, busClass, seatCount: Number(seatCount) });
      setName("");
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create bus type.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <List
        title="Bus types"
        items={busTypes.map((t) => ({ id: t.id, primary: t.name, secondary: `${t.class.replace("_", " ")} · ${t.seat_count} seats` }))}
      />
      <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
        <h3 className="font-heading font-semibold">New bus type</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Luxury 45-seat)" required className="field" />
        <select value={busClass} onChange={(e) => setBusClass(e.target.value)} className="field appearance-none">
          {["normal", "semi_luxury", "luxury", "super_luxury"].map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        <input value={seatCount} onChange={(e) => setSeatCount(e.target.value)} placeholder="Seat count" type="number" min="1" required className="field" />
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <SubmitBtn busy={busy} />
      </form>
    </div>
  );
}

/* ── Buses ─────────────────────────────────────────────────────────────── */
function BusesTab({
  token,
  buses,
  operators,
  busTypes,
  onCreated,
}: {
  token: string;
  buses: AdminBus[];
  operators: AdminOperator[];
  busTypes: AdminBusType[];
  onCreated: () => void;
}) {
  const [operatorId, setOperatorId] = useState(operators[0]?.id ?? "");
  const [busTypeId, setBusTypeId] = useState(busTypes[0]?.id ?? "");
  const [regNo, setRegNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAdminBus(token, { operatorId, busTypeId, regNo });
      setRegNo("");
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create bus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <List
        title="Buses"
        items={buses.map((b) => ({ id: b.id, primary: b.reg_no, secondary: `${b.operator?.name ?? "—"} · ${b.bus_type?.name ?? "—"}` }))}
      />
      <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
        <h3 className="font-heading font-semibold">New bus</h3>
        <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} required className="field appearance-none">
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={busTypeId} onChange={(e) => setBusTypeId(e.target.value)} required className="field appearance-none">
          {busTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="Registration no. (e.g. NC-1234)" required className="field" />
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <SubmitBtn busy={busy} disabled={!operatorId || !busTypeId} />
      </form>
    </div>
  );
}

/* ── Routes ────────────────────────────────────────────────────────────── */
function RoutesTab({
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
      <List
        title="Routes"
        items={routes.map((r) => ({
          id: r.id,
          primary: `${r.origin?.name_en ?? "—"} → ${r.dest?.name_en ?? "—"}`,
          secondary: r.operator?.name ?? "—",
        }))}
      />
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
        <SubmitBtn busy={busy} disabled={!operatorId || !originLocationId || !destLocationId || originLocationId === destLocationId} />
      </form>
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────── */
function List({ title, items }: { title: string; items: { id: string; primary: string; secondary?: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 font-heading text-lg font-semibold">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">Nothing yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="card p-4">
              <p className="font-medium">{it.primary}</p>
              {it.secondary && <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{it.secondary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitBtn({ busy, disabled }: { busy: boolean; disabled?: boolean }) {
  return (
    <button type="submit" disabled={busy || disabled} className="btn-primary mt-1">
      {busy ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
      {busy ? "Creating…" : "Create"}
    </button>
  );
}
