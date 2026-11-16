"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, messageOf, type Player } from "@/lib/api";
import { Notice } from "./ui";

/** Creates a player, or edits (and possibly deletes) an existing one. */
export default function PlayerForm({ player }: { player?: Player }) {
  const router = useRouter();
  const [firstname, setFirstname] = useState(player?.firstname ?? "");
  const [lastname, setLastname] = useState(player?.lastname ?? "");
  const [level, setLevel] = useState(player?.level ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!firstname.trim() || !lastname.trim()) return;
    setBusy(true);
    setError("");
    const fields = { firstname: firstname.trim(), lastname: lastname.trim(), level: level.trim() };
    try {
      const id = player ? (await api.editPlayer(player.player_id, fields)).player_id : (await api.createPlayer(fields)).player_id;
      router.push(`/player/${id}`);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!player) return;
    try {
      await api.deletePlayer(player.player_id);
      router.push("/players");
    } catch (err) {
      // The backend refuses to delete a player who still has matches.
      const message = messageOf(err);
      setError(/associated matches/i.test(message) ? "Ce joueur a encore des parties : supprimez-les ou changez leurs joueurs d'abord." : message);
      setConfirming(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <section className="panel !gap-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div className="field-group">
            <label htmlFor="p-first" className="label">
              Prénom
            </label>
            <input id="p-first" className="field" value={firstname} onChange={(e) => setFirstname(e.target.value)} aria-invalid={(submitted && !firstname.trim()) || undefined} autoComplete="off" />
            {submitted && !firstname.trim() && <span className="field-error">À indiquer</span>}
          </div>
          <div className="field-group">
            <label htmlFor="p-last" className="label">
              Nom
            </label>
            <input id="p-last" className="field" value={lastname} onChange={(e) => setLastname(e.target.value)} aria-invalid={(submitted && !lastname.trim()) || undefined} autoComplete="off" />
            {submitted && !lastname.trim() && <span className="field-error">À indiquer</span>}
          </div>
          <div className="field-group">
            <label htmlFor="p-level" className="label">
              Niveau <span className="font-normal text-pebble">(facultatif, ex. 5k ou 3d)</span>
            </label>
            <input id="p-level" className="field" value={level} onChange={(e) => setLevel(e.target.value)} autoComplete="off" />
          </div>
        </div>
      </section>

      {error && (
        <Notice type="error" title="Action impossible.">
          {error}
        </Notice>
      )}

      <div className="action-bar">
        <Link href={player ? `/player/${player.player_id}` : "/players"} className="link-strong">
          Annuler
        </Link>
        <button type="submit" className="btn btn-primary text-[18px]" disabled={busy}>
          {busy ? "Enregistrement…" : player ? "Enregistrer les modifications" : "Ajouter le joueur"}
        </button>
      </div>

      {player &&
        (confirming ? (
          <div role="alertdialog" aria-label="Confirmer la suppression" className="flex flex-col gap-3 rounded-[20px] bg-danger-light p-4">
            <p>
              <strong>Supprimer ce joueur ?</strong> Cette action est définitive.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-red !min-h-11" onClick={remove}>
                Supprimer définitivement
              </button>
              <button type="button" className="btn btn-thin font-bold" onClick={() => setConfirming(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-danger self-start" onClick={() => setConfirming(true)}>
            Supprimer le joueur
          </button>
        ))}
    </form>
  );
}
