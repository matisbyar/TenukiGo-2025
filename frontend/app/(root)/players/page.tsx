"use client";

import Link from "next/link";
import { EmptyState, Loaded, PageTitle } from "@/components/ui";
import { api, useLoad } from "@/lib/api";
import { initials, playerName } from "@/lib/format";

export default function PlayersPage() {
  const state = useLoad(() => api.players(), []);

  return (
    <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-1">
      <PageTitle
        back={{ href: "/matches", label: "Mes parties" }}
        title="Joueurs"
        lead="Les joueurs de vos parties et de vos tournois."
        actions={
          <Link href="/upload/player" className="btn btn-primary">
            Ajouter un joueur
          </Link>
        }
      />
      <Loaded state={state} label="Chargement des joueurs…">
        {(players) =>
          players.length === 0 ? (
            <EmptyState title="Aucun joueur pour le moment">Ajoutez les joueurs pour pouvoir enregistrer leurs parties.</EmptyState>
          ) : (
            <ul className="grid list-none gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
              {players.map((p) => {
                const name = playerName(p);
                return (
                  <li key={p.player_id}>
                    <Link href={`/player/${p.player_id}`} className="lift flex items-center gap-3.5 rounded-3xl border border-line bg-white p-3.5 text-ink no-underline hover:text-ink">
                      <span aria-hidden="true" className="flex size-[52px] flex-none items-center justify-center rounded-full bg-amber font-extrabold">
                        {initials(name)}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[18px]">{name}</strong>
                        <span className="text-[15px] text-pebble">{p.level || "Niveau non renseigné"}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        }
      </Loaded>
    </main>
  );
}
