import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, ApiError, type MyProfile } from "@/lib/api";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/profile" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to view your profile
        </Link>
      </div>
    );
  }

  let profile: MyProfile | null = null;
  let error: string | null = null;
  try {
    profile = await getMyProfile(session.access_token);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Profile</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Your personal details on file with BusConnect.
      </p>

      <div className="card-lg mt-6 p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
