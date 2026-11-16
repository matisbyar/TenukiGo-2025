"use client";

// Composite loaders: the backend returns information over several calls, they are assembled here.

import { useMemo } from "react";
import { api, loadSgf, useLoad, type MatchDetail, type Player, type StreamDetail } from "./api";
import { boardHistory, parseSgf, type Board, type Game } from "./go";

export interface FullMatch {
  detail: MatchDetail;
  black: Player | null;
  white: Player | null;
  sgf: string;
}

export async function loadFullMatch(id: string | number): Promise<FullMatch> {
  const detail = await api.match(id);
  const player = (pid: number | null) => (pid ? api.player(pid).catch(() => null) : Promise.resolve(null));
  const [black, white, sgf] = await Promise.all([player(detail.black), player(detail.white), loadSgf(detail).catch(() => "")]);
  return { detail, black, white, sgf };
}

export function useFullMatch(id: string | number) {
  return useLoad(() => loadFullMatch(id), [id]);
}

/** Parses an SGF and precomputes all its positions (index n = after n moves). */
export function useSgf(sgf: string): { game: Game; boards: Board[] } {
  return useMemo(() => {
    const game = parseSgf(sgf);
    return { game, boards: boardHistory(game) };
  }, [sgf]);
}

/** A tournament table = one backend stream, with its ongoing game. */
export interface TableInfo {
  stream: StreamDetail;
  sgf: string;
  moveCount: number;
}

export async function loadTable(id: string | number): Promise<TableInfo> {
  const stream = await api.stream(id);
  const sgf = await api
    .match(stream.match_id)
    .then(loadSgf)
    .catch(() => "");
  return { stream, sgf, moveCount: parseSgf(sgf).moves.length };
}

export async function loadTables(): Promise<TableInfo[]> {
  const list = await api.streams();
  const tables = await Promise.all(list.map((s) => loadTable(s.stream_id).catch(() => null)));
  return tables.filter((t): t is TableInfo => t !== null);
}
