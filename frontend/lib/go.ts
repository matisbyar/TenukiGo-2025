// Go game logic: SGF reading and writing, stone placement, captures, coordinates.

export type Color = "B" | "W";
export type Board = (Color | null)[][];

export interface Point {
  x: number;
  y: number;
}

export interface Move {
  color: Color;
  x: number;
  y: number;
  pass: boolean;
  comment?: string;
  /** Stones placed outside of alternation (AB / AW properties of a node). */
  addBlack?: Point[];
  addWhite?: Point[];
}

export interface Game {
  size: number;
  /** Root properties (PB, PW, DT, RE, GN, SO, KM...). */
  info: Record<string, string>;
  setupBlack: Point[];
  setupWhite: Point[];
  moves: Move[];
}

export const BOARD_SIZE = 19;
const LETTERS = "ABCDEFGHJKLMNOPQRST";
/** Prefix of the SGF comments that mark a key position (one photo). Stored in the file, so kept in French. */
export const KEY_POSITION_MARK = "Position clé";

export const emptyGame = (): Game => ({
  size: BOARD_SIZE,
  info: {},
  setupBlack: [],
  setupWhite: [],
  moves: [],
});

export const emptyBoard = (size = BOARD_SIZE): Board =>
  Array.from({ length: size }, () => Array<Color | null>(size).fill(null));

export const opposite = (c: Color): Color => (c === "B" ? "W" : "B");
/** Display name of a colour (UI text, French). */
export const colorName = (c: Color) => (c === "B" ? "Noir" : "Blanc");

/** Human-readable coordinate such as "Q16" (there is no letter I). */
export function pointName(p: Point, size = BOARD_SIZE): string {
  return `${LETTERS[p.x]}${size - p.y}`;
}

export function parsePointName(name: string, size = BOARD_SIZE): Point | null {
  const m = name.trim().toUpperCase().match(/^([A-HJ-T])(\d{1,2})$/);
  if (!m) return null;
  const x = LETTERS.indexOf(m[1]);
  const y = size - parseInt(m[2], 10);
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return { x, y };
}

// ---------------------------------------------------------------------------
// SGF reading (main line only)
// ---------------------------------------------------------------------------

type Node = Record<string, string[]>;

function readNodes(text: string): Node[] {
  const nodes: Node[] = [];
  const stack: number[] = [];
  let skipping = 0;
  let current: Node | null = null;
  let i = 0;
  let started = false;

  while (i < text.length) {
    const c = text[i];
    if (c === "(") {
      if (skipping > 0) skipping++;
      else if (stack.length > 0 && stack[stack.length - 1] > 0) skipping = 1;
      else {
        if (stack.length > 0) stack[stack.length - 1]++;
        stack.push(0);
        started = true;
      }
      i++;
    } else if (c === ")") {
      if (skipping > 0) skipping--;
      else {
        stack.pop();
        if (started && stack.length === 0) break;
      }
      i++;
    } else if (c === ";") {
      if (skipping === 0) {
        current = {};
        nodes.push(current);
      }
      i++;
    } else if (/[A-Za-z]/.test(c)) {
      let key = "";
      while (i < text.length && /[A-Za-z]/.test(text[i])) key += text[i++];
      key = key.replace(/[a-z]/g, "");
      const values: string[] = [];
      for (;;) {
        while (i < text.length && /\s/.test(text[i])) i++;
        if (text[i] !== "[") break;
        i++;
        let v = "";
        while (i < text.length && text[i] !== "]") {
          if (text[i] === "\\" && i + 1 < text.length) i++;
          v += text[i++];
        }
        i++;
        values.push(v);
      }
      if (skipping === 0 && current && key && values.length) {
        current[key] = (current[key] ?? []).concat(values);
      }
    } else {
      i++;
    }
  }
  return nodes;
}

function readPoint(v: string, size: number): Point | null {
  if (v.length < 2) return null;
  const x = v.charCodeAt(0) - 97;
  const y = v.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return { x, y };
}

function readPoints(values: string[] | undefined, size: number): Point[] {
  return (values ?? []).map((v) => readPoint(v, size)).filter((p): p is Point => p !== null);
}

export function parseSgf(text: string): Game {
  const game = emptyGame();
  const nodes = readNodes(text ?? "");
  if (nodes.length === 0) return game;

  const root = nodes[0];
  const size = parseInt(root.SZ?.[0] ?? "", 10);
  if (size >= 5 && size <= 19) game.size = size;
  for (const [key, values] of Object.entries(root)) {
    if (!["B", "W", "AB", "AW", "SZ", "GM", "FF", "CA", "C"].includes(key)) {
      game.info[key] = values[0];
    }
  }

  nodes.forEach((node, index) => {
    const hasMove = node.B !== undefined || node.W !== undefined;
    const black = readPoints(node.AB, game.size);
    const white = readPoints(node.AW, game.size);

    if (index === 0 && !hasMove) {
      game.setupBlack = black;
      game.setupWhite = white;
      return;
    }
    if (!hasMove && black.length === 0 && white.length === 0) return;

    const color: Color = node.W !== undefined && node.B === undefined ? "W" : "B";
    const point = hasMove ? readPoint((node.B ?? node.W)[0] ?? "", game.size) : null;
    const move: Move = {
      color,
      x: point?.x ?? -1,
      y: point?.y ?? -1,
      pass: point === null,
    };
    if (black.length) move.addBlack = black;
    if (white.length) move.addWhite = white;
    if (node.C?.[0] && index > 0) move.comment = node.C[0];
    game.moves.push(move);
  });

  return game;
}

