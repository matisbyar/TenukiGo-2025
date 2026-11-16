"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { type Board, type Color, type Point, pointName } from "@/lib/go";

const LETTERS = "ABCDEFGHJKLMNOPQRST";
const STEP = 20;

export interface GobanProps {
  board: Board;
  /** Description read by screen readers. */
  label: string;
  lastMove?: Point | null;
  /** Suggested moves: slate circles with a letter. */
  suggestions?: (Point & { letter: string })[];
  /** Continuation of a variation: numbered stones. */
  sequence?: (Point & { color: Color; number: number })[];
  /** Selected stone (slate frame). */
  selected?: Point | null;
  /** Proposed new location (dashed stone). */
  ghost?: (Point & { color: Color }) | null;
  showCoordinates?: boolean;
  onPoint?: (p: Point) => void;
  className?: string;
}

function starPoints(size: number): number[] {
  if (size === 19) return [3, 9, 15];
  if (size === 13) return [3, 6, 9];
  if (size === 9) return [2, 4, 6];
  return [];
}

export default function Goban({
  board,
  label,
  lastMove,
  suggestions = [],
  sequence = [],
  selected,
  ghost,
  showCoordinates = true,
  onPoint,
  className,
}: GobanProps) {
  const size = board.length;
  const margin = showCoordinates ? 30 : 14;
  const side = margin * 2 + (size - 1) * STEP;
  const pos = (i: number) => margin + i * STEP;
  const [cursor, setCursor] = useState<Point | null>(null);
  const [focused, setFocused] = useState(false);

  const grid = Array.from({ length: size }, (_, i) => `M${margin} ${pos(i)}H${side - margin}M${pos(i)} ${margin}V${side - margin}`).join("");
  const stars = starPoints(size);
  const interactive = Boolean(onPoint);

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onPoint) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round((((e.clientX - r.left) / r.width) * side - margin) / STEP);
    const y = Math.round((((e.clientY - r.top) / r.height) * side - margin) / STEP);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    setCursor({ x, y });
    onPoint({ x, y });
  };

  // Arrow keys move the cursor, Enter or Space validates.
  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!onPoint) return;
    const c = cursor ?? lastMove ?? { x: Math.floor(size / 2), y: Math.floor(size / 2) };
    const clamp = (n: number) => Math.max(0, Math.min(size - 1, n));
    const targets: Record<string, Point> = {
      ArrowLeft: { x: clamp(c.x - 1), y: c.y },
      ArrowRight: { x: clamp(c.x + 1), y: c.y },
      ArrowUp: { x: c.x, y: clamp(c.y - 1) },
      ArrowDown: { x: c.x, y: clamp(c.y + 1) },
    };
    if (targets[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      setCursor(targets[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setCursor(c);
      onPoint(c);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${side} ${side}`}
      className={className}
      style={{ width: "100%", height: "auto", display: "block", cursor: interactive ? "pointer" : undefined, touchAction: "manipulation" }}
      role={interactive ? "application" : "img"}
      aria-label={interactive && cursor ? `${label} Curseur en ${pointName(cursor, size)}.` : label}
      tabIndex={interactive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <rect width={side} height={side} rx={6} fill="#EBCB8B" />
      {showCoordinates && (
        <g fill="#3B2A10" fontFamily="var(--font-mono)" fontSize={10} aria-hidden="true">
          {Array.from({ length: size }, (_, i) => (
            <text key={`c${i}`} x={pos(i)} y={18} textAnchor="middle">
              {LETTERS[i]}
            </text>
          ))}
          {Array.from({ length: size }, (_, i) => (
            <text key={`r${i}`} x={20} y={pos(i) + 4} textAnchor="end">
              {size - i}
            </text>
          ))}
        </g>
      )}
      <path d={grid} stroke="#3B2A10" strokeWidth={1} fill="none" />
      <g fill="#3B2A10">{stars.flatMap((y) => stars.map((x) => <circle key={`h${x}-${y}`} cx={pos(x)} cy={pos(y)} r={3} />))}</g>

      {board.flatMap((row, y) =>
        row.map((c, x) =>
          c ? <circle key={`s${x}-${y}`} cx={pos(x)} cy={pos(y)} r={9.3} fill={c === "B" ? "#1B1A17" : "#FFFFFF"} stroke="#1B1A17" strokeWidth={1.2} /> : null,
        ),
      )}

      {lastMove && board[lastMove.y]?.[lastMove.x] && (
        <circle
          cx={pos(lastMove.x)}
          cy={pos(lastMove.y)}
          r={4.5}
          fill="none"
          stroke={board[lastMove.y][lastMove.x] === "B" ? "#FFFFFF" : "#1B1A17"}
          strokeWidth={2}
        />
      )}

      {sequence.map((s) => (
        <g key={`q${s.number}`}>
          <circle cx={pos(s.x)} cy={pos(s.y)} r={9.3} fill={s.color === "B" ? "#1B1A17" : "#FFFFFF"} stroke="#2E5A8A" strokeWidth={2} />
          <text x={pos(s.x)} y={pos(s.y) + 3.5} textAnchor="middle" fontSize={10} fontWeight={800} fill={s.color === "B" ? "#FFFFFF" : "#1B1A17"}>
            {s.number}
          </text>
        </g>
      ))}

      {suggestions.map((s) => (
        <g key={`a${s.letter}`}>
          <circle cx={pos(s.x)} cy={pos(s.y)} r={10} fill="#2E5A8A" />
          <text x={pos(s.x)} y={pos(s.y) + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#FFFFFF">
            {s.letter}
          </text>
        </g>
      ))}

      {ghost && (
        <circle
          cx={pos(ghost.x)}
          cy={pos(ghost.y)}
          r={9.3}
          fill={ghost.color === "B" ? "#1B1A17" : "#FFFFFF"}
          fillOpacity={ghost.color === "B" ? 0.35 : 0.75}
          stroke="#1B1A17"
          strokeDasharray="3 2"
        />
      )}

      {selected && <rect x={pos(selected.x) - 14} y={pos(selected.y) - 14} width={28} height={28} fill="none" stroke="#2E5A8A" strokeWidth={3} />}

      {interactive && focused && cursor && (
        <rect x={pos(cursor.x) - 11} y={pos(cursor.y) - 11} width={22} height={22} rx={4} fill="none" stroke="#9A4A08" strokeWidth={3} />
      )}
    </svg>
  );
}
