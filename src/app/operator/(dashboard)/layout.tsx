import { createClient } from "@/lib/supabase/server";
import { getMyRoles } from "@/lib/api";
import { OperatorNav } from "./operator-nav";

export default async function OperatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let role: "owner" | "pilot" | null = null;
  if (session) {
    try {
      const roles = await getMyRoles(session.access_token);
      role = roles.operatorRole;
    } catch (e) {
      // Not linked to an operator, or the API is unreachable — the page
      // itself renders the right messaging; just skip the sidebar chrome.
      void e;
    }
  }

  if (!role) {
    return <div className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</div>;
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
      <aside className="w-full shrink-0 lg:w-52">
        <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Operator
        </p>
        <p className="font-heading mb-4 text-base font-bold tracking-tight">Workspace</p>
        <OperatorNav role={role} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