// ---------------------------------------------------------------------------
// SGF writing
// ---------------------------------------------------------------------------

const escapeValue = (v: string) => v.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
const sgfPoint = (p: Point) => String.fromCharCode(97 + p.x) + String.fromCharCode(97 + p.y);
const pointList = (points: Point[]) => points.map((p) => `[${sgfPoint(p)}]`).join("");

export function writeSgf(game: Game): string {
  let s = `(;GM[1]FF[4]CA[UTF-8]SZ[${game.size}]`;
  for (const [key, value] of Object.entries(game.info)) {
    if (value !== undefined && value !== "") s += `${key}[${escapeValue(value)}]`;
  }
  if (game.setupBlack.length) s += "AB" + pointList(game.setupBlack);
  if (game.setupWhite.length) s += "AW" + pointList(game.setupWhite);
  for (const move of game.moves) {
    s += `\n;${move.color}[${move.pass ? "" : sgfPoint(move)}]`;
    if (move.addBlack?.length) s += "AB" + pointList(move.addBlack);
    if (move.addWhite?.length) s += "AW" + pointList(move.addWhite);
    if (move.comment) s += `C[${escapeValue(move.comment)}]`;
  }
  return s + ")\n";
}

// ---------------------------------------------------------------------------
// Rules: placement and captures
// ---------------------------------------------------------------------------

function neighbors(x: number, y: number, size: number): Point[] {
  return [
    { x, y: y - 1 },
    { x, y: y + 1 },
    { x: x - 1, y },
    { x: x + 1, y },
  ].filter((p) => p.x >= 0 && p.y >= 0 && p.x < size && p.y < size);
}

/** Returns the group's stones if it has no liberty left, otherwise null. */
function deadGroup(board: Board, start: Point): Point[] | null {
  const color = board[start.y][start.x];
  if (!color) return null;
  const size = board.length;
  const seen = new Set<number>();
  const stones: Point[] = [];
  const stack = [start];
  while (stack.length) {
    const p = stack.pop()!;
    const key = p.y * size + p.x;
    if (seen.has(key)) continue;
    seen.add(key);
    stones.push(p);
    for (const n of neighbors(p.x, p.y, size)) {
      const content = board[n.y][n.x];
      if (content === null) return null;
      if (content === color) stack.push(n);
    }
  }
  return stones;
}

export function play(board: Board, move: Move): Board {
  const next = board.map((row) => [...row]);
  const size = next.length;
  move.addBlack?.forEach((p) => (next[p.y][p.x] = "B"));
  move.addWhite?.forEach((p) => (next[p.y][p.x] = "W"));
  if (move.pass || move.x < 0 || move.y < 0) return next;

  next[move.y][move.x] = move.color;
  for (const n of neighbors(move.x, move.y, size)) {
    if (next[n.y][n.x] === opposite(move.color)) {
      deadGroup(next, n)?.forEach((p) => (next[p.y][p.x] = null));
    }
  }
  deadGroup(next, move)?.forEach((p) => (next[p.y][p.x] = null));
  return next;
}

/** Every position of the game: index n = board after n moves. */
export function boardHistory(game: Game): Board[] {
  let board = emptyBoard(game.size);
  game.setupBlack.forEach((p) => (board[p.y][p.x] = "B"));
  game.setupWhite.forEach((p) => (board[p.y][p.x] = "W"));
  const history = [board];
  for (const move of game.moves) {
    board = play(board, move);
    history.push(board);
  }
  return history;
}

export function countStones(board: Board): number {
  return board.reduce((n, row) => n + row.filter(Boolean).length, 0);
}

/** Colour to play after n moves. */
export function toPlay(game: Game, n: number): Color {
  if (n > 0) return opposite(game.moves[n - 1].color);
  if (game.moves.length > 0) return game.moves[0].color;
  return game.setupBlack.length > game.setupWhite.length ? "W" : "B";
}

export interface KeyPosition {
  /** Number of moves played to reach this position. */
  index: number;
  label: string;
}

/** Key positions: the starting position when it comes from a photo, then every marked move. */
export function keyPositions(game: Game): KeyPosition[] {
  const keys: KeyPosition[] = [];
  if (game.info.SO?.toLowerCase().includes("photo") && game.setupBlack.length + game.setupWhite.length > 0) {
    keys.push({ index: 0, label: game.info.TGFIRST ?? "" });
  }
  game.moves.forEach((move, i) => {
    if (move.comment?.startsWith(KEY_POSITION_MARK)) {
      keys.push({ index: i + 1, label: move.comment.split("·")[1]?.trim() ?? "" });
    }
  });
  return keys;
}

/** Displayed move numbers count the stones of the first photo as moves already played. */
export function moveOffset(game: Game): number {
  return game.setupBlack.length + game.setupWhite.length;
}

export function downloadSgf(sgf: string, name: string) {
  const url = URL.createObjectURL(new Blob([sgf], { type: "application/x-go-sgf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "partie"}.sgf`;
  link.click();
  URL.revokeObjectURL(url);
}
