"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { recording, useRecording } from "@/lib/recording";

/** Full-screen capture screen (phone): photographs the board and adds the photo to the wizard. */
export default function CameraPage() {
  const state = useRecording();
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const count = state.photos.length;
  const lastPhoto = state.photos[count - 1];

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnavailable(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => setUnavailable(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const now = Date.now();
        recording.addPhotos([new File([blob], `photo-${now}.jpg`, { type: "image/jpeg", lastModified: now })]);
        setAnnouncement(`Photo ${count + 1} enregistrée.`);
      },
      "image/jpeg",
      0.92,
    );
  };

  const done = () => recording.update({ step: state.title ? 1 : 0 });

  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col bg-[#0E0F12] text-white">
      <header className="flex items-center justify-between gap-3 p-4">
        <Link href="/record" onClick={done} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-3 font-bold !text-white no-underline">
          Quitter
        </Link>
        <h1 className="heading truncate text-[18px]">{state.title || "Nouvelle partie"}</h1>
        <span className="font-bold">
          {count} photo{count > 1 ? "s" : ""}
        </span>
      </header>

      <main id="contenu" className="flex flex-auto flex-col gap-3.5 px-4">
        <div className="relative flex min-h-[320px] flex-auto items-center justify-center overflow-hidden rounded-[20px] bg-night">
          {unavailable ? (
            <p className="max-w-[280px] p-4 text-center text-[#C9CDD4]">L&apos;appareil photo n&apos;est pas accessible ici. Utilisez le bouton ci-dessous pour prendre ou choisir une photo.</p>
          ) : (
            <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" aria-label="Aperçu de l'appareil photo" />
          )}
          {!unavailable && <div aria-hidden="true" className="absolute inset-[9%] rounded-md border-[3px] border-dashed border-amber" />}
          <span className="absolute left-3 top-3 rounded-full bg-[rgba(14,15,18,0.8)] px-2.5 py-1 text-sm font-bold">Photo {count + 1} · 4 à 5 photos suffisent</span>
        </div>
        <p className="flex items-center gap-2.5 rounded-2xl border-2 border-[#4CAF6E] bg-[#1C2A20] px-3.5 py-3 font-bold">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#7FD49B" strokeWidth={2.2} aria-hidden="true" className="flex-none">
            <rect x={4} y={4} width={16} height={16} rx={2} />
          </svg>
          Cadrez tout le plateau, les 4 coins visibles
        </p>
        <p className="text-base text-[#C9CDD4]">Prenez une photo quand vous voulez retenir une position : un moment où vous avez réfléchi, un choix important.</p>
        <p className="sr-only" role="status">
          {announcement}
        </p>
      </main>

      <div className="flex items-center justify-between gap-3 px-6 pb-[30px] pt-[18px]">
        <span className="inline-flex min-h-14 min-w-[72px] flex-col items-center justify-center text-sm">
          {lastPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lastPhoto.url} alt="" className="h-[34px] w-11 rounded-md object-cover" />
          ) : (
            <span aria-hidden="true" className="block h-[34px] w-11 rounded-md bg-[#3A3E47]" />
          )}
          {lastPhoto ? `Photo ${count}` : "Aucune"}
        </span>
        {unavailable ? (
          <label className="btn btn-amber cursor-pointer">
            Prendre une photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                recording.addPhotos(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <button type="button" onClick={capture} disabled={!ready} className="size-20 rounded-full border-[5px] border-white bg-amber">
            <span className="sr-only">Prendre la photo {count + 1}</span>
          </button>
        )}
        <Link href="/record" onClick={done} className="inline-flex min-h-14 items-center rounded-2xl bg-white px-3.5 font-extrabold !text-ink no-underline">
          Terminer
        </Link>
      </div>
    </div>
  );
}
