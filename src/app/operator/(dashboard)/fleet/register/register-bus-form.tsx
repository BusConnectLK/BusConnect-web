"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImagePlus, Plus, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadBusImage } from "@/lib/storage";
import { registerBus, ApiError } from "@/lib/api";

const BUS_CLASSES = [
  { value: "normal", label: "Normal" },
  { value: "semi_luxury", label: "Semi Luxury" },
  { value: "luxury", label: "Luxury" },
  { value: "super_luxury", label: "Super Luxury" },
  { value: "expressway", label: "Expressway" },
] as const;

const SEAT_LAYOUTS = [
  { value: "2x2", label: "2 × 2" },
  { value: "3x2", label: "3 × 2" },
  { value: "2x1", label: "2 × 1" },
] as const;

const PREDEFINED_AMENITIES = [
  "Air Conditioning (AC)",
  "Wi-Fi",
  "USB Charging",
  "Power Outlets",
  "Reclining Seats",
  "TV / Entertainment",
  "CCTV",
  "GPS Tracking",
  "Reading Lights",
  "Blankets (Sleeper)",
  "Washroom",
  "Wheelchair Accessible",
  "Luggage Storage",
  "Refreshments",
  "Emergency Exit",
  "Fire Extinguisher",
];

function ImageSlot({
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

export function RegisterBusForm() {
  const router = useRouter();

  const [regNo, setRegNo] = useState("");
  const [busClass, setBusClass] = useState<(typeof BUS_CLASSES)[number]["value"]>("normal");
  const [totalSeats, setTotalSeats] = useState("45");
  const [seatLayoutStyle, setSeatLayoutStyle] = useState<(typeof SEAT_LAYOUTS)[number]["value"]>("2x2");
  const [seatNumbering, setSeatNumbering] = useState<"auto" | "custom">("auto");

  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [customAmenityInput, setCustomAmenityInput] = useState("");
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sideImage1, setSideImage1] = useState<File | null>(null);
  const [sidePreview1, setSidePreview1] = useState<string | null>(null);
  const [sideImage2, setSideImage2] = useState<File | null>(null);
  const [sidePreview2, setSidePreview2] = useState<string | null>(null);
  const [interiorImage, setInteriorImage] = useState<File | null>(null);
  const [interiorPreview, setInteriorPreview] = useState<string | null>(null);
  const [seatLayoutImage, setSeatLayoutImage] = useState<File | null>(null);
  const [seatLayoutPreview, setSeatLayoutPreview] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleAmenity(name: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addCustomAmenity() {
    const name = customAmenityInput.trim();
    if (!name) return;
    setCustomAmenities((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setAmenities((prev) => new Set(prev).add(name));
    setCustomAmenityInput("");
  }

  function removeCustomAmenity(name: string) {
    setCustomAmenities((prev) => prev.filter((a) => a !== name));
    setAmenities((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  function pick(setFile: (f: File | null) => void, setPreview: (p: string | null) => void) {
    return (file: File | null) => {
      setFile(file);
      setPreview(file ? URL.createObjectURL(file) : null);
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const seats = Number(totalSeats);
    if (!Number.isInteger(seats) || seats < 1) {
      setError("Enter a valid total seat capacity.");
      return;
    }

    if (!frontImage && !sideImage1 && !sideImage2 && !interiorImage && !seatLayoutImage) {
      setError("Please upload at least one photo of the bus.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/fleet/register");
        return;
      }

      setStatus("Uploading photos…");
      const frontImageUrl = frontImage
        ? await uploadBusImage(session.user.id, frontImage, "front")
        : undefined;
      const side1Url = sideImage1 ? await uploadBusImage(session.user.id, sideImage1, "side-1") : undefined;
      const side2Url = sideImage2 ? await uploadBusImage(session.user.id, sideImage2, "side-2") : undefined;
      const interiorImageUrl = interiorImage
        ? await uploadBusImage(session.user.id, interiorImage, "interior")
        : undefined;
      const seatLayoutImageUrl = seatLayoutImage
        ? await uploadBusImage(session.user.id, seatLayoutImage, "seat-layout")
        : undefined;
      const sideImageUrls = [side1Url, side2Url].filter((u): u is string => !!u);

      setStatus("Submitting registration…");
      await registerBus(session.access_token, {
        regNo,
        busClass,
        totalSeats: seats,
        seatLayoutStyle,
        seatNumbering,
        amenities: [...amenities],
        frontImageUrl,
        sideImageUrls: sideImageUrls.length > 0 ? sideImageUrls : undefined,
        interiorImageUrl,
        seatLayoutImageUrl,
        notes: notes || undefined,
      });

      router.push("/operator/fleet");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the registration. Try again.");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {/* ── 1. Basic information ─────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Basic information
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Vehicle registration number
            <input
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. NC-1234"
              required
              minLength={2}
              className="field text-sm"
            />
          </label>
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Bus type
            <div className="relative">
              <select
                value={busClass}
                onChange={(e) => setBusClass(e.target.value as typeof busClass)}
                className="field appearance-none pr-9 text-sm"
              >
                {BUS_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
              />
            </div>
          </label>
        </div>
      </section>

      {/* ── 2. Seating information ───────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Seating information
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Total seat capacity
            <input
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              type="number"
              min={1}
              required
              className="field text-sm"
            />
          </label>
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Seat layout
            <div className="relative">
              <select
                value={seatLayoutStyle}
                onChange={(e) => setSeatLayoutStyle(e.target.value as typeof seatLayoutStyle)}
                className="field appearance-none pr-9 text-sm"
              >
                {SEAT_LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
              />
            </div>
          </label>
        </div>

        <div className="mt-4">
          <p className="ui mb-2 text-sm font-medium text-slate-700 dark:text-zinc-300">Seat numbering</p>
          <div className="flex gap-2">
            {(["auto", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSeatNumbering(mode)}
                className={`ui rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  seatNumbering === mode
                    ? "bg-brand text-brand-fg"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {mode === "auto" ? "Auto-generated" : "Custom"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Amenities ──────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Bus features / amenities
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PREDEFINED_AMENITIES.map((name) => (
            <label
              key={name}
              className="ui flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <input
                type="checkbox"
                checked={amenities.has(name)}
                onChange={() => toggleAmenity(name)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-zinc-700"
              />
              {name}
            </label>
          ))}
        </div>

        {customAmenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {customAmenities.map((name) => (
              <span
                key={name}
                className="ui inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand dark:bg-brand-soft-dark dark:text-blue-300"
              >
                {name}
                <button type="button" onClick={() => removeCustomAmenity(name)} aria-label={`Remove ${name}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={customAmenityInput}
            onChange={(e) => setCustomAmenityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomAmenity();
              }
            }}
            placeholder="Add another amenity not listed above"
            className="field text-sm"
          />
          <button
            type="button"
            onClick={addCustomAmenity}
            className="btn-secondary shrink-0 whitespace-nowrap px-3 py-3"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </section>

      {/* ── 4. Bus images ─────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Bus images
        </h2>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          All optional individually — at least one photo is required.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageSlot
            label="Front view"
            preview={frontPreview}
            onChange={pick(setFrontImage, setFrontPreview)}
          />
          <ImageSlot
            label="Interior"
            preview={interiorPreview}
            onChange={pick(setInteriorImage, setInteriorPreview)}
          />
          <ImageSlot
            label="Side view (1 of 2)"
            preview={sidePreview1}
            onChange={pick(setSideImage1, setSidePreview1)}
          />
          <ImageSlot
            label="Side view (2 of 2)"
            preview={sidePreview2}
            onChange={pick(setSideImage2, setSidePreview2)}
          />
          <ImageSlot
            label="Seat layout image"
            preview={seatLayoutPreview}
            onChange={pick(setSeatLayoutImage, setSeatLayoutPreview)}
          />
        </div>
      </section>

      {/* ── 5. Notes ──────────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else BusConnect should know about this bus (optional)"
          rows={3}
          className="field mt-3 resize-none text-sm"
        />
      </section>

      {error && (
        <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button type="submit" disabled={busy} className="btn-primary self-start py-3.5">
        {busy ? status ?? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}
