"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkoutBooking, ApiError } from "@/lib/api";

export function PayButton({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full py-4">
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Redirecting to PayHere…
          </>
        ) : (
          <>
            <CreditCard size={18} /> Pay with PayHere
          </>
        )}
      </button>
      {error && <p className="ui mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
