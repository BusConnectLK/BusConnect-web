"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPassengerPhoto } from "@/lib/storage";
import { updateMyProfile, ApiError, type MyProfile } from "@/lib/api";
import { AvatarSlot } from "@/components/avatar-slot";
import { PhoneField } from "@/components/phone-field";
import { stripCountryCode, toE164 } from "@/lib/phone";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(stripCountryCode(profile.phone));
  const [email, setEmail] = useState(profile.email ?? "");
  const [nic, setNic] = useState(profile.nic ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Signed in via Google -> Google owns the email; signed in via phone OTP ->
  // that phone number is the login credential itself. Either way, the field
  // that identifies the account isn't safe to edit here.
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setProvider(session?.user.app_metadata?.provider ?? null);
      });
  }, []);

  const emailLocked = provider === "google";
  const phoneLocked = provider === "phone";

  function onPhotoChange(file: File | null) {
    setPhoto(file);
    if (file) setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      let avatarUrl: string | undefined;
      if (photo) {
        setStatus("Uploading photo…");
        avatarUrl = await uploadPassengerPhoto(session.user.id, photo);
      }

      setStatus("Saving…");
      await updateMyProfile(session.access_token, {
        name: name || undefined,
        phone: phoneLocked ? undefined : phone ? toE164(phone) : undefined,
        email: emailLocked ? undefined : email || undefined,
        nic: nic || undefined,
        avatarUrl,
      });
      setSaved(true);
      window.dispatchEvent(new Event("passenger-profile-updated"));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Profile photo
        <AvatarSlot preview={photoPreview} onChange={onPhotoChange} />
      </div>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Full name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="field"
        />
      </label>

      {!phoneLocked && (
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Phone number
          <PhoneField value={phone} onChange={setPhone} />
        </label>
      )}

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        NIC
        <input
          value={nic}
          onChange={(e) => setNic(e.target.value)}
          placeholder="200012345678 or 991234567V"
          className="field"
        />
      </label>

      {!emailLocked && (
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Email address
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.lk"
            className="field"
          />
        </label>
      )}

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="ui text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <button type="submit" disabled={busy} className="btn-primary self-start">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {busy ? status ?? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
