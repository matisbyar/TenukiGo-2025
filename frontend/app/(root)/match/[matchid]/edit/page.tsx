"use client";

import { useParams } from "next/navigation";
import MatchForm from "@/components/MatchForm";
import { Loaded, PageTitle } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

export default function EditMatchPage() {
  const { matchid } = useParams<{ matchid: string }>();
  const state = useLoad(() => api.match(matchid), [matchid]);

  return (
    <main id="contenu" className="shell flex max-w-[860px] flex-col gap-6 pb-16 pt-1">
      <PageTitle back={{ href: `/match/${matchid}`, label: "Retour à la partie" }} title="Modifier les informations" />
      <Loaded state={state}>{(match) => <MatchForm match={match} />}</Loaded>
    </main>
  );
}
