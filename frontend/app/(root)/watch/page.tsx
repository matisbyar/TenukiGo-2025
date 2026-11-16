"use client";

import Link from "next/link";
import { MiniBoard } from "@/components/BoardThumbnail";
import { DevBanner, EmptyState, Loaded, PageTitle, Stone } from "@/components/ui";
import { useLoad } from "@/lib/api";
import { boardHistory, parseSgf } from "@/lib/go";
import { loadTables } from "@/lib/matches";

export default function WatchListPage() {
  const state = useLoad(loadTables, []);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-8">
        <PageTitle title="En direct" lead="Les parties filmées en ce moment : la vidéo de la table et le goban, coup par coup. Visible sans compte." />
        <Loaded state={state} label="Recherche des tables en direct…">
          {(tables) =>
            tables.length === 0 ? (
              <EmptyState
                title="Aucune partie en direct"
                action={
                  <Link href="/tournaments/new" className="btn btn-outline">
                    Diffuser un tournoi
                  </Link>
                }
              >
                Les tables filmées apparaîtront ici dès qu&apos;une ronde sera lancée.
              </EmptyState>
            ) : (
              <ul className="grid list-none gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
                {tables.map((t) => {
                  const history = boardHistory(parseSgf(t.sgf));
                  return (
                    <li key={t.stream.stream_id}>
                      <Link href={`/watch/${t.stream.stream_id}`} className="lift flex flex-col gap-3.5 rounded-3xl bg-white p-4 text-ink no-underline hover:text-ink">
                        <div className="h-[170px] overflow-hidden rounded-2xl bg-wood">
                          <MiniBoard board={history[history.length - 1]} className="mx-auto h-full" />
                        </div>
                        <span className="flex flex-col gap-1.5">
                          <span className="flex items-center justify-between gap-2.5">
                            <strong className="text-[18px]">{t.stream.title ?? "Partie en direct"}</strong>
                            <span className="live-badge flex-none">EN DIRECT</span>
                          </span>
                          <span className="flex flex-wrap gap-3 text-[15px]">
                            <span className="inline-flex items-center gap-1.5">
                              <Stone color="B" size={12} />
                              {t.stream.black ?? "Joueur inconnu"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Stone color="W" size={12} />
                              {t.stream.white ?? "Joueur inconnu"}
                            </span>
                          </span>
                          <span className="text-[15px] text-pebble">{t.moveCount > 0 ? `Coup ${t.moveCount}` : "La partie commence"}</span>
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
    </>
  );
}
