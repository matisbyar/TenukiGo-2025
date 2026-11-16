"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Goban from "@/components/Goban";
import HlsPlayer from "@/components/HlsPlayer";
import { DevBanner, Loaded, Stone } from "@/components/ui";
import { useLoad } from "@/lib/api";
import { clockTime } from "@/lib/format";
import { colorName, pointName } from "@/lib/go";
import { useLiveSgf } from "@/lib/live";
import { loadTable, useSgf, type TableInfo } from "@/lib/matches";

export default function WatchPage() {
  const { streamid } = useParams<{ streamid: string }>();
  const state = useLoad(() => loadTable(streamid), [streamid]);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-[22px] pb-16 pt-8">
        <Loaded state={state} label="Connexion à la table…">
          {(table) => <Live table={table} />}
        </Loaded>
      </main>
    </>
  );
}

function Live({ table }: { table: TableInfo }) {
  const { stream } = table;
  const live = useLiveSgf(stream.match_id, table.sgf);
  const { game, boards } = useSgf(live.sgf);
  const [latency, setLatency] = useState<number | null>(null);
  const [announce, setAnnounce] = useState(true);
  const [copied, setCopied] = useState(false);

  const total = game.moves.length;
  const last = total > 0 ? game.moves[total - 1] : null;
  const previous = game.moves
    .map((move, i) => ({ move, number: i + 1 }))
    .slice(Math.max(0, total - 4), Math.max(0, total - 1))
    .reverse();
  const started = stream.date ? new Date(stream.date) : null;
  const lastText = last ? (last.pass ? `${colorName(last.color)} passe` : `${colorName(last.color)} joue ${pointName(last, game.size)}`) : "En attente du premier coup";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <section aria-labelledby="v-title" className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] border border-line bg-white px-6 py-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2.5">
            {live.ended ? <span className="pill pill-neutral">Partie terminée</span> : <span className="live-badge">EN DIRECT</span>}
            {latency !== null && !live.ended && <span className="text-[15px] text-pebble">environ {Math.max(1, Math.round(latency))} secondes de décalage</span>}
          </p>
          <h1 id="v-title" className="heading mb-1.5 mt-2 text-[clamp(24px,4.5vw,30px)]">
            {stream.title ?? "Partie en direct"}
          </h1>
          <p className="flex flex-wrap gap-x-[18px] gap-y-1 text-base">
            <span className="inline-flex items-center gap-2">
              <Stone color="B" />
              {stream.black_id ? <Link href={`/player/${stream.black_id}`}>{stream.black}</Link> : "Joueur inconnu"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Stone color="W" />
              {stream.white_id ? <Link href={`/player/${stream.white_id}`}>{stream.white}</Link> : "Joueur inconnu"}
            </span>
            <span className="text-pebble">{[stream.style, started && `depuis ${clockTime(started)}`].filter(Boolean).join(" · ")}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button type="button" className="btn btn-outline !min-h-12 !px-[18px]" onClick={copyLink}>
            Copier le lien pour OBS ou Twitch
          </button>
          <span role="status" className="text-[15px] font-bold text-jade">
            {copied && "✓ Lien copié"}
          </span>
          <Link href="/watch" className="link-strong">
            Autre table en direct
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-[22px]">
        <section aria-labelledby="v-video" className="min-w-0 flex-[1_1_520px]">
          <h2 id="v-video" className="sr-only">
            Vidéo
          </h2>
          <HlsPlayer url={stream.url} label={`Vidéo de la table : ${stream.title ?? "partie en direct"}`} onLatency={setLatency} />
        </section>

        <section aria-labelledby="v-board" className="panel min-w-0 flex-[1_1_400px] !p-[18px]">
          <h2 id="v-board" className="sr-only">
            Goban synchronisé
          </h2>
          <Goban
            board={boards[total]}
            lastMove={last && !last.pass ? last : null}
            label={`Goban synchronisé avec la vidéo. ${last ? `Dernier coup : ${lastText}.` : "Aucun coup joué pour le moment."}`}
          />
          <div role="log" aria-live={announce ? "polite" : "off"} className="flex items-center gap-3.5 rounded-[20px] bg-ink p-3.5 text-white">
            <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden="true" className="flex-none">
              <circle cx={18} cy={18} r={16} fill={last?.color === "B" ? "#1B1A17" : "#FFFFFF"} stroke="#E8A317" strokeWidth={3} />
            </svg>
            <p>
              <span className="block text-sm text-[#D9D2C3]">{last ? `Coup ${total}` : "Début de partie"}</span>
              <strong className="text-[22px]">{lastText}</strong>
            </p>
          </div>
          {previous.length > 0 && (
            <ol reversed aria-label="Coups précédents" className="flex list-none flex-wrap gap-2">
              {previous.map(({ move, number }) => (
                <li key={number} className="inline-flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-[15px]">
                  <Stone color={move.color} size={22} />
                  {number} · <strong className="font-mono">{move.pass ? "passe" : pointName(move, game.size)}</strong>
                </li>
              ))}
            </ol>
          )}
          <label className="flex min-h-11 items-center gap-2.5 border-t border-line pt-1.5 text-base">
            <input type="checkbox" className="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
            Annoncer chaque coup aux lecteurs d&apos;écran
          </label>
          {live.dropped && !live.ended && (
            <p role="status" className="text-[15px] text-pebble">
              Connexion au direct interrompue : rechargez la page pour suivre les nouveaux coups.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
