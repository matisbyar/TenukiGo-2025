"use client";

// State of the "record my game" wizard. Kept in memory (photos are File objects) and shared
// between the wizard and the camera screen; it is lost when the page is reloaded.

import { useSyncExternalStore } from "react";
import { api, ApiError } from "./api";
import { clockTime } from "./format";
import { emptyGame, KEY_POSITION_MARK, parseSgf, type Game, type Point } from "./go";

export interface Photo {
  id: string;
  file: File;
  /** Object URL for the preview. */
  url: string;
  takenAt: number;
  status: "pending" | "ok" | "error";
  stones?: number;
  message?: string;
}

export interface Recording {
  step: 0 | 1 | 2;
  title: string;
  blackId: number | null;
  whiteId: number | null;
  photos: Photo[];
  game: Game | null;
}

const initial: Recording = { step: 0, title: "", blackId: null, whiteId: null, photos: [], game: null };

let state: Recording = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<Recording>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useRecording = () => useSyncExternalStore(subscribe, () => state, () => initial);

let nextId = 0;

export const recording = {
  update: set,
  /** Photos are kept in the order they were taken. */
  addPhotos(files: File[]) {
    const added: Photo[] = files
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: `p${nextId++}`, file, url: URL.createObjectURL(file), takenAt: file.lastModified || Date.now(), status: "pending" }));
    set({ photos: [...state.photos, ...added].sort((a, b) => a.takenAt - b.takenAt), game: null });
  },
  removePhoto(id: string) {
    const photo = state.photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    set({ photos: state.photos.filter((p) => p.id !== id).map((p) => ({ ...p, status: "pending", message: undefined })), game: null });
  },
  reset() {
    state.photos.forEach((p) => URL.revokeObjectURL(p.url));
    set(initial);
  },
};

const countStones = (board: number[][]) => board.flat().filter((v) => v !== 0).length;

function stonesOf(board: number[][], value: number): Point[] {
  const points: Point[] = [];
  board.forEach((row, y) => row.forEach((v, x) => v === value && points.push({ x, y })));
  return points;
}

/** Turns the photo module's English errors into a message for the player, and finds the faulty photo. */
function explain(error: unknown, first: number): { message: string; faulty: number[] } {
  const text = error instanceof Error ? error.message : "";
  if (/first image/i.test(text)) return { message: `Le plateau n'a pas été reconnu sur la photo ${first + 1}.`, faulty: [first] };
  if (/second image/i.test(text)) return { message: `Le plateau n'a pas été reconnu sur la photo ${first + 2}.`, faulty: [first + 1] };
  if (error instanceof ApiError && error.status === 0) return { message: error.message, faulty: [] };
  return { message: `Les photos ${first + 1} et ${first + 2} n'ont pas pu être comparées. ${text}`.trim(), faulty: [first, first + 1] };
}

/**
 * Rebuilds the game from the photos. The backend only knows how to infer the moves between
 * two photos (POST /photo), so consecutive pairs are sent one after the other and chained:
 * the first photo becomes the starting position, each following photo a key position.
 */
export async function reconstruct(
  info: { title: string; black: string; white: string },
  onProgress: (pair: number, pairs: number) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const photos = state.photos;
  const game = emptyGame();
  const label = (p: Photo) => `Photo de ${clockTime(p.takenAt)}`;
  const stones: number[] = [];

  for (let i = 0; i < photos.length - 1; i++) {
    onProgress(i + 1, photos.length - 1);
    try {
      const result = await api.betweenPhotos(photos[i].file, photos[i + 1].file);
      if (i === 0) {
        game.setupBlack = stonesOf(result.initial_board, 1);
        game.setupWhite = stonesOf(result.initial_board, 2);
        stones[0] = countStones(result.initial_board);
      }
      stones[i + 1] = countStones(result.final_board);
      const moves = parseSgf(result.sgf_content).moves;
      if (moves.length > 0) moves[moves.length - 1].comment = `${KEY_POSITION_MARK} · ${label(photos[i + 1])}`;
      game.moves.push(...moves);
    } catch (error) {
      const { message, faulty } = explain(error, i);
      set({
        photos: photos.map((p, n) => (faulty.includes(n) ? { ...p, status: "error", message: "Plateau non reconnu" } : n < i ? { ...p, status: "ok", stones: stones[n] } : p)),
      });
      return { ok: false, message };
    }
  }

  game.info = {
    GN: info.title,
    PB: info.black,
    PW: info.white,
    DT: new Date().toISOString().slice(0, 10),
    SO: "TenukiGo photos",
    TGFIRST: label(photos[0]),
  };
  set({ photos: photos.map((p, n) => ({ ...p, status: "ok", stones: stones[n], message: undefined })), game, step: 2 });
  return { ok: true };
}
