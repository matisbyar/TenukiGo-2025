"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/SiteHeader";
import { Check, Notice } from "@/components/ui";

/**
 * Sign-in screen of the mockup. Accounts do not exist in the backend yet ("à construire"):
 * the form is the interface only and tells the user so instead of pretending to sign in.
 */
export default function SignInPage() {
  const [visible, setVisible] = useState(false);
  const [asked, setAsked] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAsked(true);
  };

  return (
    <main id="contenu" className="shell flex min-h-dvh flex-wrap items-stretch gap-7 py-8 md:py-12">
      <section aria-labelledby="c-intro" className="flex flex-[1_1_420px] flex-col gap-6 rounded-[28px] bg-wood-light p-9">
        <Link href="/" className="heading inline-flex min-h-11 items-center gap-2.5 self-start text-2xl !text-ink no-underline">
          <Logo size={30} />
          TenukiGo<span className="sr-only">, accueil</span>
        </Link>
        <h2 id="c-intro" className="heading text-[30px] leading-[1.2]">
          Vos parties de go, enregistrées sans effort
        </h2>
        <svg width="100%" height={150} viewBox="0 0 320 150" aria-hidden="true">
          <rect x={20} y={20} width={200} height={120} rx={6} fill="#EBCB8B" />
          <path d="M40 35H200M40 55H200M40 75H200M40 95H200M40 115H200M60 28V132M90 28V132M120 28V132M150 28V132M180 28V132" stroke="#3B2A10" strokeWidth={1} />
          <circle cx={90} cy={55} r={8} fill="#1B1A17" />
          <circle cx={150} cy={95} r={8} fill="#FFFFFF" />
          <circle cx={120} cy={75} r={8} fill="#1B1A17" />
          <rect x={230} y={10} width={70} height={120} rx={10} fill="#24272E" stroke="#E8A317" strokeWidth={2} />
          <circle cx={265} cy={70} r={16} fill="none" stroke="#E8A317" strokeWidth={3} />
        </svg>
        <ul className="flex list-none flex-col gap-3.5">
          {["Retrouvez toutes vos parties au même endroit", "Analysez-les coup par coup", "Diffusez les parties de votre club"].map((text) => (
            <li key={text} className="flex items-center gap-3">
              <Check size={22} />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-auto text-base text-ink-soft">
          Les directs restent visibles{" "}
          <Link href="/watch" className="link-strong">
            sans compte
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="c-title" className="flex flex-[1_1_400px] flex-col justify-center gap-5 rounded-[20px] border border-line bg-white p-7 sm:p-10">
        <h1 id="c-title" className="heading text-[32px]">
          Se connecter
        </h1>
        <Notice type="warning" title="Comptes en construction.">
          La connexion n&apos;est pas encore disponible : toutes les fonctions sont accessibles sans compte.
        </Notice>
        <form onSubmit={submit} className="flex flex-col gap-[18px]">
          <div className="field-group">
            <label htmlFor="c-mail" className="label">
              Adresse e-mail
            </label>
            <input id="c-mail" type="email" autoComplete="email" className="field" />
          </div>
          <div className="field-group">
            <label htmlFor="c-password" className="label">
              Mot de passe
            </label>
            <div className="flex gap-2">
              <input id="c-password" type={visible ? "text" : "password"} autoComplete="current-password" className="field flex-auto" />
              <button type="button" aria-pressed={visible} className="btn btn-thin !min-h-[52px] flex-none" onClick={() => setVisible((v) => !v)}>
                {visible ? "Masquer" : "Afficher"}
                <span className="sr-only"> le mot de passe</span>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary text-[18px]">
            Se connecter
          </button>
        </form>
        <div className="flex items-center gap-3 text-pebble">
          <span aria-hidden="true" className="h-px flex-1 bg-[#D5D8DE]" />
          ou
          <span aria-hidden="true" className="h-px flex-1 bg-[#D5D8DE]" />
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setAsked(true)}>
          Continuer avec Google
        </button>
        <p role="status" className="min-h-6 font-bold text-clay-dark">
          {asked && "Les comptes arrivent bientôt. En attendant, continuez sans vous connecter."}
        </p>
        <p>
          <Link href="/" className="link-strong">
            Continuer sans compte
          </Link>
        </p>
      </section>
    </main>
  );
}
