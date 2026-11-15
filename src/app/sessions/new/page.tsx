"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Persona = { id: string; name: string; role: string; model: string; color: string };
type Human = { name: string; phases: ("divergence" | "echange")[] };

export default function NewSession() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [rounds, setRounds] = useState(2);
  const [turnOrder, setTurnOrder] = useState<"round_robin" | "random">("round_robin");
  const [maxWords, setMaxWords] = useState(150);
  const [selected, setSelected] = useState<string[]>([]);
  const [facilitator, setFacilitator] = useState<string>("");
  const [humans, setHumans] = useState<Human[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Persona[]>("/api/personas").then(setPersonas).catch((e) => setError(e.message));
  }, []);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setHuman = (i: number, patch: Partial<Human>) => setHumans((h) => h.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/sessions", {
        method: "POST",
        json: { topic, context, rounds, turnOrder, maxWords, personaIds: selected, facilitatorPersonaId: facilitator || undefined, humans },
      });
      router.push(`/sessions/${id}?auto=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle session</h1>

      <div className="card space-y-4">
        <div>
          <label className="label">Sujet</label>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ex. Comment attirer plus de clients le mardi soir dans un restaurant ?" />
        </div>
        <div>
          <label className="label">Contexte et contraintes (facultatif)</label>
          <textarea className="input min-h-24" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Budget, public cible, ce qui a déjà été essayé…" />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium">Participants IA</h2>
        <p className="hint">L&apos;ordre de sélection donne l&apos;ordre de parole.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {personas.map((p) => {
            const index = selected.indexOf(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left ${index >= 0 ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300"}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: p.color }}>
                  {index >= 0 ? index + 1 : ""}
                </span>
                <span>
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="hint">{p.role || p.model}</span>
                </span>
              </button>
            );
          })}
        </div>
        {!personas.length && <p className="text-sm text-zinc-500">Crée d&apos;abord des personnalités.</p>}
        {selected.length > 0 && (
          <div>
            <label className="label">Animateur de la synthèse</label>
            <select className="input md:w-1/2" value={facilitator} onChange={(e) => setFacilitator(e.target.value)}>
              <option value="">Le premier participant</option>
              {selected.map((id) => (
                <option key={id} value={id}>
                  {personas.find((p) => p.id === id)?.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Participants humains</h2>
          <button className="btn-ghost !px-3 !py-1" onClick={() => setHumans((h) => [...h, { name: "", phases: ["divergence", "echange"] }])}>
            Ajouter un humain
          </button>
        </div>
        <p className="hint">Un humain prend place à la table : la session l&apos;attend quand c&apos;est son tour. Tu notes les idées toi-même à la fin, dans tous les cas.</p>
        {humans.map((h, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3">
            <input className="input max-w-48" value={h.name} onChange={(e) => setHuman(i, { name: e.target.value })} placeholder="Prénom" />
            {(["divergence", "echange"] as const).map((ph) => (
              <label key={ph} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={h.phases.includes(ph)}
                  onChange={(e) => setHuman(i, { phases: e.target.checked ? [...h.phases, ph] : h.phases.filter((x) => x !== ph) })}
                />
                {ph === "divergence" ? "Idées individuelles" : "Échanges"}
              </label>
            ))}
            <button className="btn-danger" onClick={() => setHumans((x) => x.filter((_, j) => j !== i))}>
              Retirer
            </button>
          </div>
        ))}
      </div>

      <div className="card grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Tours d&apos;échanges</label>
          <input type="number" min={0} max={6} className="input" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Ordre de parole</label>
          <select className="input" value={turnOrder} onChange={(e) => setTurnOrder(e.target.value as "round_robin" | "random")}>
            <option value="round_robin">Tour de table</option>
            <option value="random">Aléatoire à chaque tour</option>
          </select>
        </div>
        <div>
          <label className="label">Longueur max. (mots)</label>
          <input type="number" min={30} max={600} step={10} className="input" value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end">
        <button className="btn" disabled={busy || !topic.trim() || !selected.length} onClick={create}>
          {busy ? "Création…" : "Lancer la session"}
        </button>
      </div>
    </div>
  );
}
