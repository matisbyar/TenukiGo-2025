"use client";

import Link from "next/link";
import { useState } from "react";
import AnalysisView from "@/components/AnalysisView";
import BoardThumbnail from "@/components/BoardThumbnail";
import { Loaded, PageTitle } from "@/components/ui";
import { api, sgfPath, useLoad } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { parseSgf } from "@/lib/go";

/** Entry point of the "Analyser" section: pick a saved match, or open an SGF file without saving it. */
export default function AnalyzePage() {
  const matches = useLoad(() => api.matches(), []);
  const [local, setLocal] = useState<{ name: string; sgf: string } | null>(null);
  const [fileError, setFileError] = useState("");

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const sgf = await file.text();
    if (parseSgf(sgf).moves.length === 0) {
      setFileError("Ce fichier ne contient aucun coup lisible.");
      return;
    }
    setFileError("");
    setLocal({ name: file.name.replace(/\.sgf$/i, ""), sgf });
  };

  if (local) {
    const info = parseSgf(local.sgf).info;
    return (
      <main id="contenu" className="shell flex flex-col gap-4 pb-16 pt-1">
        <AnalysisView sgf={local.sgf} title={info.GN || local.name} black={info.PB} white={info.PW} back={{ href: "/matches", label: "Mes parties" }} />
        <button type="button" className="btn btn-thin self-start font-bold" onClick={() => setLocal(null)}>
          Analyser une autre partie
        </button>
      </main>
    );
  }

  return (
    <main id="contenu" className="shell flex flex-col gap-6 pb-16 pt-6 md:pt-10">
      <PageTitle title="Analyser" lead="Revoyez vos choix : l'analyse propose, pour chaque position, les coups que vous auriez pu jouer." />

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="an-saved" className="panel min-w-0 flex-[999_1_560px] !gap-3">
          <h2 id="an-saved" className="heading text-[22px]">
            Choisir une partie enregistrée
          </h2>
          <Loaded state={matches} label="Chargement des parties…">
            {(list) => {
              const ready = list.filter((m) => sgfPath(m));
              return ready.length === 0 ? (
                <p className="text-pebble">
                  Aucune partie avec un SGF pour le moment. <Link href="/record">Enregistrez une partie</Link> ou ouvrez un fichier.
                </p>
              ) : (
                <ul className="flex list-none flex-col gap-2.5">
                  {ready.map((m) => (
                    <li key={m.match_id}>
                      <Link href={`/match/${m.match_id}/analyze`} className="flex items-center gap-3.5 rounded-[20px] border border-line p-2.5 text-ink no-underline hover:bg-sand hover:text-ink">
                        <BoardThumbnail sgf={sgfPath(m)} className="size-14 flex-none rounded" />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate">{m.title}</strong>
                          <span className="text-[15px] text-pebble">{[shortDate(m.date), m.black, m.white].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="link-strong hidden text-clay underline sm:inline">Analyser</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            }}
          </Loaded>
        </section>

        <aside className="flex flex-[1_1_300px] flex-col gap-5">
          <section aria-labelledby="an-file" className="panel border-2 border-dashed !border-line-strong">
            <h2 id="an-file" className="heading text-[18px]">
              Ouvrir un fichier SGF
            </h2>
            <p className="text-[15px] text-pebble">Pour analyser une partie sans l&apos;enregistrer dans vos parties.</p>
            <label htmlFor="an-sgf" className="btn btn-primary !min-h-12 cursor-pointer self-start">
              Choisir un fichier
            </label>
            <input id="an-sgf" type="file" accept=".sgf,application/x-go-sgf,text/plain" className="sr-only" onChange={(e) => openFile(e.target.files?.[0])} />
            {fileError && (
              <p role="alert" className="field-error">
                {fileError}
              </p>
            )}
          </section>
          <section aria-labelledby="an-photo" className="panel panel-cream">
            <h2 id="an-photo" className="heading text-[18px]">
              Depuis des photos
            </h2>
            <p className="text-base">Quelques photos du plateau suffisent : chaque photo devient une position clé à analyser.</p>
            <Link href="/record" className="link-strong">
              Enregistrer ma partie
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
