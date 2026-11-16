import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Accessibilité et charte graphique" };

const COLORS = [
  { name: "Papier", hex: "#FBF6EC", swatch: "#FBF6EC", use: "Fond des pages", border: true },
  { name: "Bois", hex: "#EBCB8B · #F3E3C3", swatch: "#EBCB8B", use: "Goban, bandeaux" },
  { name: "Encre", hex: "#1B1A17", swatch: "#1B1A17", use: "Texte, bouton principal · 16,2:1" },
  { name: "Galet", hex: "#5B5346", swatch: "#5B5346", use: "Texte secondaire · 7,0:1" },
  { name: "Ambre", hex: "#E8A317", swatch: "#E8A317", use: "Accent, texte encre dessus · 8,0:1" },
  { name: "Terre cuite", hex: "#9A4A08", swatch: "#9A4A08", use: "Liens, focus · 5,8:1" },
];

const JOURNEYS = [
  { name: "Joueur", tone: "miel", detail: "#FCE9C0 / #6E3405 · 8,1:1", background: "#FCE9C0", dot: "#6E3405" },
  { name: "Organisateur", tone: "jade", detail: "#DCEBE1 / #2F6B4F · 5,1:1", background: "#DCEBE1", dot: "#2F6B4F" },
  { name: "Analyse", tone: "ardoise", detail: "#E3EAF3 / #2E5A8A · 5,9:1", background: "#E3EAF3", dot: "#2E5A8A" },
];

function Tile({ children }: { children: ReactNode }) {
  return (
    <svg width={36} height={36} viewBox="0 0 32 32" aria-hidden="true" className="flex-none">
      <rect width={32} height={32} rx={10} fill="#EBCB8B" />
      {children}
    </svg>
  );
}

const WhiteStone = () => <circle cx={16} cy={16} r={10} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />;

