"use client";

import MatchForm from "@/components/MatchForm";
import { PageTitle } from "@/components/ui";

export default function ImportMatchPage() {
  return (
    <main id="contenu" className="shell flex max-w-[860px] flex-col gap-6 pb-16 pt-1">
      <PageTitle back={{ href: "/matches", label: "Mes parties" }} title="Importer un SGF" lead="Ajoutez une partie déjà enregistrée pour la rejouer et l'analyser." />
      <MatchForm />
    </main>
  );
}
