"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DevBanner, EmptyState, Loaded } from "@/components/ui";
import { useLoad } from "@/lib/api";
import { longDate, plural } from "@/lib/format";
import { loadTables, type TableInfo } from "@/lib/matches";
import { tableNumber, useTournament } from "@/lib/tournament";

type Filter = "all" | "check" | "running" | "finished";

/** The backend reports no table status: a table with no detected move is the one signal that it needs a look. */
const needsCheck = (t: TableInfo) => t.moveCount === 0;

export default function ControlRoomPage() {
  const state = useLoad(loadTables, []);
  const { reload } = state;

  // The control room refreshes on its own while it is open.
  useEffect(() => {
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <>
      <DevBanner>La diffusion en direct est en cours de test.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-[22px] pb-16 pt-9">
        <Loaded state={state} label="Chargement des tables…">
          {(tables) => <ControlRoom tables={tables} />}
        </Loaded>
      </main>
    </>
  );
}

function ControlRoom({ tables }: { tables: TableInfo[] }) {
  const tournament = useTournament();
  const [filter, setFilter] = useState<Filter>("all");
  // Tables to check come first.
  const sorted = [...tables].sort((a, b) => Number(needsCheck(b)) - Number(needsCheck(a)) || tableNumber(a.stream) - tableNumber(b.stream));
  const toCheck = sorted.filter(needsCheck);
  const running = sorted.filter((t) => !needsCheck(t));
  const shown = filter === "check" ? toCheck : filter === "running" ? running : filter === "finished" ? [] : sorted;
  const firstDate = tables.map((t) => t.stream.date).find(Boolean);

  const filters: { value: Filter; label: string; alert?: boolean }[] = [
    { value: "all", label: `Toutes (${tables.length})` },
    { value: "check", label: `▲ À contrôler (${toCheck.length})`, alert: true },
    { value: "running", label: `En cours (${running.length})` },
    { value: "finished", label: "Terminées (0)" },
  ];

  return (
    <>
      <section aria-labelledby="r-event" className="banner flex flex-wrap items-center justify-between gap-5 !py-6">
        <div>
          <p className="text-[15px] font-bold text-ink-soft">Régie</p>
          <h1 id="r-event" className="heading mb-1.5 mt-0.5 text-[clamp(26px,4.5vw,32px)]">
            {tournament ? `${tournament.name} · ronde ${tournament.round}` : "Tables en direct"}
          </h1>
          <p className="text-ink-soft">
            {plural(tables.length, "table filmée", "tables filmées")}
            {firstDate && ` · ${longDate(firstDate)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/watch" className="btn btn-white !min-h-12 !px-[18px]">
            Sortie pour la diffusion
          </Link>
          <Link href="/tournaments/new" className="btn btn-amber !min-h-12 !px-5">
            Gérer les tables
          </Link>
        </div>
      </section>

      {tables.length === 0 ? (
        <EmptyState
          title="Aucune table filmée pour le moment"
          action={
            <Link href="/tournaments/new" className="btn btn-primary">
              Créer un tournoi
            </Link>
          }
        >
          Créez un tournoi et lancez une ronde : chaque table filmée apparaîtra ici.
        </EmptyState>
      ) : (
        <>
          {toCheck.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center gap-3.5 rounded-[14px] border-[3px] border-danger bg-danger-light px-5 py-4">
              <svg width={26} height={26} viewBox="0 0 22 22" aria-hidden="true" className="flex-none">
                <path d="M11 2l10 18H1z" fill="#B3261E" />
                <path d="M11 8v6M11 16v1" stroke="#FFFFFF" strokeWidth={2.2} />
              </svg>
              <p className="flex-[1_1_360px]">
                <strong>{toCheck.length > 1 ? `${toCheck.length} tables demandent votre attention.` : "1 table demande votre attention."}</strong>{" "}
                {toCheck
                  .slice(0, 3)
                  .map((t) => `Table ${tableNumber(t.stream)} : aucun coup détecté.`)
                  .join(" ")}
              </p>
              <Link href={`/tournaments/tables/${toCheck[0].stream.stream_id}`} className="btn btn-red !min-h-12 !px-[18px]">
                Contrôler la table {tableNumber(toCheck[0].stream)}
              </Link>
            </div>
          )}

          <div role="radiogroup" aria-label="Filtrer les tables" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <label key={f.value} className={`segment ${f.alert && filter !== f.value ? "!border-2 !border-danger !text-danger" : ""}`}>
                <input type="radio" name="filter" className="sr-only" checked={filter === f.value} onChange={() => setFilter(f.value)} />
                {f.label}
              </label>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[28px] border border-line bg-white">
            <table className="data-table min-w-[820px]">
              <caption className="sr-only">Tables filmées, les tables à contrôler en premier</caption>
              <thead>
                <tr>
                  <th scope="col">Table</th>
                  <th scope="col">Noir</th>
                  <th scope="col">Blanc</th>
                  <th scope="col">Coup</th>
                  <th scope="col">État</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => {
                  const alert = needsCheck(t);
                  const n = tableNumber(t.stream);
                  return (
                    <tr key={t.stream.stream_id} className={alert ? "bg-danger-light" : ""}>
                      <th scope="row" className="text-[18px]">
                        {n}
                      </th>
                      <td>{t.stream.black ?? "—"}</td>
                      <td>{t.stream.white ?? "—"}</td>
                      <td>{t.moveCount}</td>
                      <td>
                        {alert ? (
                          <strong className="text-danger">
                            <span aria-hidden="true">▲ </span>Aucun coup détecté
                          </strong>
                        ) : (
                          <span className="font-bold text-jade">
                            <span aria-hidden="true">● </span>En cours
                          </span>
                        )}
                      </td>
                      <td>
                        <Link href={`/tournaments/tables/${t.stream.stream_id}`} className={alert ? "link-strong" : ""}>
                          Contrôler<span className="sr-only"> la table {n}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="!text-center text-pebble">
                      {filter === "finished" ? "La fin des parties n'est pas encore signalée par le serveur." : "Aucune table dans cette catégorie."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