/** Design system page ("Bois et pierre"), also the target of the footer's accessibility link. */
export default function AccessibilityPage() {
  return (
    <main id="contenu" className="shell flex flex-col gap-10 pb-[72px] pt-10">
      <div>
        <p className="font-bold text-clay-dark">Système de conception</p>
        <h1 className="heading mt-1.5 text-[clamp(36px,7vw,56px)] leading-[1.02]">Bois et pierre</h1>
        <p className="mt-3 max-w-[680px] text-[19px] text-ink-soft">
          Les couleurs du goban, des formes rondes comme les pierres, et un peu de mouvement. Niveau d&apos;accessibilité visé : AA (RGAA, WCAG 2.2).
        </p>
      </div>

      <section aria-labelledby="f-colors" className="flex flex-col gap-[18px]">
        <h2 id="f-colors" className="heading text-[32px]">
          Couleurs
        </h2>
        <ul className="grid list-none gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          {COLORS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-3xl bg-white">
              <div className={`h-[88px] ${c.border ? "border-b border-line" : ""}`} style={{ background: c.swatch }} />
              <div className="px-4 py-3.5">
                <strong>{c.name}</strong>
                <br />
                <span className="font-mono text-sm">{c.hex}</span>
                <br />
                <span className="text-[15px] text-pebble">{c.use}</span>
              </div>
            </li>
          ))}
        </ul>
        <h3 className="heading mt-2 text-[22px] !font-bold">Une couleur par parcours</h3>
        <ul className="grid list-none gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          {JOURNEYS.map((j) => (
            <li key={j.name} className="flex items-center gap-3.5 rounded-3xl p-[18px]" style={{ background: j.background }}>
              <span aria-hidden="true" className="size-10 flex-none rounded-full" style={{ background: j.dot }} />
              <span>
                <strong>{j.name}</strong> · {j.tone}
                <br />
                <span className="text-[15px]">{j.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="f-type" className="flex flex-col gap-3 rounded-[28px] bg-white p-8">
        <h2 id="f-type" className="heading mb-2 text-[32px]">
          Typographie
        </h2>
        <p className="heading text-[clamp(34px,7vw,56px)] leading-[1.05]">Bricolage Grotesque</p>
        <p className="text-pebble">Titres uniquement : expressive, réservée aux grandes tailles (24 px et plus).</p>
        <p className="mt-4 text-[28px] font-bold">Atkinson Hyperlegible Next</p>
        <p className="text-pebble">Texte courant, boutons, formulaires : conçue pour les personnes malvoyantes. 17 px minimum, interligne 1,5.</p>
        <p className="mt-4 font-mono text-[18px]">D4 · Q16 · ;B[pd];W[dp] — coordonnées et SGF</p>
      </section>

      <div className="flex flex-wrap gap-6">
        <section aria-labelledby="f-shapes" className="flex flex-[1_1_460px] flex-col gap-[18px] rounded-[28px] bg-white p-8">
          <h2 id="f-shapes" className="heading text-[32px]">
            Formes et boutons
          </h2>
          <p className="text-pebble">Rond comme les pierres : boutons et badges en pastille, cartes à coins larges (24 à 32 px), pas de bordure quand un fond suffit.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary">
              Principal
            </button>
            <button type="button" className="btn btn-secondary">
              Secondaire
            </button>
            <button type="button" className="btn btn-danger">
              Supprimer
            </button>
            <button type="button" aria-label="Coup suivant" className="btn btn-round !border-0 !bg-wood-light">
              <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7 4l6 6-6 6" fill="none" stroke="#1B1A17" strokeWidth={2.4} />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="pill pill-jade !px-3.5 !py-1.5">✓ Prête</span>
            <span className="pill pill-honey !px-3.5 !py-1.5">✎ À corriger</span>
            <span className="pill !bg-danger !px-3.5 !py-1.5 text-white">● En direct</span>
            <span className="pill pill-neutral !px-3.5 !py-1.5">En test</span>
          </div>
          <button type="button" className="btn btn-primary self-start outline outline-[3px] outline-offset-[3px] outline-clay">
            État focus
          </button>
        </section>

        <section aria-labelledby="f-motion" className="relative flex flex-[1_1_460px] flex-col gap-[18px] overflow-hidden rounded-[28px] bg-wood-light p-8">
          <svg aria-hidden="true" width="100%" height="100%" className="absolute inset-0 opacity-[0.22]">
            <defs>
              <pattern id="grid-motion" width={36} height={36} patternUnits="userSpaceOnUse">
                <path d="M36 0V36M0 36H36" stroke="#9A6B2A" strokeWidth={1} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-motion)" />
          </svg>
          <h2 id="f-motion" className="heading relative text-[32px]">
            Motifs et mouvement
          </h2>
          <p className="relative">
            La grille du goban sert de fond discret aux bandeaux. Les pierres se « posent » à l&apos;apparition (0,5 s), les cartes se soulèvent au survol (0,2 s).
          </p>
          <svg viewBox="0 0 300 110" className="relative w-full max-w-[340px]" role="img" aria-label="Exemple : trois pierres qui se posent sur une grille">
            <rect width={300} height={110} rx={18} fill="#EBCB8B" />
            <path d="M30 25H270M30 55H270M30 85H270M30 25V85M90 25V85M150 25V85M210 25V85M270 25V85" stroke="#7A5420" strokeWidth={1.4} />
            <circle className="stone-drop-loop" cx={90} cy={55} r={13} fill="#1B1A17" />
            <circle className="stone-drop-loop" style={{ animationDelay: ".4s" }} cx={150} cy={25} r={13} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />
            <circle className="stone-drop-loop" style={{ animationDelay: ".8s" }} cx={210} cy={55} r={13} fill="#1B1A17" />
          </svg>
          <p className="relative text-[15px] font-bold">Toutes les animations s&apos;arrêtent si l&apos;utilisateur a demandé moins de mouvement (prefers-reduced-motion).</p>
        </section>
      </div>

      <section aria-labelledby="f-legend" className="flex flex-col gap-4 rounded-[28px] bg-white p-8">
        <h2 id="f-legend" className="heading text-[32px]">
          Légende du goban
        </h2>
        <ul className="grid list-none gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <li className="flex items-center gap-3.5">
            <Tile>
              <circle cx={16} cy={16} r={10} fill="#1B1A17" />
            </Tile>
            Pierre noire
          </li>
          <li className="flex items-center gap-3.5">
            <Tile>
              <WhiteStone />
            </Tile>
            Pierre blanche, contour encre
          </li>
          <li className="flex items-center gap-3.5">
            <Tile>
              <WhiteStone />
              <circle cx={16} cy={16} r={4.5} fill="none" stroke="#1B1A17" strokeWidth={2.4} />
            </Tile>
            Dernier coup : anneau
          </li>
          <li className="flex items-center gap-3.5">
            <Tile>
              <circle cx={16} cy={16} r={10} fill="#2E5A8A" />
              <text x={16} y={21} textAnchor="middle" fontSize={13} fontWeight={700} fill="#FFFFFF">
                A
              </text>
            </Tile>
            Coup conseillé : lettre
          </li>
          <li className="flex items-center gap-3.5">
            <Tile>
              <rect x={5} y={5} width={22} height={22} rx={4} fill="none" stroke="#9A4A08" strokeWidth={3} />
            </Tile>
            Curseur clavier
          </li>
        </ul>
      </section>

      <section aria-labelledby="f-messages" className="flex flex-col gap-3 rounded-[28px] bg-white p-8">
        <h2 id="f-messages" className="heading mb-1 text-[32px]">
          Messages
        </h2>
        <div className="notice bg-jade-light">
          <span aria-hidden="true" className="notice-icon bg-jade">
            ✓
          </span>
          <p>
            <strong>Enregistrée.</strong> La partie est dans votre bibliothèque.
          </p>
        </div>
        <div className="notice bg-honey">
          <span aria-hidden="true" className="notice-icon bg-clay-dark">
            !
          </span>
          <p>
            <strong>Photo floue.</strong> Reprenez-la ou continuez sans elle.
          </p>
        </div>
        <div className="notice bg-danger-light">
          <span aria-hidden="true" className="notice-icon bg-danger">
            ×
          </span>
          <p>
            <strong>Plateau perdu.</strong> La caméra de la table 7 a peut-être bougé.
          </p>
        </div>
        <p className="mt-1 text-[15px] text-pebble">Toujours une icône et un mot en gras : la couleur n&apos;est jamais le seul indice.</p>
      </section>
    </main>
  );
}
