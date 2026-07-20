"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

export function DateFilter({ from, to, date }: { from: string; to: string; date: string }) {
  const router = useRouter();

  function onChange(next: string) {
    if (!next) return;
    router.push(`/search?from=${from}&to=${to}&date=${next}`);
  }

  return (
    <label className="ui flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Calendar size={15} className="shrink-0 text-slate-400" />
      <input
        type="date"
        value={date}
        min={todayIso()}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-slate-700 outline-none dark:text-zinc-200"
      />
    </label>
  );
}
