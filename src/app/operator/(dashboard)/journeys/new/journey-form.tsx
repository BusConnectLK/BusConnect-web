"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Save, Send, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getOperatorRouteCatalog,
  getOperatorFleet,
  listPilots,
  createJourney,
  updateJourney,
  ApiError,
  type RouteCatalogEntry,
  type OperatorBus,
  type OperatorPilot,
  type OperatorJourneyDetail,
} from "@/lib/api";
import { WEEKDAYS } from "@/lib/journey-format";

interface StopRow {
  routeStopId: string;
  name: string;
  time: string;
  canBoard: boolean;
  canDrop: boolean;
}

export function JourneyForm({ initial }: { initial?: OperatorJourneyDetail }) {
  const router = useRouter();
  const editing = !!initial;

  const [routes, setRoutes] = useState<RouteCatalogEntry[]>([]);
  const [buses, setBuses] = useState<OperatorBus[]>([]);
  const [pilots, setPilots] = useState<OperatorPilot[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [routeId, setRouteId] = useState(initial?.route?.id ?? "");
  const [busId, setBusId] = useState(initial?.bus?.id ?? "");
  const [departTime, setDepartTime] = useState(initial?.depart_time.slice(0, 5) ?? "");
  const [arriveTime, setArriveTime] = useState(initial?.arrive_time.slice(0, 5) ?? "");
  const [arriveNextDay, setArriveNextDay] = useState(initial ? initial.arrive_day_offset > 0 : false);
  const [departLocation, setDepartLocation] = useState(initial?.depart_location ?? "");
  const [departLocationUrl, setDepartLocationUrl] = useState(initial?.depart_location_url ?? "");
  const [arriveLocation, setArriveLocation] = useState(initial?.arrive_location ?? "");
  const [arriveLocationUrl, setArriveLocationUrl] = useState(initial?.arrive_location_url ?? "");
  const [baseFare, setBaseFare] = useState(initial ? String(initial.base_fare) : "");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly">(initial?.recurrence ?? "daily");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set(initial?.weekdays ?? []));
  const [startDate, setStartDate] = useState(initial?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [stops, setStops] = useState<StopRow[]>(
    initial
      ? [...initial.stops]
          .sort((a, b) => a.seq - b.seq)
          .map((s) => ({
            routeStopId: s.route_stop_id,
            name: s.route_stop?.location?.name_en ?? "—",
            time: s.scheduled_time.slice(0, 5),
            canBoard: s.can_board,
            canDrop: s.can_drop,
          }))
      : [],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const [routeList, fleet, pilotList] = await Promise.all([
          getOperatorRouteCatalog(session.access_token),
          getOperatorFleet(session.access_token),
          listPilots(session.access_token),
        ]);
        setRoutes(routeList);
        setBuses(fleet.buses.filter((b) => b.status === "active" || b.id === initial?.bus?.id));
        setPilots(pilotList);
      } catch (e) {
        setLoadErr(e instanceof ApiError ? e.message : "Could not load your routes and buses.");
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Departure/arrival time changes mirror into the first/last timetable rows.
  function changeDepartTime(v: string) {
    setDepartTime(v);
    setStops((prev) => (prev.length ? prev.map((s, i) => (i === 0 ? { ...s, time: v } : s)) : prev));
  }
  function changeArriveTime(v: string) {
    setArriveTime(v);
    setStops((prev) =>
      prev.length ? prev.map((s, i) => (i === prev.length - 1 ? { ...s, time: v } : s)) : prev,
    );
  }

  // Rebuild the timetable rows whenever the route changes.
  function pickRoute(id: string) {
    setRouteId(id);
    const route = routes.find((r) => r.id === id);
    if (!route) {
      setStops([]);
      return;
    }
    const rows: StopRow[] = route.stops
      .filter((s) => s.id && s.location)
      .map((s, i, arr) => ({
        routeStopId: s.id!,
        name: s.location!.name_en,
        time: i === 0 ? departTime : i === arr.length - 1 ? arriveTime : "",
        canBoard: i < arr.length - 1, // everyone except the final stop can board
        canDrop: i > 0, // everyone except the origin can be dropped
      }));
    setStops(rows);
    // default the depart/arrive location names to the endpoints
    if (route.stops.length > 0) {
      setDepartLocation((v) => v || route.stops[0].location?.name_en || "");
      setArriveLocation((v) => v || route.stops[route.stops.length - 1].location?.name_en || "");
    }
  }

  const crew = useMemo(() => {
    const onBus = pilots.filter((p) => p.assigned_bus_id === busId && p.status === "active");
    return {
      driver: onBus.find((p) => p.assigned_role === "driver")?.name ?? null,
      conductor: onBus.find((p) => p.assigned_role === "conductor")?.name ?? null,
    };
  }, [pilots, busId]);

  function setStop(i: number, patch: Partial<StopRow>) {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function toggleWeekday(d: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!routeId) return setError("Choose a route.");
    if (!busId) return setError("Choose a bus.");
    if (!departTime || !arriveTime) return setError("Set the departure and arrival times.");
    if (!baseFare || Number(baseFare) < 0) return setError("Set a valid base fare.");
    if (recurrence === "weekly" && weekdays.size === 0) return setError("Pick at least one day of the week.");
    if (stops.some((s) => !s.time)) return setError("Every stop needs a time in the timetable.");

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/operator/journeys${editing ? `/${initial.id}/edit` : "/new"}`);
        return;
      }
      const payload = {
        routeId,
        busId,
        departTime,
        arriveTime,
        arriveDayOffset: arriveNextDay ? 1 : 0,
        departLocation: departLocation || undefined,
        departLocationUrl: departLocationUrl || undefined,
        arriveLocation: arriveLocation || undefined,
        arriveLocationUrl: arriveLocationUrl || undefined,
        baseFare: Number(baseFare),
        recurrence,
        weekdays: recurrence === "weekly" ? [...weekdays] : undefined,
        startDate,
        endDate: endDate || undefined,
        stops: stops.map((s) => ({
          routeStopId: s.routeStopId,
          time: s.time,
          canBoard: s.canBoard,
          canDrop: s.canDrop,
        })),
      };
      if (editing) {
        await updateJourney(session.access_token, initial.id, payload);
        router.push(`/operator/journeys/${initial.id}`);
      } else {
        await createJourney(session.access_token, payload);
        router.push("/operator/journeys");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Could not ${editing ? "save" : "create"} the journey. Try again.`);
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }
  if (loadErr) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {loadErr}
      </p>
    );
  }
  if (routes.length === 0 || buses.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
        {buses.length === 0
          ? "You need at least one approved bus before creating a journey — register one in Fleet."
          : "No routes in the catalog yet — ask BusConnect to add the route you run."}
      </div>
    );
  }

  const labelCls = "ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300";

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* ── Route & bus ─────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Route &amp; bus
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Route
            <Select value={routeId} onChange={pickRoute} placeholder="Choose a route…">
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </label>
          <label className={labelCls}>
            Bus
            <Select value={busId} onChange={setBusId} placeholder="Choose a bus…">
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.reg_no} · {b.bus_type?.name ?? "—"}
                </option>
              ))}
            </Select>
          </label>
        </div>
        {busId && (
          <p className="ui mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
            <User size={13} />
            {crew.driver || crew.conductor ? (
              <>
                Auto-assigned:{" "}
                <strong>{crew.driver ?? "no driver"}</strong> (driver) ·{" "}
                <strong>{crew.conductor ?? "no conductor"}</strong> (conductor)
              </>
            ) : (
              "No driver/conductor assigned to this bus yet — assign them in Pilots."
            )}
          </p>
        )}
      </section>

      {/* ── Schedule ────────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Schedule
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Departure time
            <input type="time" value={departTime} onChange={(e) => changeDepartTime(e.target.value)} required className="field text-sm" />
          </label>
          <label className={labelCls}>
            Arrival time
            <input type="time" value={arriveTime} onChange={(e) => changeArriveTime(e.target.value)} required className="field text-sm" />
          </label>
        </div>
        <label className="ui mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
          <input type="checkbox" checked={arriveNextDay} onChange={(e) => setArriveNextDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-zinc-700" />
          Arrives the next day (overnight)
        </label>

        <div className="mt-5">
          <p className="ui mb-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">Runs on</p>
          <div className="flex gap-2">
            {(["daily", "weekly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrence(r)}
                className={`ui rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  recurrence === r ? "bg-brand text-brand-fg" : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {r === "daily" ? "Every day" : "Selected days"}
              </button>
            ))}
          </div>
          {recurrence === "weekly" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWeekday(i)}
                  className={`ui rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    weekdays.has(i) ? "bg-brand text-brand-fg" : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Start date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="field text-sm" />
          </label>
          <label className={labelCls}>
            End date <span className="font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field text-sm" />
          </label>
        </div>
      </section>

      {/* ── Departure & arrival locations ───────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Departure &amp; arrival points
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Departure location
            <input value={departLocation} onChange={(e) => setDepartLocation(e.target.value)} placeholder="e.g. Trincomalee Bus Stand" className="field text-sm" />
          </label>
          <label className={labelCls}>
            Departure map link
            <input value={departLocationUrl} onChange={(e) => setDepartLocationUrl(e.target.value)} placeholder="https://maps.google.com/…" className="field text-sm" />
          </label>
          <label className={labelCls}>
            Arrival location
            <input value={arriveLocation} onChange={(e) => setArriveLocation(e.target.value)} placeholder="e.g. Colombo Fort" className="field text-sm" />
          </label>
          <label className={labelCls}>
            Arrival map link
            <input value={arriveLocationUrl} onChange={(e) => setArriveLocationUrl(e.target.value)} placeholder="https://maps.google.com/…" className="field text-sm" />
          </label>
        </div>
      </section>

      {/* ── Fare ────────────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Fare
        </h2>
        <label className={`${labelCls} mt-4 max-w-xs`}>
          Base fare (LKR)
          <input type="number" min={0} value={baseFare} onChange={(e) => setBaseFare(e.target.value)} placeholder="e.g. 2147" required className="field text-sm" />
        </label>
      </section>

      {/* ── Boarding & drop-off timetable ───────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Boarding &amp; drop-off points
        </h2>
        {stops.length === 0 ? (
          <p className="ui mt-3 text-sm text-slate-500 dark:text-zinc-500">Choose a route to load its stops.</p>
        ) : (
          <>
            <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Set the time the bus is at each stop, and whether passengers can board and/or be dropped there.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="ui hidden grid-cols-[1.5rem_1fr_7rem_auto] items-center gap-3 px-1 text-xs font-medium text-slate-400 sm:grid dark:text-zinc-600">
                <span>#</span>
                <span>Stop</span>
                <span>Time</span>
                <span className="text-right">Board / Drop</span>
              </div>
              {stops.map((s, i) => (
                <div
                  key={s.routeStopId}
                  className="grid grid-cols-1 items-center gap-2 rounded-xl bg-slate-50 p-2.5 sm:grid-cols-[1.5rem_1fr_7rem_auto] sm:gap-3 sm:bg-transparent sm:p-1 dark:bg-zinc-900 sm:dark:bg-transparent"
                >
                  <span className="ui text-xs font-semibold text-slate-400 dark:text-zinc-500">{i + 1}</span>
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <input
                    type="time"
                    value={s.time}
                    onChange={(e) => setStop(i, { time: e.target.value })}
                    className="field py-1.5 text-sm"
                  />
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <label className="ui flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                      <input type="checkbox" checked={s.canBoard} onChange={(e) => setStop(i, { canBoard: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand dark:border-zinc-700" />
                      Board
                    </label>
                    <label className="ui flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                      <input type="checkbox" checked={s.canDrop} onChange={(e) => setStop(i, { canDrop: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand dark:border-zinc-700" />
                      Drop
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary self-start py-3.5">
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : editing ? (
          <Save size={16} />
        ) : (
          <Send size={16} />
        )}
        {editing ? (busy ? "Saving…" : "Save changes") : busy ? "Creating…" : "Create journey"}
      </button>
    </form>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field appearance-none pr-9 text-sm"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
    </div>
  );
}
