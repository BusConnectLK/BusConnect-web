"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, User } from "lucide-react";
import type { AdminPilot } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

export interface PilotWithPhoto extends AdminPilot {
  photoUrl: string | null;
}

export function PilotList({ pilots }: { pilots: PilotWithPhoto[] }) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    // Pending pilots surface to the top (need review); everything else keeps
    // the backend's created_at-desc order. Array.prototype.sort is stable,
    // so within each group the original order is preserved.
    return [...pilots].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  }, [pilots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => p.name.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <div>
      <div className="relative mt-6">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pilots by name…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
            {pilots.length === 0 ? "No pilots registered yet." : `No pilots match "${query}".`}
          </div>
        ) : (
          filtered.map((p) => <PilotRow key={p.id} pilot={p} />)
        )}
      </div>
    </div>
  );
}

function PilotRow({ pilot }: { pilot: PilotWithPhoto }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-4">
      <Link href={`/admin/pilots/${pilot.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {pilot.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pilot.photoUrl}
            alt={`${pilot.name} photo`}
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
            <User size={16} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{pilot.name}</p>
          <p className="ui mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[pilot.status]}`}>
              {STATUS_LABEL[pilot.status] ?? pilot.status}
            </span>
            <span>{pilot.operator?.name ?? "—"}</span>
            <span>{pilot.phone_no}</span>
            {pilot.bus && (
              <span className="capitalize">
                {pilot.assigned_role} · {pilot.bus.reg_no}
              </span>
            )}
            {pilot.user_id && <span className="text-emerald-600 dark:text-emerald-400">Account linked</span>}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <StatusActions pilotId={pilot.id} status={pilot.status} />
        <Link
          href={`/admin/pilots/${pilot.id}`}
          className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
