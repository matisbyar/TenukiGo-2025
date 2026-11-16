"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink, Loaded, Stone } from "@/components/ui";
import { api, useLoad, type MatchSummary, type PlayerProfile } from "@/lib/api";
import { initials, playerName, shortDate, winnerOf } from "@/lib/format";
import type { Color } from "@/lib/go";

interface PlayedMatch {
  match: MatchSummary;
  color: Color;
  opponent: string;
  outcome: "win" | "loss" | "draw" | null;
}

/** GET /player/{id} gives match ids, GET /matches gives their details: both are joined here. */
function playedMatches(player: PlayerProfile, matches: MatchSummary[]): PlayedMatch[] {
  const name = playerName(player);
  return matches
    .filter((m) => player.matches.includes(m.match_id))
    .map((match) => {
      // Names are the only link in GET /matches; a player facing a namesake is counted as Black.
      const color: Color = match.black === name ? "B" : "W";
      const winner = winnerOf(match.result);
      const outcome = winner === null ? null : winner === "draw" ? "draw" : winner === color ? "win" : "loss";
      return { match, color, opponent: (color === "B" ? match.white : match.black) ?? "joueur inconnu", outcome };
    });
}

export default function PlayerPage() {
  const { playerid } = useParams<{ playerid: string }>();
  const state = useLoad(async () => {
    const [player, matches] = await Promise.all([api.player(playerid), api.matches().catch(() => [])]);
    return { player, played: playedMatches(player, matches) };
  }, [playerid]);

  return (
    <main id="contenu" className="shell flex flex-col gap-3 pb-16 pt-1">
      <div>
        <BackLink href="/players">Joueurs</BackLink>
      </div>
      <Loaded state={state} label="Chargement du joueur…">
        {({ player, played }) => <Profile player={player} played={played} />}
      </Loaded>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-[28px] font-extrabold">{value}</dd>
    </div>
  );
}

function Profile({ player, played }: { player: PlayerProfile; played: PlayedMatch[] }) {
  const name = playerName(player);
  const decided = played.filter((p) => p.outcome === "win" || p.outcome === "loss");
  const wins = decided.filter((p) => p.outcome === "win").length;
  const losses = decided.length - wins;
  const rate = decided.length > 0 ? Math.round((wins / decided.length) * 100) : null;
  const byColor = (color: Color) => {
    const games = decided.filter((p) => p.color === color);
    const won = games.filter((p) => p.outcome === "win").length;
    return `${won} victoire${won > 1 ? "s" : ""} sur ${games.length}`;
  };

  return (
    <>
      <section aria-labelledby="pl-name" className="banner flex flex-wrap items-center justify-between gap-7">
        <div className="flex items-center gap-[18px]">
          <span aria-hidden="true" className="flex size-[76px] flex-none items-center justify-center rounded-full bg-amber text-[28px] font-extrabold">
            {initials(name)}
          </span>
          <div>
            <h1 id="pl-name" className="heading text-[34px]">
              {name}
            </h1>
            <p className="mt-1 text-ink-soft">{player.level || "Niveau non renseigné"}</p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-8">
          <Stat label="Parties" value={player.count_matches} />
          <Stat label="Victoires" value={wins} />
          <Stat label="Défaites" value={losses} />
        </dl>
      </section>

      <div className="mt-2.5 flex flex-wrap items-start gap-[22px]">
        <section aria-labelledby="pl-matches" className="panel min-w-0 flex-[999_1_560px] !gap-3">
          <h2 id="pl-matches" className="heading text-[20px]">
            Dernières parties
          </h2>
          {played.length === 0 ? (
            <p className="text-pebble">Ce joueur n&apos;a pas encore de partie enregistrée.</p>
          ) : (
            <ul className="flex list-none flex-col gap-2.5">
              {played.map(({ match, color, opponent, outcome }) => (
                <li key={match.match_id}>
                  <Link href={`/match/${match.match_id}`} className="flex flex-wrap items-center gap-3.5 rounded-[20px] border border-line px-3.5 py-3 text-ink no-underline hover:text-ink">
                    <Stone color={color} size={22} />
                    <span className="flex-[1_1_200px]">
                      <strong>{match.title}</strong>
                      <br />
                      <span className="text-[15px] text-pebble">
                        {color === "B" ? "Noir" : "Blanc"} contre {opponent} · {shortDate(match.date)}
                      </span>
                    </span>
                    {outcome === "win" && <span className="pill pill-outline-jade">Victoire</span>}
                    {outcome === "loss" && <span className="pill pill-outline-gray">Défaite</span>}
                    {outcome === "draw" && <span className="pill pill-outline-gray">Nulle</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pl-summary" className="panel flex-[1_1_300px]">
          <h2 id="pl-summary" className="heading text-[20px]">
            Bilan
          </h2>
          {rate === null ? (
            <p className="text-pebble">Pas encore de partie avec un résultat.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <p className="text-base">
                  <strong>{rate} %</strong> de victoires
                </p>
                <div aria-hidden="true" className="flex h-3.5 overflow-hidden rounded-[7px] border-[1.5px] border-ink">
                  <span className="bg-jade" style={{ width: `${rate}%` }} />
                  <span className="bg-white" style={{ width: `${100 - rate}%` }} />
                </div>
              </div>
              <ul className="flex list-none flex-col gap-2 text-base">
                <li className="flex justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Stone color="B" size={14} />
                    Avec Noir
                  </span>
                  <span>{byColor("B")}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Stone color="W" size={14} />
                    Avec Blanc
                  </span>
                  <span>{byColor("W")}</span>
                </li>
              </ul>
            </>
          )}
          <Link href={`/player/${player.player_id}/edit`} className="link-strong">
            Modifier le joueur
          </Link>
        </section>
      </div>
    </>
  );
}
