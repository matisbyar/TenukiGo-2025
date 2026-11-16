"use client";

import Link from "next/link";
import BoardThumbnail from "@/components/BoardThumbnail";
import { Stone } from "@/components/ui";
import { sgfPath, type MatchSummary } from "@/lib/api";
import { isTournament, resultLabel, shortDate } from "@/lib/format";

function sourceLabel(m: MatchSummary) {
  if (isTournament(m.style)) return "tournoi";
  if (m.video_id) return "vidéo";
  return m.style || "";
}

/** One match in a list: board thumbnail, players, date and status. */
export default function MatchRow({ match }: { match: MatchSummary }) {
  const details = [shortDate(match.date), sourceLabel(match), resultLabel(match.result)].filter(Boolean).join(" · ");
  return (
    <Link href={`/match/${match.match_id}`} className="lift flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-white p-3.5 text-ink no-underline hover:text-ink">
      <BoardThumbnail sgf={sgfPath(match)} className="size-[78px] flex-none rounded-md" />
      <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <strong className="text-[19px]">{match.title}</strong>
        <span className="flex flex-wrap gap-3 text-[15px]">
          <span className="inline-flex items-center gap-1.5">
            <Stone color="B" size={12} />
            {match.black ?? "Joueur inconnu"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Stone color="W" size={12} />
            {match.white ?? "Joueur inconnu"}
          </span>
        </span>
        <span className="text-[15px] text-pebble">{details}</span>
      </span>
      {sgfPath(match) ? (
        <span className="pill pill-outline-jade">
          <span aria-hidden="true">✓ </span>Prête
        </span>
      ) : (
        <span className="pill pill-outline-honey">
          <span aria-hidden="true">▲ </span>Sans SGF
        </span>
      )}
    </Link>
  );
}
