import { AdminNav } from "./admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
      <aside className="w-full shrink-0 lg:w-52">
        <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          BusConnect
        </p>
        <p className="font-heading mb-4 text-base font-bold tracking-tight">Admin</p>
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
