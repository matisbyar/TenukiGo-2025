"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spinner } from "./ui";

/** Live HLS video (MediaMTX output) with the mockup's control bar: pause, sound, full screen. */
export default function HlsPlayer({
  url,
  label,
  square,
  overlay,
  onLatency,
}: {
  url: string;
  label: string;
  /** Crops the video to a square (table control screen). */
  square?: boolean;
  /** Drawn on top of the picture (calibration handles). */
  overlay?: ReactNode;
  onLatency?: (seconds: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "unavailable">("loading");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = video.current;
    if (!v || !url) return;
    setStatus("loading");

    if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 4, enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        v.play().catch(() => setPaused(true));
      });
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (hls.latency) onLatency?.(hls.latency);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStatus("unavailable");
      });
      return () => hls.destroy();
    }
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari plays HLS natively.
      v.src = url;
      const loaded = () => {
        setStatus("playing");
        v.play().catch(() => setPaused(true));
      };
      const failed = () => setStatus("unavailable");
      v.addEventListener("loadedmetadata", loaded);
      v.addEventListener("error", failed);
      return () => {
        v.removeEventListener("loadedmetadata", loaded);
        v.removeEventListener("error", failed);
      };
    }
    setStatus("unavailable");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else container.current?.requestFullscreen?.();
  };

  return (
    <div ref={container} className="overflow-hidden rounded-[28px] bg-ink">
      <div className={`relative bg-night ${square ? "aspect-square" : "aspect-[4/3]"}`}>
        <video
          ref={video}
          muted={muted}
          playsInline
          aria-label={label}
          className={`absolute inset-0 size-full ${square ? "object-cover" : "object-contain"} ${status === "unavailable" ? "hidden" : ""}`}
          onPause={() => setPaused(true)}
          onPlay={() => setPaused(false)}
        />
        {status === "loading" && (
          <p role="status" className="absolute inset-0 flex items-center justify-center gap-3 text-[#C9CDD4]">
            <Spinner /> Connexion à la caméra…
          </p>
        )}
        {status === "unavailable" && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-[#C9CDD4]">
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <rect x={2} y={6} width={14} height={12} rx={3} />
              <path d="M16 10l6-3v10l-6-3M3 3l18 18" />
            </svg>
            <strong className="text-white">Vidéo indisponible</strong>
            <span className="text-[15px]">La caméra de cette table n&apos;émet pas pour le moment.</span>
          </div>
        )}
        {overlay}
      </div>
      <div className="flex items-center gap-2 bg-[#24272E] px-2.5 py-2 text-white">
        <button type="button" aria-label={paused ? "Reprendre la lecture" : "Mettre en pause"} onClick={togglePlay} disabled={status !== "playing"} className="flex size-11 items-center justify-center rounded-full bg-[#3A3E47]">
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
            {paused ? <path d="M5 3l10 6-10 6z" fill="#FFFFFF" /> : <path d="M5 3v12M13 3v12" stroke="#FFFFFF" strokeWidth={3} />}
          </svg>
        </button>
        <button type="button" aria-label={muted ? "Activer le son" : "Couper le son"} aria-pressed={!muted} onClick={() => setMuted((m) => !m)} disabled={status !== "playing"} className="flex size-11 items-center justify-center rounded-full bg-[#3A3E47]">
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 7h3l4-3v10l-4-3H2z" fill="#FFFFFF" />
            {muted ? <path d="M12 6l5 6M17 6l-5 6" stroke="#FFFFFF" strokeWidth={1.8} /> : <path d="M12 6c1.5 1.5 1.5 4.5 0 6" fill="none" stroke="#FFFFFF" strokeWidth={1.8} />}
          </svg>
        </button>
        <span className="ml-1.5 text-[15px]">
          {status === "playing" ? (
            <>
              <span aria-hidden="true" className="text-[#FF6B5E]">
                ●{" "}
              </span>
              Direct
            </>
          ) : status === "loading" ? (
            "Connexion…"
          ) : (
            "Hors ligne"
          )}
        </span>
        <button type="button" aria-label="Plein écran" onClick={toggleFullscreen} className="ml-auto flex size-11 items-center justify-center rounded-full bg-[#3A3E47]">
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4" fill="none" stroke="#FFFFFF" strokeWidth={2} />
          </svg>
        </button>
      </div>
    </div>
  );
}
