"use client";

import { useParams } from "next/navigation";
import PlayerForm from "@/components/PlayerForm";
import { Loaded, PageTitle } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

export default function EditPlayerPage() {
  const { playerid } = useParams<{ playerid: string }>();
  const state = useLoad(() => api.player(playerid), [playerid]);

  return (
    <main id="contenu" className="shell flex max-w-[860px] flex-col gap-6 pb-16 pt-1">
      <PageTitle back={{ href: `/player/${playerid}`, label: "Retour au joueur" }} title="Modifier le joueur" />
      <Loaded state={state}>{(player) => <PlayerForm player={player} />}</Loaded>
    </main>
  );
}
