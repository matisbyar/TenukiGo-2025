"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Goban from "@/components/Goban";
import HlsPlayer from "@/components/HlsPlayer";
import { BackLink, DevBanner, Loaded, Notice, Stone } from "@/components/ui";
import { api, messageOf, useLoad } from "@/lib/api";
import { colorName, parsePointName, pointName, writeSgf } from "@/lib/go";
import { useLiveSgf } from "@/lib/live";
import { loadTable, useSgf, type TableInfo } from "@/lib/matches";
import { tableNumber } from "@/lib/tournament";

export default function TableControlPage() {
  const { streamid } = useParams<{ streamid: string }>();
  const state = useLoad(() => loadTable(streamid), [streamid]);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-[22px] pb-16 pt-1">
        <Loaded state={state} label="Connexion à la table…">
          {(table) => <Control table={table} />}
        </Loaded>
      </main>
    </>
  );
}

function Control({ table }: { table: TableInfo }) {
  const { stream } = table;
  const number = tableNumber(stream);
  const live = useLiveSgf(stream.match_id, table.sgf);
  const { game, boards } = useSgf(live.sgf);
  const total = game.moves.length;

  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [coord, setCoord] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; title: string; text: string } | null>(null);

  // The move being corrected: the one picked in the list, otherwise the last one.
  const moveNumber = target !== null && target <= total ? target : total;
  const move = moveNumber > 0 ? game.moves[moveNumber - 1] : null;
  const point = parsePointName(coord, game.size);
  const recent = game.moves
    .map((m, i) => ({ move: m, number: i + 1 }))
    .slice(-5)
    .reverse();

  const togglePause = async () => {
    setBusy(true);
    setNotice(null);
    try {
      // The backend answers "ok" even when the analysis module did nothing: the state shown is what was requested.
      await (paused ? api.startAnalysis(stream.stream_id) : api.stopAnalysis(stream.stream_id));
      setPaused(!paused);
    } catch (e) {
      setNotice({ type: "error", title: "Action impossible.", text: messageOf(e) });
    } finally {
      setBusy(false);
    }
  };

  const correct = (e: FormEvent) => {
    e.preventDefault();
    if (!move) return;
    if (!point) return setNotice({ type: "error", title: "Coordonnée inconnue.", text: "Exemple : K10." });
    const moves = game.moves.map((m, i) => (i === moveNumber - 1 ? { ...m, x: point.x, y: point.y, pass: false } : m));
    const sent = live.publish(writeSgf({ ...game, moves }));
    if (sent) {
      setNotice({ type: "success", title: `Coup ${moveNumber} corrigé.`, text: `${colorName(move.color)} est maintenant en ${pointName(point, game.size)}. Les spectateurs voient la correction.` });
      setCoord("");
      setTarget(null);
    } else {
      setNotice({ type: "error", title: "Correction non envoyée.", text: "La connexion au direct est coupée : rechargez la page puis réessayez." });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <BackLink href="/tournaments">Régie</BackLink>
          <h1 className="heading mb-1.5 text-[clamp(26px,4.5vw,32px)]">Table {number} · contrôle</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
            <span className="inline-flex items-center gap-2">
              <Stone color="B" />
              {stream.black ?? "Joueur inconnu"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Stone color="W" />
              {stream.white ?? "Joueur inconnu"}
            </span>
            <Link href={`/match/${stream.match_id}/edit`}>Modifier les joueurs</Link>
            <Link href={`/tournaments/tables/${stream.stream_id}/calibration`}>Recalibrer la caméra</Link>
          </p>
        </div>
        <button type="button" aria-pressed={paused} className="btn btn-outline !min-h-12 !px-[18px]" onClick={togglePause} disabled={busy}>
          {paused ? "Reprendre la détection" : "Mettre la détection en pause"}
        </button>
      </div>

      {paused && (
        <Notice type="warning" title="Détection en pause.">
          Les coups joués ne sont plus ajoutés au goban tant que la détection n&apos;est pas reprise.
        </Notice>
      )}
      {total === 0 && !paused && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[14px] border-[3px] border-danger bg-danger-light px-[18px] py-3.5">
          <p className="flex-[1_1_360px]">
            <strong>Aucun coup détecté :</strong> vérifiez que la caméra émet et que le plateau est bien cadré.
          </p>
          <Link href={`/tournaments/tables/${stream.stream_id}/calibration`} className="btn btn-red !min-h-11 !px-[18px]">
            Recalibrer
          </Link>
        </div>
      )}
      {notice && (
        <Notice type={notice.type} title={notice.title}>
          {notice.text}
        </Notice>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="t-video" className="flex min-w-0 flex-[1_1_440px] flex-col gap-2.5">
          <h2 id="t-video" className="heading text-[18px]">
            Vidéo de la table
          </h2>
          <HlsPlayer url={stream.url} label={`Vidéo de la table ${number}`} square />
        </section>
        <section aria-labelledby="t-board" className="flex min-w-0 flex-[1_1_440px] flex-col gap-2.5">
          <h2 id="t-board" className="heading text-[18px]">
            Goban calculé{total > 0 ? ` · coup ${total}` : ""}
          </h2>
          <div className="rounded-[20px] border border-line bg-white p-3">
            <Goban
              board={boards[total]}
              lastMove={total > 0 && !game.moves[total - 1].pass ? game.moves[total - 1] : null}
              selected={move && !move.pass && target !== null ? move : null}
              ghost={point && move && !boards[total][point.y][point.x] ? { ...point, color: move.color } : null}
              label={`Goban calculé de la table ${number}, ${total} coups.`}
            />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="t-correct" className="panel flex-[1_1_440px]">
          <h2 id="t-correct" className="heading text-[20px]">
            {move ? `Corriger le coup ${moveNumber}` : "Corriger un coup"}
          </h2>
          {move ? (
            <form onSubmit={correct} className="flex flex-wrap items-end gap-2">
              <div className="field-group flex-[1_1_140px]">
                <label htmlFor="t-coord" className="label">
                  Position réelle de la pierre {move.color === "B" ? "noire" : "blanche"}
                  <span className="font-normal text-pebble"> (détectée en {move.pass ? "passe" : pointName(move, game.size)})</span>
                </label>
                <input id="t-coord" className="field field-mono uppercase" value={coord} onChange={(e) => setCoord(e.target.value)} placeholder="K10" maxLength={3} autoComplete="off" />
              </div>
              <button type="submit" className="btn btn-primary !px-5">
                Corriger
              </button>
            </form>
          ) : (
            <p className="text-pebble">Les coups apparaîtront ici dès qu&apos;ils seront détectés.</p>
          )}
          <p className="text-[15px] text-pebble">La correction est enregistrée dans la partie et les spectateurs la voient en direct.</p>
        </section>

        <section aria-labelledby="t-recent" className="panel flex-[1_1_440px] !gap-3">
          <h2 id="t-recent" className="heading text-[20px]">
            Derniers coups détectés
          </h2>
          {recent.length === 0 ? (
            <p className="text-pebble">Aucun coup pour le moment.</p>
          ) : (
            <ol reversed className="flex list-none flex-col gap-2 text-base">
              {recent.map(({ move: m, number: n }) => {
                const picked = target === n;
                return (
                  <li key={n} className={`flex items-center justify-between gap-2.5 rounded-2xl px-3 py-1 ${picked ? "border-2 border-slate bg-slate-light" : "bg-sand"}`}>
                    <span>
                      {n} · {colorName(m.color)} <strong className="font-mono">{m.pass ? "passe" : pointName(m, game.size)}</strong>
                    </span>
                    <button type="button" aria-pressed={picked} className={`btn-link ${picked ? "font-bold" : ""}`} onClick={() => setTarget(picked ? null : n)}>
                      Corriger<span className="sr-only"> le coup {n}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
