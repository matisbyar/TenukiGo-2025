"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx={11} cy={11} r={8} fill="#1B1A17" />
      <circle cx={21} cy={21} r={8} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={2} />
      <circle cx={23} cy={9} r={4} fill="#E8A317" />
    </svg>
  );
}

const isAnalysis = (p: string) => p.startsWith("/analyze") || /\/(analyze|correct)$/.test(p);

const SECTIONS = [
  { href: "/matches", label: "Mes parties", active: (p: string) => /^\/(match|player|record|upload)/.test(p) && !isAnalysis(p) },
  { href: "/analyze", label: "Analyser", active: isAnalysis },
  { href: "/watch", label: "En direct", active: (p: string) => p.startsWith("/watch") },
  { href: "/tournaments", label: "Tournois", active: (p: string) => p.startsWith("/tournaments") },
];

export default function SiteHeader() {
  const path = usePathname() ?? "/";

  return (
    <>
      <a href="#contenu" className="sr-only sr-only-focusable">
        Aller au contenu
      </a>
      <header>
        <div className="shell flex flex-wrap items-center gap-x-7 gap-y-3 py-[18px]">
          <Link href="/" className="heading flex min-h-11 items-center gap-2.5 text-2xl text-ink no-underline hover:text-ink">
            <Logo />
            TenukiGo<span className="sr-only">, accueil</span>
          </Link>
          <nav aria-label="Navigation principale" className="hidden flex-auto md:block">
            <ul className="inline-flex list-none flex-wrap gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_0_rgba(27,26,23,0.06)]">
              {SECTIONS.map((s) => {
                const active = s.active(path);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center rounded-full px-[18px] no-underline ${
                        active ? "bg-ink font-bold text-white hover:text-white" : "font-semibold text-ink hover:bg-sand hover:text-ink"
                      }`}
                    >
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href="/sign-in"
            aria-label="Mon compte"
            className="ml-auto inline-flex size-12 items-center justify-center rounded-full bg-ink text-white no-underline hover:text-white"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx={12} cy={8} r={4} />
              <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
            </svg>
          </Link>
        </div>
      </header>
    </>
  );
}

const TABS = [
  { href: "/", label: "Accueil", active: (p: string) => p === "/", icon: "M3 11l9-7 9 7v9H3z" },
  { href: "/matches", label: "Mes parties", active: (p: string) => /^\/(match|player|record|upload|analyze)/.test(p), icon: "M4 4h6v16H4zM14 4h6v16h-6z" },
  { href: "/watch", label: "En direct", active: (p: string) => /^\/(watch|tournaments)/.test(p), icon: "M3 7h12v10H3zM15 10l6-3v10l-6-3" },
  { href: "/sign-in", label: "Compte", active: (p: string) => p.startsWith("/sign-in"), icon: "M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c1-4 4-6 8-6s7 2 8 6" },
];

/** Tab bar pinned to the bottom of the screen on phones. */
export function MobileNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D5D8DE] bg-white md:hidden">
      <ul className="grid list-none grid-cols-4 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map((t) => {
          const active = t.active(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm no-underline ${
                  active ? "font-extrabold text-ink hover:text-ink" : "text-pebble hover:text-pebble"
                }`}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="shell flex flex-wrap gap-6 pb-28 pt-6 text-[15px] md:pb-10">
      <Link href="/accessibility">Accessibilité</Link>
      <Link href="/players">Joueurs</Link>
      <span className="ml-auto text-pebble">TenukiGo · IMT Atlantique</span>
    </footer>
  );
}
