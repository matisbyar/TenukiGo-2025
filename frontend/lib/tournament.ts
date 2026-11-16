"use client";

// The backend has no notion of tournament: a tournament round is a set of streams (one per filmed table).
// Its name and round number only live in this browser, and in the title given to each stream.

import { useEffect, useState } from "react";
import type { StreamSummary } from "./api";

export interface Tournament {
  name: string;
  round: string;
}

const KEY = "tenukigo.tournament";

export function readTournament(): Tournament | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tournament) : null;
  } catch {
    return null;
  }
}

export function saveTournament(t: Tournament) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // Private browsing: the name is simply not remembered.
  }
}

export function useTournament(): Tournament | null {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  useEffect(() => setTournament(readTournament()), []);
  return tournament;
}

export const streamTitle = (t: Tournament, table: number) => `${t.name} — ronde ${t.round}, table ${table}`;

/** Table number: read from the stream title when it was created here, otherwise the stream id. */
export function tableNumber(stream: Pick<StreamSummary, "stream_id" | "title">): number {
  const m = stream.title?.match(/table\s+(\d+)/i);
  return m ? Number(m[1]) : stream.stream_id;
}

export const defaultStreamUrl = (table: number) => `http://localhost:8080/live/table${table}/index.m3u8`;
