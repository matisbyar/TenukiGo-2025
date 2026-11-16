"use client";

import { useEffect, useState } from "react";
import { api, storageUrl } from "@/lib/api";
import { boardHistory, parseSgf, type Board } from "@/lib/go";

const cache = new Map<string, Board | null>();

/** Small board without coordinates, for lists. */
export function MiniBoard({ board, className }: { board: Board | null; className?: string }) {
  const size = board?.length ?? 19;
  const step = 100 / (size + 1);
  const pos = (i: number) => (i + 1) * step;
  const grid = Array.from({ length: size }, (_, i) => `M${pos(0)} ${pos(i)}H${pos(size - 1)}M${pos(i)} ${pos(0)}V${pos(size - 1)}`).join("");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" style={{ display: "block" }}>
      <rect width={100} height={100} fill="#EBCB8B" />
      <path d={grid} stroke="#9A6B2A" strokeWidth={0.5} fill="none" />
      {board?.flatMap((row, y) =>
        row.map((c, x) =>
          c ? <circle key={`${x}-${y}`} cx={pos(x)} cy={pos(y)} r={step * 0.46} fill={c === "B" ? "#1B1A17" : "#FFFFFF"} stroke="#1B1A17" strokeWidth={0.4} /> : null,
        ),
      )}
    </svg>
  );
}

/** Final position of a match, read from its SGF file in storage. */
export default function BoardThumbnail({ sgf, className }: { sgf: string | null; className?: string }) {
  const [board, setBoard] = useState<Board | null>(sgf ? (cache.get(sgf) ?? null) : null);

  useEffect(() => {
    if (!sgf || cache.has(sgf)) return;
    let active = true;
    api
      .text(storageUrl(sgf))
      .then((text) => {
        const history = boardHistory(parseSgf(text));
        cache.set(sgf, history[history.length - 1]);
      })
      .catch(() => cache.set(sgf, null))
      .finally(() => active && setBoard(cache.get(sgf) ?? null));
    return () => {
      active = false;
    };
  }, [sgf]);

  return <MiniBoard board={board} className={className} />;
}
