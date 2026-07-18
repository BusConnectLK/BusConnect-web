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
  setAdminBusStatus,
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
          {["normal", "semi_luxury", "luxury", "super_luxury", "expressway"].map((c) => (
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
      <BusList buses={buses} token={token} onChanged={onCreated} />
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

const BUS_STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function BusList({ buses, token, onChanged }: { buses: AdminBus[]; token: string; onChanged: () => void }) {
  return (
    <div>
      <h2 className="mb-3 font-heading text-lg font-semibold">Buses ({buses.length})</h2>
      {buses.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">Nothing yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {buses.map((b) => (
            <BusRow key={b.id} bus={b} token={token} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function BusRow({ bus, token, onChanged }: { bus: AdminBus; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: "active" | "rejected") {
    setError(null);
    setBusy(status);
    try {
      await setAdminBusStatus(token, bus.id, status);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update bus status.");
    } finally {
      setBusy(null);
    }
  }

  const photos: [string, string | null | undefined][] = [
    ["Front", bus.front_image_url],
    ["Side 1", bus.side_image_urls?.[0]],
    ["Side 2", bus.side_image_urls?.[1]],
    ["Interior", bus.interior_image_url],
    ["Seat layout", bus.seat_layout_image_url],
  ];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {bus.front_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bus.front_image_url}
              alt={`${bus.reg_no} front`}
              className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
            />
          ) : (
            <div className="h-14 w-20 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{bus.reg_no}</p>
              <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BUS_STATUS_STYLE[bus.status]}`}>
                {bus.status}
              </span>
            </div>
            <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
              {bus.operator?.name ?? "—"} · {bus.bus_type?.name ?? "—"} · {bus.bus_type?.seat_count ?? "—"} seats
            </p>
            {bus.amenities.length > 0 && (
              <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">{bus.amenities.join(", ")}</p>
            )}
            {bus.notes && (
              <p className="ui mt-1 text-xs italic text-slate-500 dark:text-zinc-500">&ldquo;{bus.notes}&rdquo;</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {photos.map(([label, url]) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline dark:text-blue-400"
                  >
                    {label}
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
          <div className="flex gap-1.5">
            {bus.status !== "active" && (
              <button
                type="button"
                onClick={() => setStatus("active")}
                disabled={!!busy}
                className="ui rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy === "active" ? <Loader2 size={13} className="animate-spin" /> : "Approve"}
              </button>
            )}
            {bus.status !== "rejected" && (
              <button
                type="button"
                onClick={() => setStatus("rejected")}
                disabled={!!busy}
                className="ui rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy === "rejected" ? <Loader2 size={13} className="animate-spin" /> : "Reject"}
              </button>
            )}
          </div>
        </div>
      </div>
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
