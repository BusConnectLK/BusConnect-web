"use client";

import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOperatorPayoutSlipUrl, ApiError } from "@/lib/api";

export function ViewSlipButton({ tripId }: { tripId: string }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function view() {
    setError(null);
    setBusy("view");
    // Open the tab synchronously, before any `await` — once we cross an
    // await, the browser no longer treats window.open as tied to this click
    // and silently blocks it as a popup (no error, it just does nothing).
    const tab = window.open("", "_blank");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        tab?.close();
        return;
      }
      const { url } = await getOperatorPayoutSlipUrl(session.access_token, tripId);
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      setError(e instanceof ApiError ? e.message : "Could not open the slip.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setError(null);
    setBusy("download");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { url } = await getOperatorPayoutSlipUrl(session.access_token, tripId);
      // Fetch as a blob rather than just pointing an <a download> at the
      // signed URL — a cross-origin href's `download` attribute is ignored
      // by most browsers, so this is what actually guarantees a save
      // instead of a plain navigation.
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `payout-slip-${tripId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not download the slip.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={view}
        disabled={!!busy}
        className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy === "view" ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} View
      </button>
      <button
        type="button"
        onClick={download}
        disabled={!!busy}
        className="ui ml-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy === "download" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
      </button>
      {error && <span className="ui ml-2 text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </>
  );
}
