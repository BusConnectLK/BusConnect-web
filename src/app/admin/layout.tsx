import { AdminNav } from "./admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="pill">BusConnect Admin</span>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
