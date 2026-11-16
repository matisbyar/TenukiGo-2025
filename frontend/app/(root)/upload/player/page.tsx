"use client";

import PlayerForm from "@/components/PlayerForm";
import { PageTitle } from "@/components/ui";

export default function NewPlayerPage() {
  return (
    <main id="contenu" className="shell flex max-w-[860px] flex-col gap-6 pb-16 pt-1">
      <PageTitle back={{ href: "/players", label: "Joueurs" }} title="Ajouter un joueur" />
      <PlayerForm />
    </main>
  );
}
