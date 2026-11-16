"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, messageOf, useLoad, type MatchDetail, type Player } from "@/lib/api";
import { RESULTS, STYLES, toDateInput, winnerOf } from "@/lib/format";
import { parseSgf } from "@/lib/go";
import PlayerSelect from "./PlayerSelect";
import { Loaded, Notice } from "./ui";

function initialResult(result: string | null | undefined) {
  const w = winnerOf(result);
  return w === "B" ? "black" : w === "W" ? "white" : w === "draw" ? "draw" : "unknown";
}

/** Creates a match from an SGF file, or edits the information of an existing match. */
export default function MatchForm({ match }: { match?: MatchDetail }) {
  const players = useLoad(() => api.players(), []);
  return <Loaded state={players}>{(list) => <Form match={match} initialPlayers={list} />}</Loaded>;
}

function Form({ match, initialPlayers }: { match?: MatchDetail; initialPlayers: Player[] }) {
  const router = useRouter();
  const editing = Boolean(match);
  const [players, setPlayers] = useState(initialPlayers);
  const [title, setTitle] = useState(match?.title ?? "");
  const [black, setBlack] = useState<number | null>(match?.black ?? null);
  const [white, setWhite] = useState<number | null>(match?.white ?? null);
  const [result, setResult] = useState(initialResult(match?.result));
  const [style, setStyle] = useState(match?.style || "amical");
  const [date, setDate] = useState(toDateInput(match?.date) || toDateInput(new Date().toISOString()));
  const [sgf, setSgf] = useState<{ name: string; text: string; moves: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const addPlayer = (p: Player) => setPlayers((list) => [...list, p]);
  const missingSgf = !editing && !sgf;
  const invalid = !title.trim() || black === null || white === null || missingSgf;

  const readFile = async (file: File | undefined) => {
    if (!file) return setSgf(null);
    const text = await file.text();
    const game = parseSgf(text);
    setSgf({ name: file.name, text, moves: game.moves.length });
    // Pre-fill the title and result from the file when they are still empty.
    if (!title.trim()) setTitle(game.info.GN || file.name.replace(/\.sgf$/i, ""));
    const fromFile = winnerOf(game.info.RE);
    if (result === "unknown" && fromFile) setResult(initialResult(game.info.RE));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (invalid || black === null || white === null) return;
    setBusy(true);
    setError("");
    const fields = { title: title.trim(), black, white, result, style, date: date ? `${date}T12:00:00` : undefined, sgf: sgf?.text };
    try {
      const id = match ? (await api.editMatch(match.match_id, fields)).match_id : (await api.createMatch(fields)).match_id;
      router.push(`/match/${id}`);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <section aria-labelledby="f-file" className="panel border-2 border-dashed !border-line-strong">
        <h2 id="f-file" className="heading text-[22px]">
          {editing ? "Remplacer le fichier SGF" : "Fichier SGF"}
        </h2>
        <p className="text-base text-pebble">
          {editing ? "Facultatif : laissez vide pour garder le fichier actuel." : "Le fichier de la partie, exporté depuis un serveur de go ou un éditeur de kifu."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="f-sgf" className="btn btn-primary !min-h-12 cursor-pointer">
            Choisir un fichier
          </label>
          <input id="f-sgf" type="file" accept=".sgf,application/x-go-sgf,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
          <span role="status" className="text-base">
            {sgf ? (
              <>
                <strong>{sgf.name}</strong> · {sgf.moves} coups
              </>
            ) : (
              <span className="text-pebble">Aucun fichier choisi</span>
            )}
          </span>
        </div>
        {submitted && missingSgf && <p className="field-error">Choisissez un fichier SGF.</p>}
        {sgf && sgf.moves === 0 && <p className="field-error">Ce fichier ne contient aucun coup lisible.</p>}
      </section>

      <section aria-labelledby="f-info" className="panel !gap-4">
        <h2 id="f-info" className="heading text-[22px]">
          Informations
        </h2>
        <div className="field-group">
          <label htmlFor="f-title" className="label">
            Titre
          </label>
          <input
            id="f-title"
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={(submitted && !title.trim()) || undefined}
            placeholder="Partie du club, mardi"
          />
          {submitted && !title.trim() && <span className="field-error">À indiquer</span>}
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <PlayerSelect id="f-black" label="Noir" color="B" players={players} value={black} onChange={setBlack} onCreated={addPlayer} invalid={submitted && black === null} />
          <PlayerSelect id="f-white" label="Blanc" color="W" players={players} value={white} onChange={setWhite} onCreated={addPlayer} invalid={submitted && white === null} />
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          <div className="field-group">
            <label htmlFor="f-result" className="label">
              Résultat
            </label>
            <select id="f-result" className="field pr-9" value={result} onChange={(e) => setResult(e.target.value)}>
              {RESULTS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="f-style" className="label">
              Type de partie
            </label>
            <select id="f-style" className="field pr-9" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
              {!STYLES.some((s) => s.value === style) && <option value={style}>{style}</option>}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="f-date" className="label">
              Date
            </label>
            <input id="f-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </section>

      {error && (
        <Notice type="error" title="Enregistrement impossible.">
          {error}
        </Notice>
      )}

      <div className="action-bar">
        <Link href={match ? `/match/${match.match_id}` : "/matches"} className="link-strong">
          Annuler
        </Link>
        <button type="submit" className="btn btn-primary text-[18px]" disabled={busy}>
          {busy ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Importer la partie"}
        </button>
      </div>
    </form>
  );
}
