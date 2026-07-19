import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBus, ApiError, type OperatorBusDetail } from "@/lib/api";
import { BusIdentityCard } from "./bus-identity-card";

export default async function OperatorBusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/operator/fleet/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this bus
      </Link>
    );
  }

  let bus: OperatorBusDetail | null = null;
  let error: string | null = null;
  try {
    bus = await getBus(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (!bus) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/operator/fleet"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to fleet
      </Link>

      <div className="mt-4">
        <BusIdentityCard bus={bus} />
      </div>
    </div>
  );
}
