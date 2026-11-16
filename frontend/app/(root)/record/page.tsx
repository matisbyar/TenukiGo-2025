"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { MiniBoard } from "@/components/BoardThumbnail";
import PlayerSelect from "@/components/PlayerSelect";
import { Check, Chevron, DevBanner, Loaded, Notice, Spinner, Steps, Stone } from "@/components/ui";
import { api, messageOf, useLoad, type Player } from "@/lib/api";
import { clockTime, playerName, playerNameWithLevel, plural } from "@/lib/format";
import { boardHistory, downloadSgf, keyPositions, moveOffset, writeSgf } from "@/lib/go";
import { reconstruct, recording, useRecording, type Recording } from "@/lib/recording";

const STEPS = ["Informations", "Photos", "Positions clés"];

export default function RecordPage() {
  const state = useRecording();
  const players = useLoad(() => api.players(), []);

  return (
    <>
      <DevBanner>La reconstruction à partir de photos est en cours de test : le résultat peut être incomplet.</DevBanner>
      <main id="contenu" className="shell flex flex-col gap-[26px] pb-16 pt-9">
        <Steps steps={STEPS} current={state.step} />
        <Loaded state={players}>{(list) => <Wizard state={state} initialPlayers={list} />}</Loaded>
      </main>
    </>
  );
}

function Wizard({ state, initialPlayers }: { state: Recording; initialPlayers: Player[] }) {
  const [players, setPlayers] = useState(initialPlayers);
  const addPlayer = (p: Player) => setPlayers((list) => [...list, p]);
  const black = players.find((p) => p.player_id === state.blackId) ?? null;
  const white = players.find((p) => p.player_id === state.whiteId) ?? null;

  if (state.step === 0) return <InfoStep state={state} players={players} onCreated={addPlayer} />;
  if (state.step === 1) return <PhotosStep state={state} black={black} white={white} />;
  return <ResultStep state={state} black={black} white={white} />;
}

function QuitBar({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="action-bar">
      <div className="flex flex-wrap items-center gap-6">
        {onBack && (
          <button type="button" className="back-link text-clay underline" onClick={onBack}>
            <Chevron />
            Étape précédente
          </button>
        )}
        <Link href="/" className="link-strong" onClick={() => recording.reset()}>
          Quitter<span className="sr-only"> sans enregistrer</span>
        </Link>
      </div>
      {children}
    </div>
  );
}

// --- Step 1: information -----------------------------------------------------------

function InfoStep({ state, players, onCreated }: { state: Recording; players: Player[]; onCreated: (p: Player) => void }) {
  const [submitted, setSubmitted] = useState(false);
  const invalid = !state.title.trim() || state.blackId === null || state.whiteId === null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!invalid) recording.update({ step: 1 });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[26px]">
      <div>
        <h1 className="heading text-[clamp(28px,5vw,38px)]">Votre partie</h1>
        <p className="mt-2 text-[18px] text-pebble">Donnez un titre à la partie et indiquez qui joue. Vous ajouterez les photos à l&apos;étape suivante.</p>
      </div>
      <section className="panel !gap-4 !p-[26px]">
        <div className="field-group">
          <label htmlFor="r-title" className="label">
            Titre de la partie
          </label>
          <input
            id="r-title"
            className="field"
            placeholder="Partie du club, mardi"
            value={state.title}
            onChange={(e) => recording.update({ title: e.target.value })}
            aria-invalid={(submitted && !state.title.trim()) || undefined}
          />
          {submitted && !state.title.trim() && <span className="field-error">À indiquer</span>}
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <PlayerSelect
            id="r-black"
            label="Noir"
            color="B"
            players={players}
            value={state.blackId}
            onChange={(blackId) => recording.update({ blackId })}
            onCreated={onCreated}
            invalid={submitted && state.blackId === null}
          />
          <PlayerSelect
            id="r-white"
            label="Blanc"
            color="W"
            players={players}
            value={state.whiteId}
            onChange={(whiteId) => recording.update({ whiteId })}
            onCreated={onCreated}
            invalid={submitted && state.whiteId === null}
          />
        </div>
        <p className="text-[15px] text-pebble">Goban 19 × 19.</p>
      </section>
      <QuitBar>
        <button type="submit" className="btn btn-primary !px-[26px] text-[18px]">
          Continuer
        </button>
      </QuitBar>
    </form>
  );
}

