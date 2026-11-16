"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MatchRow from "@/components/MatchRow";
import { EmptyState, Loaded, PageTitle } from "@/components/ui";
import { api, sgfPath, useLoad, type MatchSummary } from "@/lib/api";
import { playerName, plural } from "@/lib/format";

export default function MatchesPage() {
  const state = useLoad(async () => {
    const [matches, players] = await Promise.all([api.matches(), api.players().catch(() => [])]);
    return { matches, players };
  }, []);
  const [query, setQuery] = useState("");

  return (
    <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-6 md:pt-10">
      <PageTitle
        title="Mes parties"
        lead="Parties enregistrées par photos, en tournoi ou importées en SGF."
        actions={
          <>
            <Link href="/upload/match" className="btn btn-outline">
              Importer un SGF
            </Link>
            <Link href="/record" className="btn btn-primary">
              Enregistrer une partie
            </Link>
          </>
        }
      />

      <Loaded state={state} label="Chargement des parties…">
        {({ matches, players }) => <Library matches={matches} players={players} query={query} setQuery={setQuery} />}
      </Loaded>
    </main>
  );
}

function Library({
  matches,
  players,
  query,
  setQuery,
}: {
  matches: MatchSummary[];
  players: Awaited<ReturnType<typeof api.players>>;
  query: string;
  setQuery: (q: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => [m.title, m.black, m.white].some((v) => v?.toLowerCase().includes(q)));
  }, [matches, query]);

  // Most frequent players, computed from the names returned by GET /matches.
  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) for (const name of [m.black, m.white]) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, id: players.find((p) => playerName(p) === name)?.player_id }));
  }, [matches, players]);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-4">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-3 rounded-[28px] border border-line bg-white p-[18px]">
          <div className="field-group flex-[1_1_260px]">
            <label htmlFor="q" className="label">
              Rechercher
            </label>
            <input id="q" type="search" placeholder="Titre ou joueur" className="field !min-h-12" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="show" className="label">
              Afficher
            </label>
            {/* Sharing needs user accounts, which the backend does not have yet. */}
            <select id="show" className="field !min-h-12 pr-9" defaultValue="all">
              <option value="all">Toutes les parties</option>
              <option disabled>Partagées avec moi (bientôt)</option>
              <option disabled>Parties publiques (bientôt)</option>
            </select>
          </div>
        </form>

        <p role="status" className="font-bold">
          {plural(filtered.length, "partie")}
        </p>

        {matches.length === 0 ? (
          <EmptyState
            title="Aucune partie pour le moment"
            action={
              <Link href="/record" className="btn btn-primary">
                Enregistrer une partie
              </Link>
            }
          >
            Enregistrez une partie à partir de photos du plateau, ou importez un fichier SGF.
          </EmptyState>
        ) : filtered.length === 0 ? (
          <p className="text-pebble">Aucune partie ne correspond à « {query} ».</p>
        ) : (
          <ul className="flex list-none flex-col gap-3">
            {filtered.map((m) => (
              <li key={m.match_id}>
                <MatchRow match={m} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="flex flex-[1_1_280px] flex-col gap-5">
        <section aria-labelledby="frequent" className="panel !gap-2.5">
          <h2 id="frequent" className="heading text-[18px]">
            Joueurs fréquents
          </h2>
          {frequent.length === 0 ? (
            <p className="text-[15px] text-pebble">Les joueurs de vos parties apparaîtront ici.</p>
          ) : (
            <ul className="flex list-none flex-col gap-1 text-base">
              {frequent.map((f) => (
                <li key={f.name}>
                  <Link href={f.id ? `/player/${f.id}` : "/players"} className="flex min-h-10 items-center justify-between gap-3">
                    {f.name} <span className="text-pebble">{plural(f.count, "partie")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/players" className="link-strong">
            Tous les joueurs
          </Link>
        </section>
      </aside>
    </div>
  );
}
