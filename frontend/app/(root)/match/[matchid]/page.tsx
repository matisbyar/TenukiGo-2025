"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Goban from "@/components/Goban";
import { BackLink, Loaded, Notice, Stone } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { isTournament, longDate, playerName, winnerOf, type Winner } from "@/lib/format";
import { colorName, downloadSgf, keyPositions, moveOffset, pointName, type Color } from "@/lib/go";
import { useFullMatch, useSgf, type FullMatch } from "@/lib/matches";

export default function MatchPage() {
  const { matchid } = useParams<{ matchid: string }>();
  const state = useFullMatch(matchid);

  return (
    <main id="contenu" className="shell flex flex-col gap-3 pb-16 pt-1">
      <div>
        <BackLink href="/matches">Mes parties</BackLink>
      </div>
      <Loaded state={state} label="Chargement de la partie…">
        {(match) => <MatchView match={match} />}
      </Loaded>
    </main>
  );
}

function sourceOf(match: FullMatch, fromPhotos: boolean): string {
  if (!match.sgf) return "Aucun SGF";
  if (fromPhotos) return "Photos";
  if (isTournament(match.detail.style)) return "Caméra de table";
  if (match.detail.video_id) return "Vidéo";
  return "SGF importé";
}

function PlayerLine({ color, name, id, winner, margin }: { color: Color; name: string; id: number | null; winner: Winner; margin: string }) {
  const won = winner === color;
  const lost = winner !== null && winner !== "draw" && !won;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${won ? "bg-ink text-white" : "border border-line"}`}>
      <span className="inline-flex min-w-0 items-center gap-2">
        {won && color === "B" ? (
          <svg width={18} height={18} viewBox="0 0 16 16" aria-hidden="true">
            <circle cx={8} cy={8} r={7} fill="#FFFFFF" />
            <circle cx={8} cy={8} r={5.5} fill="#1B1A17" />
          </svg>
        ) : (
          <Stone color={color} size={18} />
        )}
        <span>
          {id ? (
            <Link href={`/player/${id}`} className={won ? "!text-white" : ""}>
              {name}
            </Link>
          ) : (
            name
          )}{" "}
          ({colorName(color)})
        </span>
      </span>
      {won && <strong className="text-amber">Gagnant</strong>}
      {lost && margin && <span className="text-pebble">−{margin} points</span>}
      {winner === "draw" && <span className={won ? "" : "text-pebble"}>Partie nulle</span>}
    </div>
  );
}

function MatchView({ match }: { match: FullMatch }) {
  const { detail } = match;
  const router = useRouter();
  const { game, boards } = useSgf(match.sgf);
  const total = game.moves.length;
  const offset = moveOffset(game);
  const [index, setIndex] = useState(total);
  const [playing, setPlaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (index >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), 500);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  const last = index > 0 ? game.moves[index - 1] : null;
  const fromPhotos = keyPositions(game).length > 0;
  const winner = winnerOf(detail.result) ?? winnerOf(game.info.RE);
  const margin = game.info.RE?.match(/\+(\d+(?:\.\d+)?)/)?.[1]?.replace(".", ",") ?? "";

  const replay = () => {
    if (index >= total) setIndex(0);
    setPlaying((p) => !p);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setError("Le lien n'a pas pu être copié. Copiez l'adresse de la page.");
    }
  };

  const remove = async () => {
    try {
      await api.deleteMatch(detail.match_id);
      router.push("/matches");
    } catch (e) {
      setError(messageOf(e));
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-[22px]">
      <section aria-labelledby="board-title" className="panel max-w-[580px] flex-[1_1_500px] !p-5">
        <h2 id="board-title" className="heading text-[18px]">
          {total === 0 ? "Goban" : index === total ? `Position finale · coup ${total + offset}` : `Coup ${index + offset} sur ${total + offset}`}
        </h2>
        <Goban
          board={boards[index] ?? boards[0]}
          lastMove={last && !last.pass ? last : null}
          label={
            last && !last.pass
              ? `Position après le coup ${index + offset} : ${colorName(last.color)} en ${pointName(last, game.size)}.`
              : index === 0
                ? "Position de départ."
                : `Position après le coup ${index + offset}.`
          }
        />
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={playing ? "Mettre en pause" : "Rejouer la partie"} className="btn btn-round" onClick={replay}>
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
                {playing ? <path d="M5 3v12M13 3v12" stroke="#1B1A17" strokeWidth={3} /> : <path d="M5 3l10 6-10 6z" fill="#1B1A17" />}
              </svg>
            </button>
            <div className="flex flex-auto flex-col gap-0.5 px-2">
              <label htmlFor="move" className="label text-center">
                Coup {index + offset} sur {total + offset}
              </label>
              <input
                id="move"
                type="range"
                min={0}
                max={total}
                value={index}
                onChange={(e) => {
                  setPlaying(false);
                  setIndex(Number(e.target.value));
                }}
                className="h-7 w-full accent-ink"
              />
            </div>
          </div>
        ) : (
          <p className="text-[15px] text-pebble">Cette partie n&apos;a pas encore de coups enregistrés.</p>
        )}
      </section>

      <aside className="flex flex-[1_1_360px] flex-col gap-5">
        <section aria-labelledby="match-title" className="panel !gap-4">
          <div>
            <p className="text-[15px] font-bold text-pebble">{[longDate(detail.date), detail.style].filter(Boolean).join(" · ")}</p>
            <h1 id="match-title" className="heading mt-1 text-[28px]">
              {detail.title}
            </h1>
          </div>
          <div className="flex flex-col gap-2">
            <PlayerLine color="B" name={playerName(match.black)} id={detail.black} winner={winner} margin={margin} />
            <PlayerLine color="W" name={playerName(match.white)} id={detail.white} winner={winner} margin={margin} />
          </div>
          <dl className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-sand px-3 py-2.5">
              <dt className="text-sm text-pebble">Coups</dt>
              <dd className="mt-0.5 text-[18px] font-extrabold">{fromPhotos ? `≈ ${total + offset}` : total}</dd>
            </div>
            <div className="rounded-2xl bg-sand px-3 py-2.5">
              <dt className="text-sm text-pebble">Source</dt>
              <dd className="mt-0.5 text-[18px] font-extrabold">{sourceOf(match, fromPhotos)}</dd>
            </div>
          </dl>
          {isTournament(detail.style) && !detail.video_id && (
            <p className="text-[15px] text-pebble">Partie calculée en direct ; la vidéo n&apos;a pas été conservée.</p>
          )}
          {match.sgf ? (
            <>
              <Link href={`/match/${detail.match_id}/analyze`} className="btn btn-primary">
                Analyser la partie
              </Link>
              <div className="flex flex-wrap gap-4">
                <Link href={`/match/${detail.match_id}/correct`} className="link-strong">
                  Corriger
                </Link>
                <button type="button" className="btn-link !min-h-0 !p-0 font-bold text-clay" onClick={() => downloadSgf(match.sgf, detail.title)}>
                  Télécharger le SGF
                </button>
              </div>
            </>
          ) : (
            <Link href={`/match/${detail.match_id}/edit`} className="btn btn-outline">
              Ajouter un fichier SGF
            </Link>
          )}
        </section>

        {error && (
          <Notice type="error" title="Action impossible.">
            {error}
          </Notice>
        )}
        {copied && (
          <Notice type="success" title="Lien copié.">
            Vous pouvez le coller dans un message.
          </Notice>
        )}

        <details className="rounded-[28px] border border-line bg-white px-[22px] py-1">
          <summary className="flex min-h-[52px] items-center text-[17px] font-bold">Plus d&apos;actions</summary>
          <ul className="mb-3.5 mt-1 flex list-none flex-col gap-1.5">
            <li>
              <Link href={`/match/${detail.match_id}/edit`}>Modifier les informations</Link>
            </li>
            <li>
              <button type="button" className="btn-link !p-0 text-clay" onClick={share}>
                Partager la partie
              </button>
            </li>
            <li>
              {confirming ? (
                <div role="alertdialog" aria-label="Confirmer la suppression" className="flex flex-col gap-3 rounded-2xl bg-danger-light p-3.5">
                  <p>
                    <strong>Supprimer « {detail.title} » ?</strong> La partie et son fichier SGF seront effacés. Cette action est définitive.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button type="button" className="btn btn-red !min-h-11" onClick={remove}>
                      Supprimer définitivement
                    </button>
                    <button type="button" className="btn btn-thin font-bold" onClick={() => setConfirming(false)}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-link !p-0 font-bold text-danger" onClick={() => setConfirming(true)}>
                  Supprimer la partie
                </button>
              )}
            </li>
          </ul>
        </details>
      </aside>
    </div>
  );
}
