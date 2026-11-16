"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, messageOf, type GameAnalysis, type PositionAnalysis } from "@/lib/api";
import { decimal, plural } from "@/lib/format";
import { colorName, keyPositions, moveOffset, opposite, parsePointName, pointName, toPlay, type Color, type Point } from "@/lib/go";
import { useSgf } from "@/lib/matches";
import Goban from "./Goban";
import { BackLink, Check, Chevron, Notice, Spinner, Stone } from "./ui";

type PositionState = { status: "loading" } | { status: "done"; moves: PositionAnalysis[] } | { status: "error"; message: string };

const LETTERS = ["A", "B", "C"];

function closeness(gap: number, rank: number): string {
  if (rank === 0) return "meilleur coup";
  if (gap < 1) return "proche";
  if (gap < 3) return "jouable";
  return "moins bon";
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${decimal(Math.abs(n))}`;

/**
 * Review of a game: board, evaluation and suggested moves for the current position.
 * Positions are analysed one at a time (GoInsight "deep" analysis); the whole game only on request, as it is slow.
 */
export default function AnalysisView({
  sgf,
  title,
  black,
  white,
  matchId,
  back,
}: {
  sgf: string;
  title: string;
  black?: string;
  white?: string;
  matchId?: number;
  back: { href: string; label: string };
}) {
  const { game, boards } = useSgf(sgf);
  const total = game.moves.length;
  const offset = moveOffset(game);
  const keys = useMemo(() => keyPositions(game), [game]);
  // Optional ?move=N in the address opens the review on that position (this view only renders in the browser).
  const [index, setIndex] = useState(() => {
    const asked = Number(new URLSearchParams(window.location.search).get("move") ?? NaN);
    return Number.isInteger(asked) && asked >= 0 && asked <= total ? asked : (keys[0]?.index ?? total);
  });
  const [positions, setPositions] = useState<Record<number, PositionState>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [whole, setWhole] = useState<{ status: "idle" | "loading" | "error"; message?: string; data?: GameAnalysis }>({ status: "idle" });
  const requested = useRef(new Set<number>());

  const go = useCallback(
    (n: number) => {
      setIndex(Math.max(0, Math.min(total, n)));
      setPicked(null);
    },
    [total],
  );

  // Left / right arrows step through the game, unless the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // Analyse the position once the user has settled on it for a moment.
  useEffect(() => {
    if (!sgf || total === 0 || requested.current.has(index)) return;
    const timer = setTimeout(() => {
      requested.current.add(index);
      setPositions((p) => ({ ...p, [index]: { status: "loading" } }));
      api
        .analyzePosition(sgf, index)
        .then((moves) => setPositions((p) => ({ ...p, [index]: { status: "done", moves: Array.isArray(moves) ? moves : [] } })))
        .catch((e) => setPositions((p) => ({ ...p, [index]: { status: "error", message: messageOf(e) } })));
    }, 600);
    return () => clearTimeout(timer);
  }, [sgf, index, total]);

  const retry = () => {
    requested.current.delete(index);
    setPositions((p) => {
      const next = { ...p };
      delete next[index];
      return next;
    });
  };

  const analyzeWhole = async () => {
    setWhole({ status: "loading" });
    try {
      setWhole({ status: "idle", data: await api.analyzeGame(sgf) });
    } catch (e) {
      setWhole({ status: "error", message: messageOf(e) });
    }
  };

  const mover: Color = toPlay(game, index);
  const last = index > 0 ? game.moves[index - 1] : null;
  const current = positions[index];
  const best = current?.status === "done" ? current.moves.slice(0, 3) : [];
  const suggestions = best
    .map((m, i) => ({ ...m, letter: LETTERS[i], point: parsePointName(m.move, game.size), rank: i }))
    .filter((s): s is typeof s & { point: Point } => s.point !== null);

  // Stones of the variation the user picked, numbered from 1.
  const sequence =
    picked !== null && suggestions[picked]
      ? suggestions[picked].possibleVariation
          .slice(0, 8)
          .map((name, i) => ({ point: parsePointName(name, game.size), color: i % 2 === 0 ? mover : opposite(mover), number: i + 1 }))
          .filter((s): s is { point: Point; color: Color; number: number } => s.point !== null)
          .filter((s, i, all) => all.findIndex((o) => o.point.x === s.point.x && o.point.y === s.point.y) === i)
          .map((s) => ({ ...s.point, color: s.color, number: s.number }))
      : [];

  // Evaluation: the whole-game analysis gives a win rate; a single position only gives a score.
  const turn = whole.data?.turnData[String(index)];
  const blackLead = turn ? turn.scoreLead : best[0] ? (mover === "B" ? best[0].scoreLead : -best[0].scoreLead) : null;
  const blackWin = turn ? Math.round(turn.winrate * 100) : null;

  const keyIndex = keys.findIndex((k) => k.index === index);
  const analysedKeys = keys.filter((k) => positions[k.index]?.status === "done").length;
  const moveLabel = index === total && total > 0 ? "fin" : `coup ${index + offset}`;
  const positionTitle = `${keyIndex >= 0 ? `Position clé ${keyIndex + 1} · ` : ""}${index === 0 && offset === 0 ? "Début de partie" : `Coup ${index + offset}`} · au tour de ${colorName(mover)}`;

  return (
    <div className="flex flex-col gap-[22px]">
      <section aria-labelledby="a-title" className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <BackLink href={back.href}>{back.label}</BackLink>
          <h1 id="a-title" className="heading mb-2 text-[30px]">
            {title}
          </h1>
          <p className="flex flex-wrap gap-x-[18px] gap-y-1 text-base">
            {black && (
              <span className="inline-flex items-center gap-2">
                <Stone color="B" />
                {black}
              </span>
            )}
            {white && (
              <span className="inline-flex items-center gap-2">
                <Stone color="W" />
                {white}
              </span>
            )}
            <span className="text-pebble">{keys.length > 0 ? `reconstruite depuis ${plural(keys.length, "photo")}` : plural(total, "coup")}</span>
          </p>
        </div>
        {matchId !== undefined && (
          <Link href={`/match/${matchId}/correct`} className="btn btn-primary !min-h-12 !px-[18px]">
            Corriger la partie
          </Link>
        )}
      </section>

      {keys.length > 0 && (
        <nav aria-label="Positions clés" className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1 font-bold">Positions clés :</span>
          {keys.map((k, i) => {
            const active = k.index === index;
            return (
              <button
                key={k.index}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => go(k.index)}
                className={`btn btn-thin ${active ? "!border-2 !border-ink !bg-ink !font-extrabold !text-white" : ""}`}
              >
                {i + 1} · {k.index === total ? "fin" : `coup ${k.index + offset}`}
              </button>
            );
          })}
        </nav>
      )}

      {total === 0 ? (
        <Notice type="warning" title="Aucun coup à analyser.">
          Cette partie ne contient pas encore de coups.
        </Notice>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <section aria-labelledby="a-board" className="panel max-w-[580px] flex-[1_1_500px] !p-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 id="a-board" className="heading text-[18px]">
                {positionTitle}
              </h2>
              {keyIndex >= 0 && keys[keyIndex].label && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-pebble">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5B5346" strokeWidth={2} aria-hidden="true">
                    <rect x={3} y={6} width={18} height={14} rx={2} />
                    <circle cx={12} cy={13} r={4} />
                  </svg>
                  {keys[keyIndex].label}
                </span>
              )}
            </div>
            <Goban
              board={boards[index]}
              lastMove={sequence.length === 0 && last && !last.pass ? last : null}
              suggestions={sequence.length > 0 ? [] : suggestions.map((s) => ({ ...s.point, letter: s.letter }))}
              sequence={sequence}
              label={`Goban, ${moveLabel}. ${
                suggestions.length > 0
                  ? `Coups conseillés pour ${colorName(mover)} : ${suggestions.map((s) => `${s.letter} en ${s.move}`).join(", ")}.`
                  : `Au tour de ${colorName(mover)}.`
              }`}
            />
            <p className="sr-only" aria-live="polite">
              {positionTitle}.{last && !last.pass ? ` Dernier coup : ${colorName(last.color)} en ${pointName(last, game.size)}.` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Coup précédent" className="btn btn-round" onClick={() => go(index - 1)} disabled={index === 0}>
                <Chevron />
              </button>
              <div className="flex flex-auto flex-col gap-0.5 px-2">
                <label htmlFor="a-move" className="label text-center">
                  Coup {index + offset} sur {keys.length > 0 ? "≈ " : ""}
                  {total + offset}
                </label>
                <input
                  id="a-move"
                  type="range"
                  min={0}
                  max={total}
                  value={index}
                  onChange={(e) => go(Number(e.target.value))}
                  aria-valuetext={`Coup ${index + offset}${keyIndex >= 0 ? `, position clé ${keyIndex + 1}` : ""}`}
                  className="h-7 w-full accent-ink"
                />
              </div>
              <button type="button" aria-label="Coup suivant" className="btn btn-round" onClick={() => go(index + 1)} disabled={index === total}>
                <Chevron direction="right" />
              </button>
            </div>
            <p className="flex flex-wrap justify-center gap-4 text-[15px] text-pebble">
              <span className="inline-flex items-center gap-1.5">
                <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
                  <circle cx={9} cy={9} r={8} fill="#2E5A8A" />
                  <text x={9} y={13} textAnchor="middle" fontSize={10} fontWeight={800} fill="#FFFFFF">
                    A
                  </text>
                </svg>
                Coup conseillé
              </span>
              <span>
                Clavier : <kbd>←</kbd> <kbd>→</kbd> coup par coup
              </span>
            </p>
          </section>

          <div className="flex flex-[1_1_380px] flex-col gap-5">
            <section aria-labelledby="a-eval" className="panel">
              <h2 id="a-eval" className="text-[15px] font-bold text-pebble">
                Évaluation de la position
              </h2>
              {blackLead !== null ? (
                <p className="text-[30px] font-extrabold leading-tight">
                  {Math.abs(blackLead) < 0.05 ? "Position équilibrée" : `${colorName(blackLead > 0 ? "B" : "W")} mène de ${decimal(Math.abs(blackLead))} points`}
                </p>
              ) : current?.status === "error" ? (
                <p className="text-[18px] font-bold">Évaluation indisponible</p>
              ) : (
                <p className="flex items-center gap-3 text-[18px] font-bold">
                  <Spinner /> Analyse de la position…
                </p>
              )}
              {blackWin !== null ? (
                <>
                  <div aria-hidden="true" className="flex h-10 overflow-hidden rounded-full border-2 border-ink text-base font-extrabold">
                    <span className="flex items-center whitespace-nowrap bg-ink pl-3 text-white" style={{ width: `${blackWin}%` }}>
                      {blackWin >= 25 && `Noir ${blackWin} %`}
                    </span>
                    <span className="flex items-center justify-end whitespace-nowrap bg-white pr-3 text-ink" style={{ width: `${100 - blackWin}%` }}>
                      {blackWin <= 75 && `${100 - blackWin} % Blanc`}
                    </span>
                  </div>
                  <p className="sr-only">
                    Chances de victoire : Noir {blackWin} %, Blanc {100 - blackWin} %.
                  </p>
                </>
              ) : (
                <p className="text-[15px] text-pebble">Les chances de victoire s&apos;affichent après l&apos;analyse de toute la partie.</p>
              )}
            </section>

            <section aria-labelledby="a-moves" className="panel !gap-3">
              <h2 id="a-moves" className="heading text-[20px]">
                Quels autres choix aviez-vous ?
              </h2>
              {current?.status === "error" ? (
                <Notice
                  type="error"
                  title="Analyse indisponible."
                  action={
                    <button type="button" className="btn btn-thin font-bold" onClick={retry}>
                      Réessayer
                    </button>
                  }
                >
                  {current.message}
                </Notice>
              ) : current?.status !== "done" ? (
                <p role="status" className="flex items-center gap-3 text-pebble">
                  <Spinner /> Recherche des meilleurs coups (quelques secondes)…
                </p>
              ) : suggestions.length === 0 ? (
                <p className="text-pebble">Aucun coup conseillé pour cette position.</p>
              ) : (
                <>
                  <p className="text-[15px] text-pebble">Les lettres correspondent aux cercles bleus du goban. Cliquez pour voir la suite du coup.</p>
                  <ol className="flex list-none flex-col gap-2">
                    {suggestions.map((s, i) => {
                      const on = picked === i;
                      return (
                        <li key={s.letter}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setPicked(on ? null : i)}
                            className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3.5 text-left ${
                              on || (picked === null && i === 0) ? "border-2 border-slate bg-slate-light" : "border border-line-strong bg-white"
                            }`}
                          >
                            <span aria-hidden="true" className="inline-flex size-[30px] flex-none items-center justify-center rounded-full bg-slate font-extrabold text-white">
                              {s.letter}
                            </span>
                            <span className="flex-1">
                              <strong className="font-mono text-[18px]">{s.move}</strong> <span className="text-pebble">· {closeness(best[0].scoreLead - s.scoreLead, s.rank)}</span>
                            </span>
                            <strong>{signed(s.scoreLead)}</strong>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  {picked !== null && <p className="text-[15px] text-pebble">Les pierres numérotées montrent la suite la plus probable après le coup {LETTERS[picked]}.</p>}
                </>
              )}
              {matchId !== undefined && (
                <Link href={`/match/${matchId}/correct?mode=variation&move=${index}`} className="link-strong">
                  Tester ma propre variante
                </Link>
              )}
            </section>

            <section aria-labelledby="a-progress" className="panel !gap-2.5">
              <h2 id="a-progress" className="heading text-[18px]">
                Avancement de l&apos;analyse
              </h2>
              <p role="status" className="flex items-center gap-2 text-base">
                {whole.data ? (
                  <>
                    <Check /> Toute la partie est analysée
                  </>
                ) : keys.length > 0 ? (
                  <>
                    {analysedKeys === keys.length && <Check />}
                    {analysedKeys} {analysedKeys > 1 ? "positions clés analysées" : "position clé analysée"} sur {keys.length}
                  </>
                ) : (
                  <>{plural(Object.values(positions).filter((p) => p.status === "done").length, "position analysée", "positions analysées")}</>
                )}
              </p>
              <p className="text-[15px] text-pebble">
                Analyser chaque coup prend une dizaine de secondes : pour toute la partie, comptez environ {Math.max(1, Math.round((total * 12) / 60))} minutes.
                {keys.length > 0 && " Les positions clés suffisent pour revoir vos choix."}
              </p>
              {whole.status === "error" && (
                <Notice type="error" title="Analyse interrompue.">
                  {whole.message}
                </Notice>
              )}
              {!whole.data && (
                <button type="button" className="btn btn-thin self-start font-bold" onClick={analyzeWhole} disabled={whole.status === "loading"}>
                  {whole.status === "loading" ? (
                    <>
                      <Spinner size={18} /> Analyse de toute la partie en cours…
                    </>
                  ) : (
                    "Analyser toute la partie"
                  )}
                </button>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
