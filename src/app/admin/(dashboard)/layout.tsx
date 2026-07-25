import { createClient } from "@/lib/supabase/server";
import { getMyRoles } from "@/lib/api";
import { AdminNav } from "./admin-nav";

// Mirrors operator/(dashboard)/layout.tsx: this is the ONLY thing that
// actually gates the sidebar chrome — proxy.ts's route guard just checks
// "is there a session", not "is this session an admin". Without this check
// any signed-in passenger visiting /admin would see the admin sidebar
// (with no working links, since the underlying API calls would 403, but
// the chrome itself shouldn't render at all).
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let isAdmin = false;
  if (session) {
    try {
      const roles = await getMyRoles(session.access_token);
      isAdmin = roles.isAdmin;
    } catch (e) {
      void e;
    }
  }

  if (!isAdmin) {
    return <div className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</div>;
  }

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
