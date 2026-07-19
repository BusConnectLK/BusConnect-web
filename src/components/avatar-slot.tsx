"use client";

import { Upload, User } from "lucide-react";

export function AvatarSlot({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Profile preview"
          className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
          <User size={20} />
        </div>
      )}
      <label className="ui inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg transition-colors hover:bg-brand/90">
        <Upload size={13} />
        {preview ? "Change photo" : "Choose photo"}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
    </div>
  );
}
