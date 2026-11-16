import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Charte « Bois et pierre » : Bricolage Grotesque pour les titres,
// Atkinson Hyperlegible (conçue pour les personnes malvoyantes) pour le texte.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: { default: "TenukiGo", template: "%s — TenukiGo" },
  description: "Vos parties de go, retrouvées et analysées : photos du plateau, analyse et diffusion de tournois.",
};

export const viewport: Viewport = {
  themeColor: "#FBF6EC",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${atkinson.variable} ${atkinsonMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
