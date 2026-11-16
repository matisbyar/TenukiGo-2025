"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AnalysisView from "@/components/AnalysisView";
import { Loaded, Notice } from "@/components/ui";
import { playerNameWithLevel } from "@/lib/format";
import { useFullMatch } from "@/lib/matches";

export default function AnalyzeMatchPage() {
  const { matchid } = useParams<{ matchid: string }>();
  const state = useFullMatch(matchid);

  return (
    <main id="contenu" className="shell pb-16 pt-1">
      <Loaded state={state} label="Chargement de la partie…">
        {(match) =>
          match.sgf ? (
            <AnalysisView
              sgf={match.sgf}
              title={match.detail.title}
              black={playerNameWithLevel(match.black)}
              white={playerNameWithLevel(match.white)}
              matchId={match.detail.match_id}
              back={{ href: `/match/${matchid}`, label: "Retour à la partie" }}
            />
          ) : (
            <Notice
              type="warning"
              title="Pas de SGF."
              action={
                <Link href={`/match/${matchid}/edit`} className="btn btn-thin font-bold">
                  Ajouter un fichier
                </Link>
              }
            >
              Cette partie n&apos;a pas de fichier SGF à analyser.
            </Notice>
          )
        }
      </Loaded>
    </main>
  );
}
