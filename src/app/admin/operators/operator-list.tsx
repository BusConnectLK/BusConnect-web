"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { AdminOperator } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "On hold",
};

export function OperatorList({ operators }: { operators: AdminOperator[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter((op) => op.name.toLowerCase().includes(q));
  }, [operators, query]);

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
          placeholder="Search operators by name…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
            {operators.length === 0 ? "No operators yet." : `No operators match "${query}".`}
          </div>
        ) : (
          filtered.map((op) => (
            <div key={op.id} className="card flex items-center justify-between gap-4 p-4">
              <Link href={`/admin/operators/${op.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {op.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={op.logo_url}
                    alt={`${op.name} logo`}
                    className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{op.name}</p>
                  <p className="ui mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[op.status]}`}>
                      {STATUS_LABEL[op.status] ?? op.status}
                    </span>
                    ★ {Number(op.rating).toFixed(1)} · {Number(op.reliability_score).toFixed(0)}% reliability
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <StatusActions operatorId={op.id} status={op.status} />
                <Link
                  href={`/admin/operators/${op.id}`}
                  className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  View details <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
