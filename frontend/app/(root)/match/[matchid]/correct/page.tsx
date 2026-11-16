"use client";

import { useParams } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import Goban from "@/components/Goban";
import { BackLink, Chevron, Loaded, Notice } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { boardHistory, colorName, moveOffset, opposite, parsePointName, play, pointName, toPlay, writeSgf, type Color, type Move, type Point } from "@/lib/go";
import { useFullMatch, useSgf, type FullMatch } from "@/lib/matches";

type Tool = "move" | "addBlack" | "addWhite" | "remove";
type EditableMove = Move & { id: string };

/** A pending correction. Moves are addressed by a stable id so any correction can be cancelled independently. */
type Correction = { key: number; label: string; srLabel: string } & (
  | { type: "relocate"; id: string; to: Point }
  | { type: "insert"; move: EditableMove; afterId: string | null }
  | { type: "delete"; id: string }
);

/** `Omit` that keeps the members of a union apart. */
type NewCorrection = Correction extends infer C ? (C extends Correction ? Omit<C, "key"> : never) : never;

function applyCorrections(base: EditableMove[], corrections: Correction[]): EditableMove[] {
  let moves = base;
  for (const c of corrections) {
    if (c.type === "relocate") moves = moves.map((m) => (m.id === c.id ? { ...m, x: c.to.x, y: c.to.y, pass: false } : m));
    else if (c.type === "delete") moves = moves.filter((m) => m.id !== c.id);
    else {
      const at = c.afterId === null ? 0 : moves.findIndex((m) => m.id === c.afterId) + 1;
      moves = [...moves.slice(0, at), c.move, ...moves.slice(at)];
    }
  }
  return moves;
}

export default function CorrectPage() {
  const { matchid } = useParams<{ matchid: string }>();
  const state = useFullMatch(matchid);
  // Kept here because the editor is recreated from the saved file after each save.
  const [saved, setSaved] = useState(false);

  return (
    <main id="contenu" className="shell flex flex-col gap-[22px] pb-16 pt-1">
      <Loaded state={state} label="Chargement de la partie…">
        {(match) => (
          <Editor
            key={match.sgf}
            match={match}
            saved={saved}
            onEdited={() => setSaved(false)}
            onSaved={() => {
              setSaved(true);
              state.reload();
            }}
          />
        )}
      </Loaded>
    </main>
  );
}

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: "move", label: "Déplacer un coup" },
  { tool: "addBlack", label: "Ajouter un coup noir" },
  { tool: "addWhite", label: "Ajouter un coup blanc" },
  { tool: "remove", label: "Retirer un coup" },
];

function ToolIcon({ tool, active }: { tool: Tool; active: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: "none" }}>
      {tool === "move" && <path d="M10 2v16M2 10h16M10 2l-3 3M10 2l3 3M10 18l-3-3M10 18l3-3" fill="none" stroke={active ? "#FFFFFF" : "#1B1A17"} strokeWidth={2} />}
      {tool === "addBlack" && <circle cx={10} cy={10} r={8} fill="#1B1A17" stroke={active ? "#FFFFFF" : "none"} />}
      {tool === "addWhite" && <circle cx={10} cy={10} r={7.5} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />}
      {tool === "remove" && <path d="M4 4l12 12M16 4L4 16" stroke={active ? "#FFB4AB" : "#B3261E"} strokeWidth={2.5} />}
    </svg>
  );
}

