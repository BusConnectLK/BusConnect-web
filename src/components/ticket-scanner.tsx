"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Camera, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateTicket, ApiError } from "@/lib/api";

type Result =
  | { kind: "accepted"; ticketId: string }
  | { kind: "already_used" }
  | { kind: "void" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

// Native browser API (Chrome/Edge/Android) — no extra dependency. Absent on
// Safari/iOS, where the manual-paste fallback below still works fully.
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function TicketScanner() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setCameraSupported(typeof window !== "undefined" && !!window.BarcodeDetector);
  }, []);

  async function submit(scannedToken: string) {
    setBusy(true);
    setResult(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      const res = await validateTicket(session.access_token, scannedToken);
      if (res.ok) setResult({ kind: "accepted", ticketId: res.ticketId });
      else setResult({ kind: res.reason });
    } catch (e) {
      setResult({
        kind: "error",
        message: e instanceof ApiError ? e.message : "Could not reach BusConnect-api.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanLoop();
    } catch {
      setResult({ kind: "error", message: "Could not access the camera." });
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function scanLoop() {
    if (!window.BarcodeDetector || !videoRef.current) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopCamera();
          setToken(codes[0].rawValue);
          void submit(codes[0].rawValue);
          return;
        }
      } catch {
        /* keep trying */
      }
      if (streamRef.current) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  useEffect(() => stopCamera, []);

  return (
    <div>
      {cameraSupported && (
        <div className="card mb-4 overflow-hidden p-0">
          {cameraOn ? (
            <video ref={videoRef} className="aspect-video w-full bg-black object-cover" muted playsInline />
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="ui flex w-full items-center justify-center gap-2 p-8 text-sm font-medium text-slate-600 dark:text-zinc-400"
            >
              <Camera size={18} /> Scan with camera
            </button>
          )}
          {cameraOn && (
            <button
              type="button"
              onClick={stopCamera}
              className="ui w-full border-t border-slate-200 p-2.5 text-sm font-medium text-slate-500 dark:border-zinc-800 dark:text-zinc-400"
            >
              Stop camera
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim()) void submit(token.trim());
        }}
        className="card flex flex-col gap-3 p-5"
      >
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Ticket token (paste or scan)
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
            placeholder="Paste the scanned QR token here"
            required
            className="field font-mono text-xs"
          />
        </label>
        <button type="submit" disabled={busy || !token.trim()} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          {busy ? "Checking…" : "Validate"}
        </button>
      </form>

      {result && (
        <div
          className={`card mt-4 flex items-center gap-3 p-5 ${
            result.kind === "accepted"
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40"
              : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40"
          }`}
        >
          {result.kind === "accepted" ? (
            <CheckCircle2 size={22} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle size={22} className="shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div>
            <p className="font-heading font-semibold">
              {result.kind === "accepted" && "Boarding confirmed"}
              {result.kind === "already_used" && "Already boarded"}
              {result.kind === "void" && "Ticket voided (cancelled booking)"}
              {result.kind === "not_found" && "Ticket not found"}
              {result.kind === "error" && "Could not validate"}
            </p>
            {result.kind === "accepted" && (
              <p className="ui text-xs text-emerald-700 dark:text-emerald-400/90">
                Ref {result.ticketId.slice(0, 8).toUpperCase()}
              </p>
            )}
            {result.kind === "error" && (
              <p className="ui text-xs text-red-700 dark:text-red-400/90">{result.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
