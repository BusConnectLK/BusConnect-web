"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, PlusCircle, Save, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listAdminLocations,
  createAdminLocation,
  listAdminRoutes,
  createAdminRoute,
  updateAdminRoute,
  deleteAdminRoute,
  ApiError,
  type AdminLocation,
  type AdminRoute,
} from "@/lib/api";

interface EditorState {
  id?: string;
  name: string;
  stopIds: string[]; // ordered; "" for an empty slot awaiting a pick
}

export default function AdminRoutesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
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
      const [locs, routeList] = await Promise.all([
        listAdminLocations(session.access_token),
        listAdminRoutes(session.access_token),
      ]);
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

  async function createLocation(name: string): Promise<AdminLocation> {
    if (!token) throw new Error("Not signed in");
    const loc = await createAdminLocation(token, { nameEn: name });
    setLocations((prev) => (prev.some((l) => l.id === loc.id) ? prev : [...prev, loc].sort((a, b) => a.name_en.localeCompare(b.name_en))));
    return loc;
  }

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Routes</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Shared route catalog — each route is an ordered list of stops from origin to
            destination. Any operator can run a journey on any route.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            onClick={() => setEditor({ name: "", stopIds: ["", ""] })}
            className="btn-primary shrink-0"
          >
            <PlusCircle size={16} /> New route
          </button>
        )}
      </div>

      {editor && (
        <RouteEditor
          token={token}
          locations={locations}
          editor={editor}
          setEditor={setEditor}
          onCreateLocation={createLocation}
          onSaved={() => {
            setEditor(null);
            void loadAll();
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-2">
        {routes.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No routes yet.
          </div>
        ) : (
          routes.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    {r.stops.map((s) => s.location?.name_en ?? "—").join("  →  ")}
                  </p>
                  <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">{r.stops.length} stops</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        id: r.id,
                        name: r.name,
                        stopIds: r.stops.map((s) => s.location?.id ?? "").filter(Boolean),
                      })
                    }
                    className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <DeleteRouteButton token={token} routeId={r.id} routeName={r.name} onDeleted={loadAll} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RouteEditor({
  token,
  locations,
  editor,
  setEditor,
  onCreateLocation,
  onSaved,
}: {
  token: string;
  locations: AdminLocation[];
  editor: EditorState;
  setEditor: (e: EditorState | null) => void;
  onCreateLocation: (name: string) => Promise<AdminLocation>;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStop(i: number, id: string) {
    setEditor({ ...editor, stopIds: editor.stopIds.map((s, idx) => (idx === i ? id : s)) });
  }
  function addStop() {
    setEditor({ ...editor, stopIds: [...editor.stopIds, ""] });
  }
  function removeStop(i: number) {
    setEditor({ ...editor, stopIds: editor.stopIds.filter((_, idx) => idx !== i) });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= editor.stopIds.length) return;
    const next = [...editor.stopIds];
    [next[i], next[j]] = [next[j], next[i]];
    setEditor({ ...editor, stopIds: next });
  }

  async function save() {
    setError(null);
    const stopLocationIds = editor.stopIds.filter(Boolean);
    if (!editor.name.trim()) {
      setError("Give the route a name.");
      return;
    }
    if (stopLocationIds.length < 2) {
      setError("A route needs at least an origin and a destination stop.");
      return;
    }
    if (new Set(stopLocationIds).size !== stopLocationIds.length) {
      setError("The same stop appears more than once.");
      return;
    }
    setBusy(true);
    try {
      const body = { name: editor.name.trim(), stopLocationIds };
      if (editor.id) await updateAdminRoute(token, editor.id, body);
      else await createAdminRoute(token, body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the route.");
      setBusy(false);
    }
  }

  return (
    <div className="card-lg mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{editor.id ? "Edit route" : "New route"}</h2>
        <button
          type="button"
          onClick={() => setEditor(null)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Route name
        <input
          value={editor.name}
          onChange={(e) => setEditor({ ...editor, name: e.target.value })}
          placeholder="e.g. Colombo – Kandy via Kadugannawa"
          className="field text-sm"
        />
      </label>

      <p className="ui mt-5 mb-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Stops <span className="font-normal text-slate-400 dark:text-zinc-500">(origin first → destination last)</span>
      </p>
      <div className="flex flex-col gap-2">
        {editor.stopIds.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="ui w-6 shrink-0 text-center text-xs font-semibold text-slate-400 dark:text-zinc-500">
              {i + 1}
            </span>
            <StopPicker
              locations={locations}
              valueId={id}
              onSelect={(locId) => setStop(i, locId)}
              onCreate={onCreateLocation}
            />
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="Move up">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === editor.stopIds.length - 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="Move down">
                <ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => removeStop(i)} disabled={editor.stopIds.length <= 2} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30" aria-label="Remove stop">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStop}
        className="btn-secondary mt-3 py-2 text-sm"
      >
        <Plus size={15} /> Add stop
      </button>

      {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? "Saving…" : "Save route"}
        </button>
      </div>
    </div>
  );
}

function StopPicker({
  locations,
  valueId,
  onSelect,
  onCreate,
}: {
  locations: AdminLocation[];
  valueId: string;
  onSelect: (locationId: string) => void;
  onCreate: (name: string) => Promise<AdminLocation>;
}) {
  const selected = locations.find((l) => l.id === valueId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = q ? locations.filter((l) => l.name_en.toLowerCase().includes(q)) : locations;
  const exact = locations.some((l) => l.name_en.toLowerCase() === q);

  async function create() {
    setCreating(true);
    try {
      const loc = await onCreate(query.trim());
      onSelect(loc.id);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative flex-1">
      <input
        value={open ? query : selected?.name_en ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or add a stop…"
        className="field text-sm"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {matches.map((l) => (
            <button
              key={l.id}
              type="button"
              onMouseDown={() => {
                onSelect(l.id);
                setOpen(false);
              }}
              className="ui block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {l.name_en}
            </button>
          ))}
          {q && !exact && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={(e) => {
                e.preventDefault();
                void create();
              }}
              className="ui block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-60 dark:text-blue-400 dark:hover:bg-brand-soft-dark"
            >
              {creating ? "Adding…" : `+ Add “${query.trim()}” as a new stop`}
            </button>
          )}
          {matches.length === 0 && !q && (
            <p className="ui px-3 py-2 text-xs text-slate-400 dark:text-zinc-500">
              No stops yet — type a name to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteRouteButton({
  token,
  routeId,
  routeName,
  onDeleted,
}: {
  token: string;
  routeId: string;
  routeName: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    setBusy(true);
    try {
      await deleteAdminRoute(token, routeId);
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete route.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={13} /> Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>}
      <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Delete {routeName}?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirm
      </button>
    </div>
  );
}
