"use client";

import { ImagePlus, Upload, X } from "lucide-react";

export function ImageSlot({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
      {label}
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-20 shrink-0">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={`${label} preview`}
                className="h-14 w-20 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label={`Remove ${label} photo`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
              <ImagePlus size={16} />
            </div>
          )}
        </div>
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
    </div>
  );
}
