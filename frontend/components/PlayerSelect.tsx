"use client";

import { useState } from "react";
import { api, messageOf, type Player } from "@/lib/api";
import { playerNameWithLevel } from "@/lib/format";
import type { Color } from "@/lib/go";
import { Stone } from "./ui";

const NEW = "__new__";

/** Picks an existing player, or creates one on the spot (POST /player/create). */
export default function PlayerSelect({
  id,
  label,
  color,
  players,
  value,
  onChange,
  onCreated,
  invalid,
  compact,
}: {
  id: string;
  label: string;
  color?: Color;
  players: Player[];
  value: number | null;
  onChange: (playerId: number | null) => void;
  /** Called with the new player so the caller can add it to its list. */
  onCreated: (player: Player) => void;
  invalid?: boolean;
  /** Hides the visible label (tables). */
  compact?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      setError("Indiquez le prénom et le nom.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fields = { firstname: firstname.trim(), lastname: lastname.trim(), level: level.trim() };
      const { player_id } = await api.createPlayer(fields);
      onCreated({ player_id, ...fields, level: fields.level || null });
      onChange(player_id);
      setCreating(false);
      setFirstname("");
      setLastname("");
      setLevel("");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field-group min-w-0">
      <label htmlFor={id} className={compact ? "sr-only" : "label inline-flex items-center gap-2"}>
        {color && !compact && <Stone color={color} />}
        {label}
      </label>
      <select
        id={id}
        className="field pr-9"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        value={creating ? NEW : (value ?? "")}
        onChange={(e) => {
          if (e.target.value === NEW) {
            setCreating(true);
            onChange(null);
          } else {
            setCreating(false);
            onChange(e.target.value ? Number(e.target.value) : null);
          }
        }}
      >
        <option value="">Choisir un joueur</option>
        {players.map((p) => (
          <option key={p.player_id} value={p.player_id}>
            {playerNameWithLevel(p)}
          </option>
        ))}
        <option value={NEW}>+ Nouveau joueur…</option>
      </select>
      {invalid && !creating && (
        <span id={`${id}-error`} className="field-error">
          À indiquer
        </span>
      )}

      {creating && (
        <fieldset className="mt-1 flex flex-col gap-2.5 rounded-2xl bg-sand p-3.5">
          <legend className="sr-only">Nouveau joueur ({label})</legend>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
            <div className="field-group">
              <label htmlFor={`${id}-first`} className="text-[15px] font-bold">
                Prénom
              </label>
              <input id={`${id}-first`} className="field !min-h-11" value={firstname} onChange={(e) => setFirstname(e.target.value)} autoComplete="off" />
            </div>
            <div className="field-group">
              <label htmlFor={`${id}-last`} className="text-[15px] font-bold">
                Nom
              </label>
              <input id={`${id}-last`} className="field !min-h-11" value={lastname} onChange={(e) => setLastname(e.target.value)} autoComplete="off" />
            </div>
            <div className="field-group">
              <label htmlFor={`${id}-level`} className="text-[15px] font-bold">
                Niveau <span className="font-normal text-pebble">(ex. 5k)</span>
              </label>
              <input id={`${id}-level`} className="field !min-h-11" value={level} onChange={(e) => setLevel(e.target.value)} autoComplete="off" />
            </div>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="btn btn-primary !min-h-11" onClick={create} disabled={busy}>
              {busy ? "Ajout…" : "Ajouter le joueur"}
            </button>
            <button type="button" className="btn btn-thin" onClick={() => setCreating(false)}>
              Annuler
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
