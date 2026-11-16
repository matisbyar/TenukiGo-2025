"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import PlayerSelect from "@/components/PlayerSelect";
import { DevBanner, Loaded, Notice, PageTitle, Spinner } from "@/components/ui";
import { api, messageOf, ORGANIZER_PASSWORD, useLoad, type Player, type StreamSummary } from "@/lib/api";
import { defaultStreamUrl, readTournament, saveTournament, streamTitle, tableNumber } from "@/lib/tournament";

interface Row {
  key: number;
  number: number;
  blackId: number | null;
  whiteId: number | null;
  url: string;
  /** Set once the table has been started (stream created). */
  streamId?: number;
  error?: string;
}

function StepHeading({ id, number, children }: { id: string; number: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="heading flex items-center gap-3 text-[22px]">
      <span aria-hidden="true" className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-ink text-base text-white">
        {number}
      </span>
      {children}
    </h2>
  );
}

export default function NewTournamentPage() {
  const state = useLoad(async () => {
    const [players, streams] = await Promise.all([api.players(), api.streams().catch(() => [])]);
    return { players, streams };
  }, []);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-4">
        <PageTitle
          back={{ href: "/tournaments", label: "Tournois" }}
          title="Créer un tournoi"
          lead="Chaque table filmée a son boîtier caméra. Les joueurs s'installent et jouent normalement : la partie est calculée en direct."
        />
        <Loaded state={state}>{({ players, streams }) => <TournamentForm initialPlayers={players} streams={streams} />}</Loaded>
      </main>
    </>
  );
}