// --- Step 2: photos ----------------------------------------------------------------

function PhotosStep({ state, black, white }: { state: Recording; black: Player | null; white: Player | null }) {
  const { photos } = state;
  const [progress, setProgress] = useState<{ pair: number; pairs: number } | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    setProgress({ pair: 1, pairs: photos.length - 1 });
    const result = await reconstruct({ title: state.title.trim(), black: playerName(black), white: playerName(white) }, (pair, pairs) => setProgress({ pair, pairs }));
    setProgress(null);
    if (!result.ok) setError(result.message);
  };

  return (
    <>
      <div>
        <h1 className="heading text-[clamp(28px,5vw,38px)]">Ajoutez les photos de votre partie</h1>
        <p className="mt-2 text-[18px] text-pebble">
          4 ou 5 photos suffisent, prises aux moments où vous avez réfléchi. Chaque photo devient une position clé que vous pourrez analyser.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
          <section aria-labelledby="e-add" className="flex flex-wrap items-center gap-6 rounded-[28px] border-2 border-dashed border-line-strong bg-white p-[26px]">
            <svg width={150} height={110} viewBox="0 0 170 120" aria-hidden="true">
              <rect x={10} y={56} width={150} height={58} rx={6} fill="#EBCB8B" />
              <path d="M22 66H148M22 78H148M22 90H148M22 102H148M34 60V110M58 60V110M82 60V110M106 60V110M130 60V110" stroke="#3B2A10" strokeWidth={1} />
              <circle cx={58} cy={78} r={5} fill="#1B1A17" />
              <circle cx={106} cy={90} r={5} fill="#FFFFFF" stroke="#1B1A17" />
              <rect x={58} y={2} width={54} height={76} rx={8} fill="#1B1A17" />
              <rect x={63} y={10} width={44} height={56} rx={3} fill="#E8A317" />
            </svg>
            <div className="flex flex-[1_1_280px] flex-col gap-3">
              <h2 id="e-add" className="heading text-[22px]">
                Ajouter des photos
              </h2>
              <p className="text-base text-pebble">Depuis la galerie du téléphone ou de l&apos;ordinateur, ou en photographiant directement le plateau.</p>
              <div className="flex flex-wrap gap-2.5">
                <label htmlFor="files" className="btn btn-primary !min-h-12 !px-5 cursor-pointer">
                  Choisir dans la galerie
                </label>
                <input
                  id="files"
                  type="file"
                  multiple
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    recording.addPhotos(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                <Link href="/record/camera" className="btn btn-outline !min-h-12 !px-[18px]">
                  Prendre une photo
                </Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="e-photos" className="panel !gap-4 !p-6">
            <div>
              <h2 id="e-photos" className="heading text-[22px]">
                {photos.length === 0 ? "Aucune photo pour le moment" : `${plural(photos.length, "photo")}, dans l'ordre de la partie`}
              </h2>
              <p role="status" className="mt-1 text-base text-pebble">
                {photos.length === 0
                  ? "Ajoutez au moins deux photos : la partie est reconstruite d'une photo à la suivante."
                  : photos.length === 1
                    ? "Encore au moins une photo : la partie est reconstruite d'une photo à la suivante."
                    : "Classées par heure de prise de vue · le plateau est vérifié à la reconstruction"}
              </p>
            </div>
            {photos.length > 0 && (
              <ol className="grid list-none gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                {photos.map((p, i) => (
                  <li key={p.id} className={`flex flex-col gap-2 rounded-[20px] p-2.5 ${p.status === "error" ? "border-2 border-danger" : "border border-line"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Photo ${i + 1} du plateau`} className="aspect-[4/3] w-full rounded-md object-cover" />
                    <span className="flex justify-between text-[15px]">
                      <strong>Photo {i + 1}</strong>
                      <span className="text-pebble">{clockTime(p.takenAt)}</span>
                    </span>
                    {p.status === "ok" && (
                      <span className="text-sm font-bold text-jade">
                        <span aria-hidden="true">✓ </span>
                        {plural(p.stones ?? 0, "pierre")}
                      </span>
                    )}
                    {p.status === "error" && (
                      <span className="text-sm font-bold text-danger">
                        <span aria-hidden="true">▲ </span>
                        {p.message}
                      </span>
                    )}
                    <button type="button" className="btn-link !min-h-9 self-start !p-0 text-[15px]" onClick={() => recording.removePhoto(p.id)} disabled={progress !== null}>
                      Retirer<span className="sr-only"> la photo {i + 1}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex flex-[1_1_300px] flex-col gap-5">
          <section aria-labelledby="e-match" className="panel !gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="e-match" className="heading text-[18px]">
                Votre partie
              </h2>
              <button type="button" className="btn-link !min-h-0 !p-0 text-[15px] font-bold text-clay" onClick={() => recording.update({ step: 0 })}>
                Modifier<span className="sr-only"> les informations</span>
              </button>
            </div>
            <p className="text-[20px] font-bold">{state.title}</p>
            <ul className="flex list-none flex-col gap-2 text-base">
              <li className="flex items-center gap-2.5">
                <Stone color="B" size={18} />
                Noir : {playerNameWithLevel(black)}
              </li>
              <li className="flex items-center gap-2.5">
                <Stone color="W" size={18} />
                Blanc : {playerNameWithLevel(white)}
              </li>
            </ul>
            <p className="text-[15px] text-pebble">19 × 19</p>
          </section>

          <section aria-labelledby="e-how" className="panel panel-cream">
            <h2 id="e-how" className="heading text-[18px]">
              Ce que vous obtenez
            </h2>
            <ol className="flex list-none flex-col gap-3.5 text-base leading-[1.45]">
              {[
                "Chaque photo devient une position clé, exacte.",
                "Les coups entre deux photos sont déduits : leur ordre peut différer un peu de la partie réelle.",
                "Vous analysez les positions clés et corrigez la partie si besoin.",
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-ink font-extrabold text-white">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {error && (
        <Notice type="warning" title="Reconstruction interrompue.">
          {error} Reprenez la photo ou retirez-la, puis relancez.
        </Notice>
      )}

      <QuitBar onBack={() => recording.update({ step: 0 })}>
        <button type="button" className="btn btn-primary !px-[26px] text-[18px]" disabled={photos.length < 2 || progress !== null} onClick={run}>
          {progress ? (
            <>
              <Spinner /> Photos {progress.pair} et {progress.pair + 1} sur {progress.pairs + 1}…
            </>
          ) : (
            "Reconstruire la partie"
          )}
        </button>
      </QuitBar>
    </>
  );
}

// --- Step 3: key positions ---------------------------------------------------------

function ResultStep({ state, black, white }: { state: Recording; black: Player | null; white: Player | null }) {
  const router = useRouter();
  const game = state.game!;
  const boards = useMemo(() => boardHistory(game), [game]);
  const keys = useMemo(() => keyPositions(game), [game]);
  const offset = moveOffset(game);
  const total = game.moves.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /** Saves the match (POST /match/create with the SGF), then opens it. */
  const save = async (then: (id: number) => string) => {
    if (state.blackId === null || state.whiteId === null) return;
    setBusy(true);
    setError("");
    try {
      const { match_id } = await api.createMatch({
        title: state.title.trim(),
        black: state.blackId,
        white: state.whiteId,
        result: "unknown",
        style: "amical",
        date: new Date().toISOString().slice(0, 19),
        sgf: writeSgf(game),
      });
      recording.reset();
      router.push(then(match_id));
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  return (
    <>
      <section aria-labelledby="r-title" className="banner flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <svg width={44} height={44} viewBox="0 0 22 22" aria-hidden="true" className="flex-none">
            <circle cx={11} cy={11} r={10} fill="#E8A317" />
            <path d="M6 11l3.5 3.5L16 8" fill="none" stroke="#1B1A17" strokeWidth={2.4} />
          </svg>
          <div>
            <h1 id="r-title" className="heading text-[clamp(26px,4.5vw,32px)]">
              Votre partie est reconstruite
            </h1>
            <p className="mt-1 text-ink-soft">
              {state.title} · {playerName(black)} contre {playerName(white)}
            </p>
          </div>
        </div>
        <dl role="status" className="flex flex-wrap gap-8">
          <div>
            <dt className="text-sm text-ink-soft">Positions clés</dt>
            <dd className="mt-0.5 text-[28px] font-extrabold">{keys.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Coups estimés</dt>
            <dd className="mt-0.5 text-[28px] font-extrabold">≈ {total + offset}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="r-positions" className="flex flex-col gap-3.5">
        <div>
          <h2 id="r-positions" className="heading text-2xl">
            Vos positions clés
          </h2>
          <p className="mt-1.5 text-pebble">Une par photo. Ces positions sont exactes ; les coups qui les relient sont déduits.</p>
        </div>
        <ol className="grid list-none gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))" }}>
          {keys.map((k, i) => {
            const name = k.index === total ? "fin" : `coup ≈ ${k.index + offset}`;
            return (
              <li key={k.index} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-3.5">
                <MiniBoard board={boards[k.index]} className="w-full rounded-md" />
                <strong>
                  Position {i + 1} · {name}
                </strong>
                <span className="text-[15px] text-pebble">{k.label}</span>
                <button
                  type="button"
                  className="btn-link !min-h-0 self-start !p-0 font-bold text-clay"
                  disabled={busy}
                  onClick={() => save((id) => `/match/${id}/analyze?move=${k.index}`)}
                >
                  Enregistrer et analyser<span className="sr-only"> la position {i + 1}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-stretch gap-[22px]">
        <section aria-labelledby="r-approx" className="panel panel-cream flex-[1_1_420px] !gap-3">
          <h2 id="r-approx" className="heading text-[20px]">
            Une partie approximative, à corriger si besoin
          </h2>
          <p className="text-base">Entre deux photos, TenukiGo choisit l&apos;enchaînement de coups le plus logique. L&apos;ordre exact peut être différent de votre partie.</p>
          <p className="text-base">Une pierre mal placée ? Vous pouvez la corriger dans l&apos;outil de correction, comme sur un kifu.</p>
          <button type="button" className="btn-link !min-h-0 self-start !p-0 font-bold text-clay" disabled={busy} onClick={() => save((id) => `/match/${id}/correct`)}>
            Enregistrer et corriger la partie
          </button>
        </section>

        <section aria-labelledby="r-save" className="panel flex-[1_1_420px] !gap-4">
          <h2 id="r-save" className="heading text-[20px]">
            Enregistrer
          </h2>
          <fieldset className="grid grid-cols-3 gap-2">
            <legend className="mb-2 font-bold">Qui peut voir cette partie ?</legend>
            {["Moi seul", "Les joueurs", "Tout le monde"].map((choice, i) => (
              <label key={choice} className="flex flex-col gap-1.5 rounded-2xl border border-line-strong p-3 text-[15px] has-[:checked]:border-[3px] has-[:checked]:border-ink">
                <input type="radio" name="visibility" defaultChecked={i === 2} className="size-5 accent-ink" />
                <strong>{choice}</strong>
              </label>
            ))}
          </fieldset>
          <p className="text-[15px] text-pebble">Les comptes ne sont pas encore en place : pour l&apos;instant, toutes les parties sont visibles par tout le monde.</p>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="link-strong btn-link !min-h-0 !p-0 text-clay" onClick={() => downloadSgf(writeSgf(game), state.title)}>
              Télécharger le SGF
            </button>
          </div>
        </section>
      </div>

      {error && (
        <Notice type="error" title="Enregistrement impossible.">
          {error}
        </Notice>
      )}

      <QuitBar onBack={() => recording.update({ step: 1 })}>
        <button type="button" className="btn btn-primary !px-[26px] text-[18px]" disabled={busy} onClick={() => save((id) => `/match/${id}/analyze`)}>
          {busy ? (
            <>
              <Spinner /> Enregistrement…
            </>
          ) : (
            <>
              <Check color="#E8A317" /> Enregistrer et analyser
            </>
          )}
        </button>
      </QuitBar>
    </>
  );
}