function Editor({ match, saved, onEdited, onSaved }: { match: FullMatch; saved: boolean; onEdited: () => void; onSaved: () => void }) {
  const { game } = useSgf(match.sgf);
  const offset = moveOffset(game);
  const base = useMemo<EditableMove[]>(() => game.moves.map((m, i) => ({ ...m, id: `m${i}` })), [game]);
  // Read once on mount (this component only renders in the browser, after the match has loaded).
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const [mode, setMode] = useState<"correct" | "variation">(params.get("mode") === "variation" ? "variation" : "correct");
  const [tool, setTool] = useState<Tool>("move");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [index, setIndex] = useState(() => Math.max(0, Math.min(base.length, Number(params.get("move") ?? base.length))));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coord, setCoord] = useState("");
  const [variation, setVariation] = useState<Move[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const counter = useRef(0);

  const moves = useMemo(() => applyCorrections(base, corrections), [base, corrections]);
  const boards = useMemo(() => boardHistory({ ...game, moves }), [game, moves]);
  const total = moves.length;
  const at = Math.min(index, total);
  const board = boards[at];

  const selected = moves.find((m) => m.id === selectedId) ?? null;
  const selectedNumber = selected ? moves.indexOf(selected) + 1 + offset : null;
  const target = parsePointName(coord, game.size);
  const addColor: Color = tool === "addWhite" ? "W" : "B";

  const goTo = (n: number) => {
    setIndex(Math.max(0, Math.min(total, n)));
    setSelectedId(null);
    setVariation([]);
  };

  /** Latest move, among those already played, that put a stone on this point. */
  const moveAt = (p: Point) => {
    for (let i = at - 1; i >= 0; i--) if (!moves[i].pass && moves[i].x === p.x && moves[i].y === p.y) return moves[i];
    return null;
  };

  const push = (c: NewCorrection) => {
    setCorrections((list) => [...list, { ...c, key: counter.current++ } as Correction]);
    onEdited();
    setCoord("");
    setSelectedId(null);
    setStatus(`Correction ajoutée : ${c.label}.`);
  };

  const relocate = (move: EditableMove, to: Point) => {
    if (board[to.y][to.x]) return setStatus(`${pointName(to, game.size)} est déjà occupé.`);
    const n = moves.indexOf(move) + 1 + offset;
    push({
      type: "relocate",
      id: move.id,
      to,
      label: `Coup ${n} · ${colorName(move.color)} déplacé de ${pointName(move, game.size)} à ${pointName(to, game.size)}`,
      srLabel: `la correction du coup ${n}`,
    });
  };

  const insert = (color: Color, p: Point) => {
    if (board[p.y][p.x]) return setStatus(`${pointName(p, game.size)} est déjà occupé.`);
    const n = at + 1 + offset;
    const id = `n${counter.current}`;
    push({
      type: "insert",
      move: { id, color, x: p.x, y: p.y, pass: false },
      afterId: at > 0 ? moves[at - 1].id : null,
      label: `Coup ${n} · ${colorName(color)} ajouté en ${pointName(p, game.size)}`,
      srLabel: `l'ajout du coup ${n}`,
    });
    setIndex(at + 1);
  };

  const remove = (move: EditableMove) => {
    const n = moves.indexOf(move) + 1 + offset;
    push({
      type: "delete",
      id: move.id,
      label: `Coup ${n} · ${colorName(move.color)} retiré de ${pointName(move, game.size)}`,
      srLabel: `le retrait du coup ${n}`,
    });
    setIndex(Math.max(0, at - 1));
  };

  // --- Variation: free exploration from the current position, never saved. ---
  const variationBoard = useMemo(() => variation.reduce((b, m) => play(b, m), board), [variation, board]);
  const variationColor: Color = variation.length > 0 ? opposite(variation[variation.length - 1].color) : toPlay({ ...game, moves }, at);

  const onPoint = (p: Point) => {
    if (mode === "variation") {
      if (variationBoard[p.y][p.x]) return setStatus(`${pointName(p, game.size)} est déjà occupé.`);
      setVariation((v) => [...v, { color: variationColor, x: p.x, y: p.y, pass: false }]);
      return setStatus(`Variante : ${colorName(variationColor)} en ${pointName(p, game.size)}.`);
    }
    const stone = board[p.y][p.x];
    if (tool === "addBlack" || tool === "addWhite") return insert(addColor, p);
    if (stone) {
      const move = moveAt(p);
      if (!move) return setStatus("Cette pierre vient d'une position de départ : elle ne peut pas être corrigée.");
      if (tool === "remove") return remove(move);
      setSelectedId(move.id);
      setCoord("");
      return setStatus(`Pierre ${move.color === "B" ? "noire" : "blanche"} du coup ${moves.indexOf(move) + 1 + offset} sélectionnée en ${pointName(move, game.size)}.`);
    }
    if (tool === "move" && selected) return relocate(selected, p);
    setStatus(tool === "move" ? "Sélectionnez d'abord une pierre à déplacer." : "Sélectionnez une pierre à retirer.");
  };

  const submitCoord = (e: FormEvent) => {
    e.preventDefault();
    if (!target) return setStatus("Coordonnée inconnue. Exemple : R10.");
    if (tool === "addBlack" || tool === "addWhite") return insert(addColor, target);
    if (tool === "remove") {
      const move = moveAt(target);
      return move ? remove(move) : setStatus(`Aucun coup à retirer en ${pointName(target, game.size)}.`);
    }
    if (selected) relocate(selected, target);
    else setStatus("Sélectionnez d'abord une pierre à déplacer.");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const cleaned = moves.map(({ id: _id, ...m }) => m);
      await api.editMatch(match.detail.match_id, { sgf: writeSgf({ ...game, moves: cleaned }) });
      onSaved();
    } catch (e) {
      setError(messageOf(e));
      setSaving(false);
    }
  };

  const coordLabel =
    tool === "move"
      ? selectedNumber
        ? `Déplacer le coup ${selectedNumber} vers`
        : "Déplacer le coup sélectionné vers"
      : tool === "remove"
        ? "Retirer le coup joué en"
        : `Ajouter un coup ${tool === "addBlack" ? "noir" : "blanc"} en`;

  const last = at > 0 ? moves[at - 1] : null;
  const count = corrections.length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <BackLink href={`/match/${match.detail.match_id}/analyze`}>Analyse</BackLink>
          <h1 className="heading text-[34px]">Corriger la partie</h1>
          <p className="mt-1.5 text-[18px] text-pebble">{match.detail.title} · déplacez, ajoutez ou retirez des pierres, comme sur un kifu.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-outline !px-[18px]" disabled={count === 0 || saving} onClick={() => setCorrections([])}>
            Annuler les corrections
          </button>
          <button type="button" className="btn btn-primary !px-[22px]" disabled={count === 0 || saving} onClick={save}>
            {saving ? "Enregistrement…" : `Enregistrer (${count} correction${count > 1 ? "s" : ""})`}
          </button>
        </div>
      </div>

      {saved && (
        <Notice type="success" title="Enregistrée.">
          Les corrections sont dans le fichier SGF de la partie.
        </Notice>
      )}
      {error && (
        <Notice type="error" title="Enregistrement impossible.">
          {error}
        </Notice>
      )}

      <div>
        <div role="radiogroup" aria-label="Mode" className="inline-flex flex-wrap gap-1 rounded-[26px] border border-line bg-white p-1">
          {(["correct", "variation"] as const).map((m) => (
            <label key={m} className="segment !border-0">
              <input
                type="radio"
                name="mode"
                className="sr-only"
                checked={mode === m}
                onChange={() => {
                  setMode(m);
                  setSelectedId(null);
                  setVariation([]);
                }}
              />
              {m === "correct" ? "Corriger la partie" : "Tester une variante"}
            </label>
          ))}
        </div>
        <p className="mt-3 text-[15px] text-pebble">Une variante ne modifie pas la partie enregistrée : elle sert à explorer d&apos;autres choix depuis une position.</p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="c-board" className="panel max-w-[580px] flex-[1_1_500px] !p-5">
          <h2 id="c-board" className="heading text-[18px]">
            {mode === "variation"
              ? `Variante depuis le coup ${at + offset}${variation.length ? ` · ${variation.length} coup${variation.length > 1 ? "s" : ""} testé${variation.length > 1 ? "s" : ""}` : ""}`
              : selected
                ? `Coup ${selectedNumber} · ${colorName(selected.color)} ${pointName(selected, game.size)} sélectionné`
                : `Coup ${at + offset} sur ${total + offset}`}
          </h2>
          <Goban
            board={mode === "variation" ? variationBoard : board}
            lastMove={mode === "correct" && last && !last.pass ? last : null}
            selected={mode === "correct" && selected && !selected.pass ? selected : null}
            ghost={
              mode === "correct" && target && !board[target.y][target.x]
                ? tool === "move"
                  ? selected && { ...target, color: selected.color }
                  : tool !== "remove"
                    ? { ...target, color: addColor }
                    : null
                : null
            }
            sequence={mode === "variation" ? variation.map((m, i) => ({ x: m.x, y: m.y, color: m.color, number: i + 1 })).filter((s) => variationBoard[s.y][s.x] === s.color) : []}
            onPoint={onPoint}
            label={mode === "variation" ? `Goban en mode variante. Au tour de ${colorName(variationColor)}.` : "Goban en mode correction."}
          />
          <p className="sr-only" aria-live="polite">
            {status}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Coup précédent" className="btn btn-round" onClick={() => goTo(at - 1)} disabled={at === 0}>
              <Chevron />
            </button>
            <div className="flex flex-auto flex-col gap-0.5 px-2">
              <label htmlFor="c-move" className="label text-center">
                Coup {at + offset} sur {total + offset}
              </label>
              <input id="c-move" type="range" min={0} max={total} value={at} onChange={(e) => goTo(Number(e.target.value))} className="h-7 w-full accent-ink" />
            </div>
            <button type="button" aria-label="Coup suivant" className="btn btn-round" onClick={() => goTo(at + 1)} disabled={at === total}>
              <Chevron direction="right" />
            </button>
          </div>
          <p className="flex flex-wrap justify-center gap-4 text-[15px] text-pebble">
            <span className="inline-flex items-center gap-1.5">
              <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
                <rect x={2} y={2} width={16} height={16} fill="none" stroke="#2E5A8A" strokeWidth={2.5} />
              </svg>
              Pierre sélectionnée
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
                <circle cx={9} cy={9} r={7.5} fill="#1B1A17" fillOpacity={0.35} stroke="#1B1A17" strokeDasharray="3 2" />
              </svg>
              Nouvel emplacement
            </span>
            <span>
              Clavier : flèches puis <kbd>Entrée</kbd>
            </span>
          </p>
        </section>

        <div className="flex flex-[1_1_380px] flex-col gap-5">
          {mode === "variation" ? (
            <section aria-labelledby="c-variation" className="panel !gap-3">
              <h2 id="c-variation" className="heading text-[18px]">
                Variante
              </h2>
              <p className="text-base">
                Cliquez sur le goban pour jouer : au tour de <strong>{colorName(variationColor)}</strong>.
              </p>
              {variation.length > 0 && (
                <p className="font-mono text-base">{variation.map((m, i) => `${i + 1}. ${pointName(m, game.size)}`).join("  ")}</p>
              )}
              <div className="flex flex-wrap gap-2.5">
                <button type="button" className="btn btn-thin font-bold" disabled={variation.length === 0} onClick={() => setVariation((v) => v.slice(0, -1))}>
                  Reprendre le dernier coup
                </button>
                <button type="button" className="btn btn-thin font-bold" disabled={variation.length === 0} onClick={() => setVariation([])}>
                  Effacer la variante
                </button>
              </div>
              <p className="text-[15px] text-pebble">Changez de position avec le curseur sous le goban pour partir d&apos;un autre coup.</p>
            </section>
          ) : (
            <>
              <section aria-labelledby="c-tools" className="panel !gap-3">
                <h2 id="c-tools" className="heading text-[18px]">
                  Outils
                </h2>
                <div role="toolbar" aria-label="Outils de correction" className="grid grid-cols-2 gap-2">
                  {TOOLS.map((t) => {
                    const active = tool === t.tool;
                    return (
                      <button
                        key={t.tool}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setTool(t.tool);
                          setCoord("");
                          if (t.tool !== "move") setSelectedId(null);
                        }}
                        className={`flex min-h-14 items-center gap-2.5 rounded-2xl px-3.5 text-left font-bold ${
                          active ? "border-2 border-ink bg-ink text-white" : "border border-line-strong bg-white"
                        }`}
                      >
                        <ToolIcon tool={t.tool} active={active} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={submitCoord} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                  <div className="field-group flex-[1_1_140px]">
                    <label htmlFor="c-coord" className="label">
                      {coordLabel}
                    </label>
                    <input
                      id="c-coord"
                      className="field field-mono uppercase"
                      value={coord}
                      onChange={(e) => setCoord(e.target.value)}
                      placeholder="R10"
                      autoComplete="off"
                      maxLength={3}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary !px-5">
                    Valider
                  </button>
                </form>
                <p className="text-[15px] text-pebble">
                  {tool === "move" && "Cliquez sur une pierre, puis sur son nouvel emplacement."}
                  {(tool === "addBlack" || tool === "addWhite") && `Le coup est inséré après le coup ${at + offset} affiché sur le goban.`}
                  {tool === "remove" && "Cliquez sur la pierre du coup à retirer."}
                </p>
              </section>

              <section aria-labelledby="c-pending" className="panel !gap-3">
                <h2 id="c-pending" className="heading text-[18px]">
                  Corrections en attente
                </h2>
                {count === 0 ? (
                  <p className="text-base text-pebble">Aucune correction pour le moment.</p>
                ) : (
                  <ol className="flex list-none flex-col gap-2 text-base">
                    {corrections.map((c) => (
                      <li key={c.key} className="flex items-center justify-between gap-2.5 rounded-2xl bg-sand px-3 py-1.5">
                        <span>{c.label}</span>
                        <button type="button" className="btn-link flex-none" onClick={() => setCorrections((list) => list.filter((o) => o.key !== c.key))}>
                          Annuler<span className="sr-only"> {c.srLabel}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="text-[15px] text-pebble">Les positions issues des photos restent fixes : seuls les coups joués entre deux photos peuvent être corrigés.</p>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
