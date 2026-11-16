"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, storageUrl, WS_URL } from "./api";

/**
 * Follows a live game over the match WebSocket (/ws/match/{id}).
 * The backend broadcasts the path of the SGF file each time the analyser rewrites it;
 * any client may also push a new SGF, which is how the control room corrects a move.
 */
export function useLiveSgf(matchId: number, initialSgf: string) {
  const [sgf, setSgf] = useState(initialSgf);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  /** True once the connection has been lost or refused (not while it is still opening). */
  const [dropped, setDropped] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_URL}/${matchId}`);
    } catch {
      return;
    }
    socket.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setDropped(false);
    };
    ws.onclose = () => {
      setConnected(false);
      if (socket.current === ws) setDropped(true);
    };
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as { type: string; data: string };
        if (!message.data) return;
        setSgf(await api.text(`${storageUrl(message.data)}?t=${Date.now()}`));
        if (message.type === "sgf_final") setEnded(true);
      } catch {
        // A malformed message or a missing file must not interrupt the broadcast.
      }
    };
    return () => {
      socket.current = null;
      ws.close();
    };
  }, [matchId]);

  /** Publishes a corrected SGF to the backend (saved to the file and sent to every spectator). */
  const publish = useCallback((next: string): boolean => {
    const ws = socket.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "sgf_update", sgf: next }));
    setSgf(next);
    return true;
  }, []);

  return { sgf, connected, dropped, ended, publish };
}
