"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPassengerPhoto } from "@/lib/storage";
import { updateMyProfile, ApiError, type MyProfile } from "@/lib/api";
import { AvatarSlot } from "@/components/avatar-slot";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
        phone: phone || undefined,
        email: email || undefined,
        avatarUrl,
      });
      setSaved(true);
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

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Phone number
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+94 7X XXX XXXX"
          className="field"
        />
      </label>

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

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="ui text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <button type="submit" disabled={busy} className="btn-primary self-start py-3">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {busy ? status ?? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
