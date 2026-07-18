"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPilotPhoto } from "@/lib/storage";
import { registerPilot, ApiError } from "@/lib/api";

export function RegisterPilotForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\S+(\s+\S+)+$/.test(name.trim())) {
      setError("Enter the pilot's full name (first and last name).");
      return;
    }
    if (!photo) {
      setError("Please upload a profile photo.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/pilots/register");
        return;
      }

      setStatus("Uploading photo…");
      const profileImagePath = await uploadPilotPhoto(session.user.id, photo);

      setStatus("Submitting registration…");
      await registerPilot(session.access_token, {
        name: name.trim(),
        idNumber,
        phoneNo,
        profileImagePath,
      });

      router.push("/operator/pilots");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the registration. Try again.");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={submit} className="card-lg flex flex-col gap-5 p-6">
      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Pilot name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kasun Perera"
          required
          className="field text-sm"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        ID number
        <input
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="NIC / ID number"
          required
          minLength={3}
          className="field text-sm"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Phone number
        <input
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
          placeholder="e.g. +94 77 123 4567"
          required
          minLength={9}
          className="field text-sm"
        />
      </label>

      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Profile photo
        <div className="flex items-center gap-3">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Profile preview"
              className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
              <ImagePlus size={18} />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="ui cursor-pointer text-xs text-slate-500 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-brand-fg dark:text-zinc-400"
          />
        </div>
        <span className="text-xs text-slate-400 dark:text-zinc-500">
          Kept private — only visible to you and BusConnect admins.
        </span>
      </label>

      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary self-start py-3">
        {busy ? status ?? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}
