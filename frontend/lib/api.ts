"use client";

// Client for the existing FastAPI backend. No route is added: the frontend adapts to what exists.
// Error messages are user-facing, hence in French.

import { useCallback, useEffect, useState } from "react";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

export const API_URL = trimSlash(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
export const STORAGE_URL = trimSlash(process.env.NEXT_PUBLIC_STORAGE_URL ?? `${API_URL}/storage`);
export const WS_URL = trimSlash(process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/match");
export const GOINSIGHT_URL = trimSlash(process.env.NEXT_PUBLIC_GOINSIGHT_SERVICE_URL ?? "http://localhost:5002");
export const ORGANIZER_PASSWORD = process.env.NEXT_PUBLIC_PASSWORD ?? "";
export const DEFAULT_STREAM_URL = "http://localhost:8080/live/streamkey/index.m3u8";

export const storageUrl = (path: string) => `${STORAGE_URL}/${path.replace(/^\/+/, "")}`;

// --- Backend types ---------------------------------------------------------------

export interface Player {
  player_id: number;
  firstname: string | null;
  lastname: string | null;
  level: string | null;
}

export interface PlayerProfile extends Player {
  matches: number[];
  count_matches: number;
  wins: number;
}

/** Item of GET /matches: players are full names there. */
export interface MatchSummary {
  match_id: number;
  title: string;
  result: string | null;
  date: string | null;
  duration: number | null;
  description: string | null;
  style: string | null;
  sgf: string | null;
  white: string | null;
  black: string | null;
  video_id: number | null;
  video_sgf: string | null;
}

/** GET /match/{id}: players are ids there. */
export interface MatchDetail {
  match_id: number;
  title: string;
  result: string | null;
  style: string | null;
  white: number | null;
  black: number | null;
  duration: number | null;
  date: string | null;
  video_id: number | null;
  video: string | null;
  video_sgf: string | null;
  sgf: string | null;
}

export interface StreamSummary {
  stream_id: number;
  url: string;
  title: string | null;
}

export interface StreamDetail extends StreamSummary {
  match_id: number;
  white: string | null;
  white_id: number | null;
  black: string | null;
  black_id: number | null;
  style: string | null;
  description: string | null;
  date: string | null;
}

export interface PositionAnalysis {
  move: string;
  scoreLead: number;
  possibleVariation: string[];
}

export interface GameAnalysis {
  turnData: Record<string, { winrate: number; scoreLead: number; bestMove: string; nextPlayer: string; classification: string }>;
  scoreLeadList: number[];
}

// --- Requests --------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const UNREACHABLE = "Le serveur ne répond pas. Vérifiez qu'il est démarré.";

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "Certaines informations sont manquantes ou invalides.";
  if (detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string") {
    return (detail as { message: string }).message;
  }
  return `Le serveur a répondu avec une erreur (${status}).`;
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, init);
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new ApiError(errorMessage(body, response.status), response.status);
  return body as T;
}

/** Builds a multipart body, skipping empty values. */
export function formBody(fields: Record<string, string | number | File | null | undefined>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") continue;
    if (value instanceof File) form.append(key, value, value.name);
    else form.append(key, String(value));
  }
  return form;
}

const sgfFile = (sgf: string) => new File([sgf], "partie.sgf", { type: "application/x-go-sgf" });
const post = (fields: Parameters<typeof formBody>[0]): RequestInit => ({ method: "POST", body: formBody(fields) });

export interface MatchFields {
  title?: string;
  white?: number;
  black?: number;
  result?: string;
  style?: string;
  date?: string;
  description?: string;
  sgf?: string;
}

export const api = {
  matches: () => request<{ matches: MatchSummary[] }>(API_URL, "/matches").then((r) => r.matches),
  match: (id: number | string) => request<MatchDetail>(API_URL, `/match/${id}`),
  createMatch: (fields: MatchFields & { title: string; white: number; black: number; result: string }) =>
    request<{ match_id: number }>(API_URL, "/match/create", post({ ...fields, sgf: fields.sgf ? sgfFile(fields.sgf) : undefined })),
  editMatch: (id: number | string, fields: MatchFields) =>
    request<MatchDetail>(API_URL, `/match/${id}/edit`, post({ ...fields, sgf: fields.sgf ? sgfFile(fields.sgf) : undefined })),
  deleteMatch: (id: number | string) => request<unknown>(API_URL, `/match/${id}/delete`, { method: "DELETE" }),

  players: () => request<{ players: Player[] }>(API_URL, "/players").then((r) => r.players),
  player: (id: number | string) => request<PlayerProfile>(API_URL, `/player/${id}`),
  createPlayer: (fields: { firstname: string; lastname: string; level?: string }) =>
    request<{ player_id: number }>(API_URL, "/player/create", post(fields)),
  // The backend erases the level when it is not sent back, so it is always sent.
  editPlayer: (id: number | string, fields: { firstname: string; lastname: string; level: string }) =>
    request<PlayerProfile>(API_URL, `/player/${id}/edit`, post(fields)),
  deletePlayer: (id: number | string) => request<unknown>(API_URL, `/player/${id}/delete`, { method: "DELETE" }),

  streams: () => request<{ streams: StreamSummary[] }>(API_URL, "/streams").then((r) => r.streams),
  stream: (id: number | string) => request<StreamDetail>(API_URL, `/stream/${id}`),
  createStream: (fields: { title: string; style: string; white: number; black: number; url: string; description?: string }) =>
    request<{ stream_id: number }>(API_URL, "/stream/create", post(fields)),
  startAnalysis: (id: number | string) => request<unknown>(API_URL, `/stream/${id}/start-analysis`, { method: "POST" }),
  stopAnalysis: (id: number | string) => request<unknown>(API_URL, `/stream/${id}/stop-analysis`, { method: "POST" }),

  /** Infers the moves played between two photos (photo module). Boards are [row][col], 1 = black, 2 = white. */
  betweenPhotos: (image1: File, image2: File) =>
    request<{ sgf_content: string; initial_board: number[][]; final_board: number[][] }>(API_URL, "/photo", post({ image1, image2 })),

  /** Analysis of one position (GoInsight / KataGo): best moves for the player to move. */
  analyzePosition: (sgf: string, turn: number) =>
    request<PositionAnalysis[]>(GOINSIGHT_URL, "/analyse/deep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sgf_content: sgf, turn, invert_selection: false }),
    }),
  /** Analysis of the whole game: slow (around ten seconds per move). */
  analyzeGame: (sgf: string) => request<GameAnalysis>(GOINSIGHT_URL, "/analyse/shallow", post({ sgf_content: sgf })),

  text: async (url: string) => {
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      throw new ApiError(UNREACHABLE, 0);
    }
    if (!response.ok) throw new ApiError("Fichier introuvable.", response.status);
    return response.text();
  },
};

/** SGF path of a match: its own, otherwise the one extracted from its video. */
export const sgfPath = (m: { sgf: string | null; video_sgf?: string | null }) => m.sgf || m.video_sgf || null;

export async function loadSgf(m: { sgf: string | null; video_sgf?: string | null }): Promise<string> {
  const path = sgfPath(m);
  return path ? api.text(storageUrl(path)) : "";
}

// --- Loading hook ----------------------------------------------------------------

export interface LoadState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]): LoadState<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((e) => {
        if (!active) return;
        const error = e instanceof ApiError ? e : new ApiError("Une erreur inattendue est survenue.", 0);
        setState({ data: null, error, loading: false });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

export const messageOf = (e: unknown) => (e instanceof Error ? e.message : "Une erreur inattendue est survenue.");
