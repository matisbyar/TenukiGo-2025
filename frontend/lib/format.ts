// Display helpers. Returned strings are UI text, hence in French.

import type { Player } from "./api";

export function playerName(p: Pick<Player, "firstname" | "lastname"> | null | undefined): string {
  if (!p) return "Joueur inconnu";
  return [p.firstname, p.lastname].filter(Boolean).join(" ").trim() || "Joueur inconnu";
}

export function playerNameWithLevel(p: Player | null | undefined): string {
  const name = playerName(p);
  return p?.level ? `${name} (${p.level})` : name;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

const parseDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

export function shortDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Date inconnue";
}

export function longDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date inconnue";
}

export function clockTime(d: Date | number): string {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function toDateInput(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The backend stores "black" / "white"; the legacy interface wrote French labels. Both are understood. */
export type Winner = "B" | "W" | "draw" | null;

export function winnerOf(result: string | null | undefined): Winner {
  const r = (result ?? "").toLowerCase();
  if (r === "black" || r.startsWith("noir") || r.startsWith("b+")) return "B";
  if (r === "white" || r.startsWith("blanc") || r.startsWith("w+")) return "W";
  if (r === "draw" || r === "nul") return "draw";
  return null;
}

export function resultLabel(result: string | null | undefined): string {
  switch (winnerOf(result)) {
    case "B":
      return "Noir gagne";
    case "W":
      return "Blanc gagne";
    case "draw":
      return "Partie nulle";
    default:
      return "";
  }
}

export const RESULTS = [
  { value: "unknown", label: "Non renseigné" },
  { value: "black", label: "Noir gagne" },
  { value: "white", label: "Blanc gagne" },
  { value: "draw", label: "Partie nulle" },
];

export const STYLES = [
  { value: "amical", label: "Partie amicale" },
  { value: "tournoi", label: "Tournoi" },
  { value: "pédagogique", label: "Partie pédagogique" },
];

export const isTournament = (style: string | null | undefined) => /tourn/i.test(style ?? "");

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n > 1 ? pluralWord : word}`;

export const decimal = (n: number, digits = 1) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
