"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOperatorProfile, ApiError, type OperatorPayoutAccount } from "@/lib/api";

export function BankDetailsForm({ payoutAccount }: { payoutAccount: OperatorPayoutAccount | null }) {
  const router = useRouter();
  const [bankName, setBankName] = useState(payoutAccount?.bankName ?? "");
  const [branchName, setBranchName] = useState(payoutAccount?.branchName ?? "");
  const [accountNumber, setAccountNumber] = useState(payoutAccount?.accountNumber ?? "");
  const [bankCode, setBankCode] = useState(payoutAccount?.bankCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await updateOperatorProfile(session.access_token, {
        bankName: bankName || undefined,
        branchName: branchName || undefined,
        accountNumber: accountNumber || undefined,
        bankCode: bankCode || undefined,
      });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save bank details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <p className="font-heading text-lg font-bold tracking-tight">Bank details</p>
        <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
          Used by BusConnect to pay out your revenue. Only you (the owner) can see this.
        </p>
      </div>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Bank name
        <input
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g. Bank of Ceylon"
          minLength={2}
          className="field"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Branch name
        <input
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          placeholder="e.g. Nittambuwa"
          minLength={2}
          className="field"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Account number
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="e.g. 0123456789"
          minLength={4}
          inputMode="numeric"
          className="field"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Bank code <span className="text-slate-400 dark:text-zinc-500">(optional)</span>
        <input
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          placeholder="e.g. 7010"
          className="field"
        />
      </label>

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="ui text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <button type="submit" disabled={busy} className="btn-primary self-start py-3">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {busy ? "Saving…" : "Save bank details"}
      </button>
    </form>
  );
}
