"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invitePilot, ApiError } from "@/lib/api";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await invitePilot(session.access_token, email, displayName || undefined);
      setEmail("");
      setDisplayName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not invite this pilot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
      <h3 className="font-heading font-semibold">Invite a pilot</h3>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="conductor@email.com"
        required
        className="field"
      />
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name (optional)"
        className="field"
      />
      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-1">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        {busy ? "Inviting…" : "Invite"}
      </button>
    </form>
  );
}
