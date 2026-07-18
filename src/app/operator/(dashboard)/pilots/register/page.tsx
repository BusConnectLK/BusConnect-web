import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegisterPilotForm } from "./register-pilot-form";

export default function RegisterPilotPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/operator/pilots"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to pilots
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Register a pilot</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Submit a driver or conductor for approval. They stay pending until BusConnect reviews and
        approves them, after which you can assign them to a bus.
      </p>

      <div className="mt-6">
        <RegisterPilotForm />
      </div>
    </div>
  );
}
