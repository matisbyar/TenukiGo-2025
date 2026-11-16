"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import HlsPlayer from "@/components/HlsPlayer";
import { DevBanner, Loaded, Notice, PageTitle } from "@/components/ui";
import { api, useLoad, type StreamDetail } from "@/lib/api";
import { tableNumber } from "@/lib/tournament";

interface Corner {
  x: number;
  y: number;
}

const NAMES = ["haut gauche", "haut droit", "bas droit", "bas gauche"];
const DEFAULT: Corner[] = [
  { x: 30, y: 24 },
  { x: 70, y: 24 },
  { x: 73, y: 78 },
  { x: 27, y: 78 },
];
const storageKey = (id: number) => `tenukigo.calibration.${id}`;

export default function CalibrationPage() {
  const { streamid } = useParams<{ streamid: string }>();
  const state = useLoad(() => api.stream(streamid), [streamid]);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-4">
        <Loaded state={state}>{(stream) => <Calibration stream={stream} />}</Loaded>
      </main>
    </>
  );
}

/**
 * Corner calibration. The backend has no calibration endpoint yet (the analysis module detects the
 * board by itself), so this screen is the mockup's interface only: corners are kept in this browser.
 */
function Calibration({ stream }: { stream: StreamDetail }) {
  const number = tableNumber(stream);
  const [corners, setCorners] = useState<Corner[]>(DEFAULT);
  const [active, setActive] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const handles = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(stream.stream_id));
      if (raw) setCorners(JSON.parse(raw) as Corner[]);
    } catch {
      // Nothing saved for this table.
    }
  }, [stream.stream_id]);

  const move = (i: number, x: number, y: number) => {
    const clamp = (n: number) => Math.max(2, Math.min(98, n));
    setCorners((list) => list.map((c, n) => (n === i ? { x: clamp(x), y: clamp(y) } : c)));
    setSaved(false);
  };

  const drag = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !area.current) return;
    const r = area.current.getBoundingClientRect();
    move(i, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const nudge = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    move(i, corners[i].x + step[0], corners[i].y + step[1]);
  };

  const validate = () => {
    try {
      window.localStorage.setItem(storageKey(stream.stream_id), JSON.stringify(corners));
    } catch {
      // Private browsing: nothing is kept.
    }
    setSaved(true);
  };

  const overlay = (
    <div ref={area} className="absolute inset-0">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
        <polygon
          points={corners.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="rgba(232,163,23,0.12)"
          stroke="#E8A317"
          strokeWidth={3}
          strokeDasharray="8 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {corners.map((c, i) => (
        <button
          key={i}
          ref={(el) => {
            handles.current[i] = el;
          }}
          type="button"
          aria-label={`Coin ${i + 1}, ${NAMES[i]}. Flèches pour ajuster.`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setActive(i);
          }}
          onPointerMove={drag(i)}
          onKeyDown={nudge(i)}
          onFocus={() => setActive(i)}
          className={`absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-ink bg-amber text-sm font-extrabold text-ink ${
            active === i ? "ring-4 ring-white" : ""
          }`}
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <PageTitle
        size={36}
        back={{ href: `/tournaments/tables/${stream.stream_id}`, label: `Table ${number} · contrôle` }}
        title={`Calibrer la caméra de la table ${number}`}
        lead="Vérifiez que les quatre coins du goban sont bien repérés. TenukiGo redresse ensuite l'image du grand-angle."
      />

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="k-image" className="panel min-w-0 flex-[999_1_600px] !gap-3 !p-5">
          <h2 id="k-image" className="heading text-[18px]">
            Image de la caméra
          </h2>
          <HlsPlayer url={stream.url} label={`Vue de la caméra de la table ${number}`} overlay={overlay} />
          <p className="text-[15px] text-pebble">Faites glisser une poignée pour l&apos;ajuster, ou sélectionnez-la au clavier puis utilisez les flèches.</p>
          <div role="group" aria-label="Coins du goban" className="flex flex-wrap gap-2">
            {NAMES.map((name, i) => (
              <button
                key={name}
                type="button"
                aria-pressed={active === i}
                className={`btn btn-thin ${active === i ? "!border-2 !border-ink !font-bold" : ""}`}
                onClick={() => {
                  setActive(i);
                  handles.current[i]?.focus();
                }}
              >
                Coin {i + 1} · {name}
              </button>
            ))}
          </div>
        </section>

        <aside className="flex flex-[1_1_320px] flex-col gap-5">
          <section aria-labelledby="k-result" className="panel !gap-3 !p-5">
            <h2 id="k-result" className="heading text-[18px]">
              Goban redressé
            </h2>
            <svg viewBox="0 0 200 210" className="w-full rounded-2xl" role="img" aria-label="Schéma d'un goban redressé, légèrement plus haut que large, grille régulière.">
              <rect width={200} height={210} fill="#EBCB8B" />
              <path d="M20 20H180M20 50H180M20 80H180M20 110H180M20 140H180M20 170H180M20 190H180M20 20V190M50 20V190M80 20V190M110 20V190M140 20V190M170 20V190M180 20V190" stroke="#3B2A10" strokeWidth={1} />
              <circle cx={140} cy={50} r={8} fill="#1B1A17" />
              <circle cx={50} cy={140} r={8} fill="#FFFFFF" stroke="#1B1A17" />
            </svg>
            <p className="text-[15px] text-pebble">Schéma : l&apos;aperçu réel du goban redressé arrivera avec le calcul côté serveur.</p>
          </section>
          <section aria-labelledby="k-settings" className="panel !gap-2.5 !p-5">
            <h2 id="k-settings" className="heading text-[18px]">
              Réglages
            </h2>
            <label className="flex min-h-11 items-center gap-2.5">
              <input type="checkbox" defaultChecked className="checkbox flex-none" />
              Corriger la déformation du grand-angle
            </label>
            <label className="flex min-h-11 items-center gap-2.5">
              <input type="checkbox" defaultChecked className="checkbox flex-none" />
              Goban standard (légèrement rectangulaire)
            </label>
          </section>
        </aside>
      </div>

      {saved && (
        <Notice type="warning" title="Calibration gardée sur cet appareil.">
          Elle n&apos;est pas encore transmise au module d&apos;analyse, qui repère aujourd&apos;hui le plateau tout seul.
        </Notice>
      )}

      <div className="action-bar">
        <Link href={`/tournaments/tables/${stream.stream_id}`} className="link-strong">
          Annuler
        </Link>
        <button type="button" className="btn btn-primary !px-[26px] text-[18px]" onClick={validate}>
          Valider la calibration
        </button>
      </div>
    </>
  );
}
