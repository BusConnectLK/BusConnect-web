"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyRoles, getMyProfile, type MyRoles } from "@/lib/api";

export interface Identity {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

/** Shared by the desktop user menu and the mobile nav drawer so both stay in
 * sync (and only fetch once each) after a sign-in, sign-out, or profile edit. */
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined); // undefined = loading
  const [roles, setRoles] = useState<MyRoles | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIdentity(null);
        setRoles(null);
        return;
      }
      // Google (and most OAuth) sign-ins populate these on user_metadata;
      // phone/email OTP sign-ins won't have them, so the UI falls back to
      // an initial-letter avatar for those. The passenger's own edited
      // /me/profile (name + photo) takes priority over both when set.
      const meta = session.user.user_metadata ?? {};
      let profileName: string | undefined;
      let profileAvatar: string | undefined;
      try {
        const profile = await getMyProfile(session.access_token);
        profileName = profile.name ?? undefined;
        profileAvatar = profile.avatar_url ?? undefined;
      } catch {
        // fall through to auth metadata below
      }
      setIdentity({
        email: session.user.email ?? "",
        fullName: profileName ?? (meta.full_name as string) ?? (meta.name as string) ?? undefined,
        avatarUrl: profileAvatar ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? undefined,
      });
      try {
        setRoles(await getMyRoles(session.access_token));
      } catch {
        setRoles(null);
      }
    }
    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void load());
    window.addEventListener("passenger-profile-updated", load);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("passenger-profile-updated", load);
    };
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
  }

  return { identity, roles, signOut };
}