function TournamentForm({ initialPlayers, streams }: { initialPlayers: Player[]; streams: StreamSummary[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [name, setName] = useState("");
  const [round, setRound] = useState("1");
  const firstFree = Math.max(0, ...streams.map(tableNumber)) + 1;
  const [rows, setRows] = useState<Row[]>([{ key: 0, number: firstFree, blackId: null, whiteId: null, url: defaultStreamUrl(firstFree) }]);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const nextKey = useRef(1);

  // Remember the tournament of the last round on this browser.
  useEffect(() => {
    const saved = readTournament();
    if (saved) {
      setName(saved.name);
      setRound(saved.round);
    }
  }, []);

  const update = (key: number, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((list) => {
      const number = Math.max(firstFree - 1, ...list.map((r) => r.number)) + 1;
      return [...list, { key: nextKey.current++, number, blackId: null, whiteId: null, url: defaultStreamUrl(number) }];
    });

  const pending = rows.filter((r) => r.streamId === undefined);
  const incomplete = pending.filter((r) => r.blackId === null || r.whiteId === null || !r.url.trim());
  const summary = !name.trim()
    ? "Le nom du tournoi est à indiquer"
    : incomplete.length > 0
      ? `Table ${incomplete[0].number} : ${incomplete[0].blackId === null || incomplete[0].whiteId === null ? "un joueur" : "l'adresse de la caméra"} à compléter`
      : pending.length === 0
        ? "Toutes les tables sont lancées"
        : `${pending.length} table${pending.length > 1 ? "s" : ""} prête${pending.length > 1 ? "s" : ""}`;

  const launch = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (!name.trim() || incomplete.length > 0 || pending.length === 0) return;
    // Same protection as the existing stream page: a shared password checked in the browser.
    if (ORGANIZER_PASSWORD && password !== ORGANIZER_PASSWORD) {
      setError("Mot de passe organisateur incorrect.");
      return;
    }
    const tournament = { name: name.trim(), round: round.trim() || "1" };
    saveTournament(tournament);
    setLaunching(true);
    let failures = 0;
    for (const row of pending) {
      try {
        const { stream_id } = await api.createStream({
          title: streamTitle(tournament, row.number),
          style: "tournoi",
          black: row.blackId!,
          white: row.whiteId!,
          url: row.url.trim(),
        });
        update(row.key, { streamId: stream_id, error: undefined });
      } catch (err) {
        failures++;
        update(row.key, { error: messageOf(err) });
      }
    }
    setLaunching(false);
    if (failures === 0) router.push("/tournaments");
    else setError(`${failures} table${failures > 1 ? "s n'ont" : " n'a"} pas pu être lancée${failures > 1 ? "s" : ""}. Corrigez puis relancez : les tables déjà lancées ne le seront pas deux fois.`);
  };

  return (
    <form onSubmit={launch} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
          <section aria-labelledby="d-tournament" className="panel !gap-4 !p-[26px]">
            <StepHeading id="d-tournament" number={1}>
              Le tournoi
            </StepHeading>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              <div className="field-group sm:col-span-2">
                <label htmlFor="d-name" className="label">
                  Nom
                </label>
                <input id="d-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Open de Nantes 2026" aria-invalid={(submitted && !name.trim()) || undefined} />
                {submitted && !name.trim() && <span className="field-error">À indiquer</span>}
              </div>
              <div className="field-group">
                <label htmlFor="d-round" className="label">
                  Ronde
                </label>
                <input id="d-round" className="field" inputMode="numeric" value={round} onChange={(e) => setRound(e.target.value)} />
              </div>
            </div>
          </section>

          <section aria-labelledby="d-tables" className="panel !gap-3.5 !p-[26px]">
            <StepHeading id="d-tables" number={2}>
              Les tables filmées
            </StepHeading>
            <p className="text-base text-pebble">Une table = une caméra. Indiquez les joueurs et l&apos;adresse du flux vidéo (HLS) de son boîtier.</p>
            <ul className="flex list-none flex-col gap-3">
              {rows.map((row) => {
                const started = row.streamId !== undefined;
                const missing = submitted && !started && (row.blackId === null || row.whiteId === null || !row.url.trim());
                return (
                  <li key={row.key} className={`flex flex-col gap-3 rounded-[20px] p-3.5 ${missing || row.error ? "bg-honey" : "border border-line"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[18px] font-extrabold">Table {row.number}</h3>
                      {started ? (
                        <span className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-jade">
                            <span aria-hidden="true">✓ </span>Lancée
                          </span>
                          <Link href={`/tournaments/tables/${row.streamId}/calibration`}>
                            Calibrer<span className="sr-only"> la table {row.number}</span>
                          </Link>
                        </span>
                      ) : (
                        rows.length > 1 && (
                          <button type="button" className="btn-link !min-h-9 !p-0 text-[15px]" onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}>
                            Retirer<span className="sr-only"> la table {row.number}</span>
                          </button>
                        )
                      )}
                    </div>
                    <fieldset disabled={started} className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
                      <legend className="sr-only">Table {row.number}</legend>
                      <PlayerSelect
                        id={`t${row.key}-black`}
                        label="Noir"
                        color="B"
                        players={players}
                        value={row.blackId}
                        onChange={(blackId) => update(row.key, { blackId })}
                        onCreated={(p) => setPlayers((list) => [...list, p])}
                        invalid={submitted && !started && row.blackId === null}
                      />
                      <PlayerSelect
                        id={`t${row.key}-white`}
                        label="Blanc"
                        color="W"
                        players={players}
                        value={row.whiteId}
                        onChange={(whiteId) => update(row.key, { whiteId })}
                        onCreated={(p) => setPlayers((list) => [...list, p])}
                        invalid={submitted && !started && row.whiteId === null}
                      />
                      <div className="field-group sm:col-span-2">
                        <label htmlFor={`t${row.key}-url`} className="label">
                          Caméra (adresse du flux)
                        </label>
                        <input
                          id={`t${row.key}-url`}
                          type="url"
                          className="field font-mono !text-[15px]"
                          value={row.url}
                          onChange={(e) => update(row.key, { url: e.target.value })}
                          aria-invalid={(submitted && !started && !row.url.trim()) || undefined}
                        />
                      </div>
                    </fieldset>
                    {row.error && (
                      <p role="alert" className="field-error">
                        <span aria-hidden="true">▲ </span>
                        {row.error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-outline !min-h-12 self-start !px-[18px]" onClick={addRow}>
              + Ajouter une table
            </button>
          </section>
        </div>

        <aside className="flex flex-[1_1_320px] flex-col gap-5">
          <section aria-labelledby="d-running" className="panel !gap-3">
            <h2 id="d-running" className="heading text-[18px]">
              Tables déjà en direct
            </h2>
            {streams.length === 0 ? (
              <p className="text-[15px] text-pebble">Aucune table n&apos;est lancée pour le moment.</p>
            ) : (
              <ul className="flex list-none flex-col gap-2 text-base">
                {streams.map((s) => (
                  <li key={s.stream_id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-jade-light px-3 py-2.5">
                    <span className="min-w-0">
                      <strong>Table {tableNumber(s)}</strong> · {s.title}
                    </span>
                    <Link href={`/tournaments/tables/${s.stream_id}/calibration`} className="font-bold !text-jade">
                      Recalibrer<span className="sr-only"> la table {tableNumber(s)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[15px] text-pebble">Les boîtiers ne sont pas encore détectés automatiquement. Pas de boîtier ? Un téléphone sur support peut servir de caméra.</p>
          </section>
          <section aria-labelledby="d-video" className="panel panel-cream !gap-2.5">
            <h2 id="d-video" className="heading text-[18px]">
              Vidéo non conservée
            </h2>
            <p className="text-base">La vidéo sert au calcul et à la diffusion. À la fin de la ronde, seules les parties calculées (SGF) sont gardées.</p>
          </section>
        </aside>
      </div>

      {error && (
        <Notice type="error" title="Ronde non lancée.">
          {error}
        </Notice>
      )}

      <div className="action-bar">
        <Link href="/tournaments" className="link-strong">
          Annuler
        </Link>
        <span role="status" className="text-pebble">
          {summary}
        </span>
        <div className="flex flex-wrap items-end gap-3">
          {ORGANIZER_PASSWORD && (
            <div className="field-group">
              <label htmlFor="d-password" className="text-[15px] font-bold">
                Mot de passe organisateur
              </label>
              <input id="d-password" type="password" className="field !min-h-12 w-[220px]" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </div>
          )}
          <button type="submit" className="btn btn-amber min-h-14 !px-[30px] text-[19px]" disabled={launching}>
            {launching ? (
              <>
                <Spinner /> Lancement…
              </>
            ) : (
              "Lancer la ronde"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
