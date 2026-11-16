"use client";

import Link from "next/link";
import BoardThumbnail from "@/components/BoardThumbnail";
import { api, sgfPath, useLoad, type MatchSummary } from "@/lib/api";
import { plural, shortDate } from "@/lib/format";

function CameraIcon({ size = 20, stroke = "#E8A317" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.2} aria-hidden="true">
      <rect x={3} y={6} width={18} height={14} rx={3} />
      <circle cx={12} cy={13} r={4} />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 440 320"
      className="relative max-w-[460px] flex-[1_1_360px]"
      role="img"
      aria-label="Illustration : une partie de go sur une table de bar, un téléphone photographie le plateau."
    >
      <ellipse cx={220} cy={270} rx={200} ry={34} fill="#C99A4E" opacity={0.55} />
      <rect x={60} y={150} width={320} height={120} rx={18} fill="#B7843D" />
      <g transform="translate(110 120)">
        <rect width={220} height={128} rx={10} fill="#EBCB8B" stroke="#9A6B2A" strokeWidth={2} />
        <path d="M20 16H200M20 40H200M20 64H200M20 88H200M20 112H200M20 16V112M56 16V112M92 16V112M128 16V112M164 16V112M200 16V112" stroke="#7A5420" strokeWidth={1.4} />
        <circle cx={56} cy={40} r={10} fill="#1B1A17" />
        <circle cx={164} cy={88} r={10} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />
        <circle className="stone-drop" style={{ animationDelay: ".3s" }} cx={92} cy={64} r={10} fill="#1B1A17" />
        <circle className="stone-drop" style={{ animationDelay: ".9s" }} cx={128} cy={40} r={10} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />
        <circle className="stone-drop" style={{ animationDelay: "1.5s" }} cx={128} cy={88} r={10} fill="#1B1A17" />
        <circle className="stone-drop" style={{ animationDelay: "2.1s" }} cx={164} cy={40} r={10} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />
      </g>
      <g>
        <rect x={70} y={170} width={34} height={42} rx={6} fill="#FFFFFF" />
        <path d="M104 180h8a8 8 0 010 16h-8" fill="none" stroke="#FFFFFF" strokeWidth={5} />
        <rect x={74} y={176} width={26} height={10} rx={3} fill="#E8A317" />
      </g>
      <g>
        <rect x={342} y={176} width={30} height={38} rx={6} fill="#1B1A17" />
        <path d="M342 186h-7a7 7 0 000 14h7" fill="none" stroke="#1B1A17" strokeWidth={5} />
      </g>
      <g transform="translate(186 6) rotate(-6)">
        <rect width={74} height={120} rx={14} fill="#1B1A17" />
        <rect x={7} y={12} width={60} height={92} rx={7} fill="#F3E3C3" />
        <path d="M17 34H57M17 52H57M17 70H57M17 88H57M17 34V88M30 34V88M44 34V88M57 34V88" stroke="#9A6B2A" strokeWidth={1} />
        <circle cx={30} cy={52} r={5} fill="#1B1A17" />
        <circle cx={44} cy={70} r={5} fill="#FFFFFF" stroke="#1B1A17" />
        <rect className="flash" x={7} y={12} width={60} height={92} rx={7} fill="#FFFFFF" />
      </g>
      <path d="M223 132 L200 150 M223 132 L246 150" stroke="#9A4A08" strokeWidth={2} strokeDasharray="4 4" />
    </svg>
  );
}

function StepList({ steps }: { steps: [string, string][] }) {
  return (
    <ol aria-label="Les étapes" className="flex list-none flex-col gap-3.5">
      {steps.map(([strong, rest], i) => (
        <li key={strong} className="flex items-center gap-3.5">
          <span className="heading w-7 flex-none text-[30px] leading-none">{i + 1}</span>
          <span>
            <strong>{strong}</strong> {rest}
          </span>
        </li>
      ))}
    </ol>
  );
}

function matchSubtitle(m: MatchSummary) {
  const players = [m.black, m.white].filter(Boolean).join(" · ");
  return [shortDate(m.date), players].filter(Boolean).join(" · ");
}

function StatusPill({ match }: { match: MatchSummary }) {
  return sgfPath(match) ? <span className="pill pill-jade">Prête</span> : <span className="pill pill-honey">Sans SGF</span>;
}

