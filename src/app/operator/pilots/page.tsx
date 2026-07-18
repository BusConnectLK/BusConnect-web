import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listPilots, ApiError, type Pilot } from "@/lib/api";
import { InviteForm } from "./invite-form";
import { RemoveButton } from "./remove-button";

export default async function OperatorPilotsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/operator/pilots" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to manage your pilots
        </Link>
      </div>
    );
  }

  let pilots: Pilot[] = [];
  let error: string | null = null;
  try {
    pilots = await listPilots(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can manage pilots."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Pilots</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Conductors who can view your trips and scan boarding tickets.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {pilots.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
              No pilots yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pilots.map((p) => (
                <div key={p.userId} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{p.displayName ?? p.email ?? "Pilot"}</p>
                    {p.displayName && p.email && (
                      <p className="ui text-xs text-slate-500 dark:text-zinc-500">{p.email}</p>
                    )}
                  </div>
                  <RemoveButton pilotUserId={p.userId} />
                </div>
              ))}
            </div>
          )}
        </div>
        <InviteForm />
      </div>
    </div>
  );
}
