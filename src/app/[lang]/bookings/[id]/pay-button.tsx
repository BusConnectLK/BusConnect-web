"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkoutBooking, devConfirmPayment, ApiError } from "@/lib/api";

/** Only ever true when the page is actually loaded from localhost — this
 *  button hits a backend route that self-refuses in production regardless,
 *  but hiding it outside local dev keeps it from ever being visible on a
 *  deployed preview/staging build too. */
function isLocalDev(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "localhost";
}

export function PayButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function devPay() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Your session expired. Please sign in again.");
        setBusy(false);
        return;
      }
      await devConfirmPayment(session.access_token, bookingId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Dev confirm failed.");
      setBusy(false);
    }
  }

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Your session expired. Please sign in again.");
        setBusy(false);
        return;
      }

      const checkout = await checkoutBooking(session.access_token, bookingId);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = checkout.action;
      for (const [name, value] of Object.entries(checkout.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start payment. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full">
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Redirecting to WebXPay…
          </>
        ) : (
          <>
            <CreditCard size={18} /> Pay securely with WebXPay
          </>
        )}
      </button>
      {isLocalDev() && (
        <button
          type="button"
          onClick={devPay}
          disabled={busy}
          className="ui mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <FlaskConical size={15} /> Dev: mark as paid (skip WebXPay)
        </button>
      )}
      {error && <p className="ui mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