export default function HomePage() {
  const matches = useLoad(() => api.matches(), []);
  const streams = useLoad(() => api.streams(), []);
  const recent = (matches.data ?? []).slice(0, 3);
  const liveCount = streams.data?.length ?? 0;

  return (
    <main id="contenu">
      {/* Phone layout */}
      <div className="shell flex flex-col gap-3.5 pb-6 pt-2 md:hidden">
        <h1 className="heading mb-1 text-[28px]">Bonjour</h1>
        <Link href="/record" className="flex min-h-[120px] items-center gap-3.5 rounded-[28px] bg-ink px-[18px] text-white no-underline hover:text-white">
          <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
            <rect x={4} y={30} width={56} height={30} rx={4} fill="#EBCB8B" />
            <rect x={20} y={2} width={24} height={38} rx={5} fill="#24272E" stroke="#E8A317" strokeWidth={2} />
            <circle cx={32} cy={20} r={6} fill="none" stroke="#E8A317" strokeWidth={2} />
          </svg>
          <span>
            <strong className="text-[21px]">Enregistrer ma partie</strong>
            <br />
            <span className="text-[15px] text-[#D9D2C3]">Photos du plateau</span>
          </span>
        </Link>
        <Link href="/watch" className="flex min-h-24 items-center gap-3.5 rounded-[28px] border border-line bg-white px-[18px] text-ink no-underline hover:text-ink">
          <svg width={56} height={56} viewBox="0 0 80 80" className="rounded-md" aria-hidden="true">
            <rect width={80} height={80} fill="#EBCB8B" />
            <path d="M10 10H70M10 25H70M10 40H70M10 55H70M10 70H70M10 10V70M25 10V70M40 10V70M55 10V70M70 10V70" stroke="#3B2A10" strokeWidth={1} />
            <circle cx={55} cy={25} r={6} fill="#1B1A17" />
            <circle cx={25} cy={55} r={6} fill="#FFFFFF" />
            <circle cx={55} cy={55} r={6} fill="#1B1A17" />
          </svg>
          <span>
            <span className="flex items-center gap-2">
              <strong className="text-[19px]">En direct</strong>
              {liveCount > 0 && (
                <span className="live-badge !px-1.5 !py-px text-xs">
                  {liveCount}
                  <span className="sr-only"> {liveCount > 1 ? "tables en direct" : "table en direct"}</span>
                </span>
              )}
            </span>
            <span className="text-[15px] text-pebble">{liveCount > 0 ? plural(liveCount, "table filmée", "tables filmées") : "Aucune table pour le moment"}</span>
          </span>
        </Link>
        <h2 className="heading mt-2 text-[18px]">Reprendre</h2>
        {recent.map((m) => (
          <Link key={m.match_id} href={`/match/${m.match_id}`} className="flex items-center gap-3 rounded-[14px] border border-line bg-white p-3 text-ink no-underline hover:text-ink">
            <BoardThumbnail sgf={sgfPath(m)} className="size-14 flex-none rounded" />
            <span className="min-w-0">
              <strong className="block truncate">{m.title}</strong>
              <span className="text-sm text-pebble">{matchSubtitle(m)}</span>
            </span>
          </Link>
        ))}
        {matches.data && recent.length === 0 && <p className="text-pebble">Aucune partie enregistrée pour le moment.</p>}
        {matches.error && <p className="text-pebble">{matches.error.message}</p>}
        <Link href="/analyze" className="link-strong mt-1 text-base">
          Analyser une partie
        </Link>
      </div>

      {/* Desktop layout */}
      <div className="shell hidden flex-col gap-12 pb-[72px] pt-6 md:flex">
        <section aria-labelledby="h-title" className="relative flex flex-wrap items-center gap-8 overflow-hidden rounded-[32px] bg-wood-light p-12">
          <svg aria-hidden="true" width="100%" height="100%" className="absolute inset-0 opacity-[0.22]">
            <defs>
              <pattern id="grid" width={36} height={36} patternUnits="userSpaceOnUse">
                <path d="M36 0V36M0 36H36" stroke="#9A6B2A" strokeWidth={1} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="relative flex flex-[1_1_420px] flex-col gap-[18px]">
            <p className="font-bold text-clay-dark">Bonjour</p>
            <h1 id="h-title" className="heading text-[56px] leading-[1.02]">
              Vos parties de go, retrouvées et analysées.
            </h1>
            <p className="max-w-[520px] text-[19px] text-ink-soft">Quelques photos du plateau suffisent pour revenir sur les moments où vous avez réfléchi.</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
              <Link href="/record" className="btn btn-primary min-h-14 px-7 text-[18px]">
                <CameraIcon />
                Enregistrer ma partie
              </Link>
              <Link href="/analyze" className="btn btn-white min-h-14">
                Analyser une partie
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </section>

        <div className="flex flex-wrap items-stretch gap-[22px]">
          <section aria-labelledby="p-player" className="flex flex-[1_1_440px] flex-col gap-[22px] rounded-[28px] bg-white p-8">
            <div className="flex items-center gap-3.5">
              <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-full bg-honey">
                <CameraIcon size={28} stroke="#6E3405" />
              </span>
              <div>
                <p className="text-[15px] font-bold text-clay-dark">Je joue</p>
                <h2 id="p-player" className="heading mt-0.5 text-[28px]">
                  Enregistrer et analyser ma partie
                </h2>
              </div>
            </div>
            <StepList
              steps={[
                ["4 ou 5 photos", "pendant la partie"],
                ["Vos positions clés,", "partie reconstruite"],
                ["L'analyse", "de vos autres choix"],
              ]}
            />
            <div className="mt-auto flex flex-wrap items-center gap-4">
              <Link href="/record" className="btn btn-primary">
                Commencer
              </Link>
              <Link href="/upload/match" className="link-strong">
                Importer un SGF
              </Link>
            </div>
          </section>

          <section aria-labelledby="p-organizer" className="flex flex-[1_1_440px] flex-col gap-[22px] rounded-[28px] bg-jade-light p-8">
            <div className="flex items-center gap-3.5">
              <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-full bg-white">
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth={2}>
                  <rect x={2} y={6} width={14} height={12} rx={3} />
                  <path d="M16 10l6-3v10l-6-3" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-jade">
                  J&apos;organise <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-[13px] text-ink">En test</span>
                </p>
                <h2 id="p-organizer" className="heading mt-0.5 text-[28px]">
                  Diffuser un tournoi
                </h2>
              </div>
            </div>
            <StepList
              steps={[
                ["Une caméra", "par table"],
                ["La régie", "contrôle et corrige"],
                ["La diffusion", "vidéo et goban"],
              ]}
            />
            <div className="mt-auto flex flex-wrap items-center gap-4">
              <Link href="/tournaments/new" className="btn btn-primary">
                Créer un tournoi
              </Link>
              <Link href="/tournaments" className="link-strong !text-jade">
                Ouvrir la régie
              </Link>
            </div>
          </section>
        </div>

        <section aria-labelledby="t-recent" className="flex flex-col gap-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="t-recent" className="heading text-[30px]">
              Reprendre
            </h2>
            <Link href="/matches" className="link-strong">
              Toutes mes parties
            </Link>
          </div>
          {matches.error && <p className="text-pebble">Les parties ne peuvent pas être affichées : {matches.error.message}</p>}
          {matches.loading && !matches.data && <p className="text-pebble">Chargement des parties…</p>}
          {matches.data && recent.length === 0 && (
            <p className="text-pebble">
              Aucune partie pour le moment. <Link href="/record">Enregistrez votre première partie</Link>.
            </p>
          )}
          <ul className="grid list-none gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            {recent.map((m) => (
              <li key={m.match_id}>
                <Link href={`/match/${m.match_id}`} className="lift flex flex-col gap-3.5 rounded-3xl bg-white p-4 text-ink no-underline hover:text-ink">
                  <div className="h-[170px] overflow-hidden rounded-2xl bg-wood">
                    <BoardThumbnail sgf={sgfPath(m)} className="mx-auto h-full" />
                  </div>
                  <span className="flex items-start justify-between gap-2.5">
                    <span className="min-w-0">
                      <strong className="block text-[18px]">{m.title}</strong>
                      <span className="text-[15px] text-pebble">{matchSubtitle(m)}</span>
                    </span>
                    <StatusPill match={m} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
