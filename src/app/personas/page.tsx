"use client";

import { useEffect, useState } from "react";
import { api, type ProviderStatus } from "@/lib/client";
import type { Traits } from "@/lib/db/schema";
import { DEFAULT_TRAITS, TRAITS } from "@/lib/personas";

type Persona = {
  id: string;
  name: string;
  provider: string;
  model: string;
  role: string;
  traits: Traits;
  style: string;
  instructions: string;
  color: string;
};
type Draft = Omit<Persona, "id"> & { id?: string };

const EMPTY: Draft = { name: "", provider: "anthropic", model: "", role: "", traits: DEFAULT_TRAITS, style: "", instructions: "", color: "#6366f1" };

const PRESETS: { label: string; draft: Partial<Draft> }[] = [
  { label: "Pragmatique", draft: { name: "Claude", provider: "anthropic", role: "le pragmatique qui cherche ce qui est réalisable", traits: { creativity: 2, critique: 4, sociability: 2, caution: 4 }, style: "clair et structuré", color: "#d97706" } },
  { label: "Social", draft: { name: "Chat", provider: "openai", role: "l'animateur enthousiaste qui fait rebondir les idées", traits: { creativity: 4, critique: 2, sociability: 5, caution: 2 }, style: "chaleureux et dynamique", color: "#059669" } },
  { label: "Visionnaire", draft: { name: "Gemini", provider: "gemini", role: "le visionnaire qui voit loin", traits: { creativity: 5, critique: 2, sociability: 3, caution: 1 }, style: "imagé et inspirant", color: "#2563eb" } },
  { label: "Avocat du diable", draft: { name: "Critique", role: "l'avocat du diable", traits: { creativity: 2, critique: 5, sociability: 2, caution: 4 }, style: "incisif mais respectueux", color: "#dc2626" } },
];

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<Persona[]>("/api/personas").then(setPersonas).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api<ProviderStatus[]>("/api/keys").then(setProviders).catch(() => {});
  }, []);

  // Modèles disponibles, mémorisés par fournisseur.
  const provider = draft?.provider;
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, { id: string; label: string }[]>>({});
  const models = (provider && modelsByProvider[provider]) || [];
  useEffect(() => {
    if (!provider) return;
    api<{ id: string; label: string }[]>(`/api/models?provider=${provider}`)
      .then((list) => setModelsByProvider((m) => ({ ...m, [provider]: list })))
      .catch(() => {});
  }, [provider]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const defaultModel = (id: string) => providers.find((p) => p.id === id)?.defaultModel ?? "";

  function start(base: Partial<Draft> = {}) {
    const merged = { ...EMPTY, ...base };
    setDraft({ ...merged, model: merged.model || defaultModel(merged.provider) });
    setError(null);
  }

  async function save() {
    if (!draft) return;
    try {
      const { id, ...body } = draft;
      await api(id ? `/api/personas/${id}` : "/api/personas", { method: id ? "PUT" : "POST", json: body });
      setDraft(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    await api(`/api/personas/${id}`, { method: "DELETE" });
    await load();
  }

  const label = (id: string) => providers.find((p) => p.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Personnalités</h1>
          <p className="mt-1 text-sm text-zinc-600">Associe un modèle d&apos;IA à un caractère. Tu pourras les réunir autour d&apos;une même table.</p>
        </div>
        {!draft && (
          <button className="btn" onClick={() => start()}>
            Nouvelle personnalité
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {draft && (
        <div className="card space-y-5">
          {!draft.id && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="hint">Partir d&apos;un modèle :</span>
              {PRESETS.map((p) => (
                <button key={p.label} className="btn-ghost !px-3 !py-1" onClick={() => start(p.draft)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Nom</label>
              <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="ex. Claude" />
            </div>
            <div>
              <label className="label">Rôle dans le groupe</label>
              <input className="input" value={draft.role} onChange={(e) => set({ role: e.target.value })} placeholder="ex. le pragmatique" />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <select className="input" value={draft.provider} onChange={(e) => set({ provider: e.target.value, model: defaultModel(e.target.value) })}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.configured ? "" : " (clé manquante)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Modèle</label>
              <input className="input" list="models" value={draft.model} onChange={(e) => set({ model: e.target.value })} />
              <datalist id="models">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </datalist>
              <p className="hint mt-1">{models.length ? `${models.length} modèles disponibles avec ta clé.` : "Ajoute une clé pour voir la liste des modèles."}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {TRAITS.map((t) => (
              <div key={t.key}>
                <div className="flex justify-between">
                  <label className="label">{t.label}</label>
                  <span className="text-sm text-zinc-500">{draft.traits[t.key]}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  className="w-full accent-indigo-600"
                  value={draft.traits[t.key]}
                  onChange={(e) => set({ traits: { ...draft.traits, [t.key]: Number(e.target.value) } })}
                />
                <p className="hint">{t.levels[draft.traits[t.key] - 1]}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label className="label">Style d&apos;expression</label>
              <input className="input" value={draft.style} onChange={(e) => set({ style: e.target.value })} placeholder="ex. bref et imagé" />
            </div>
            <div>
              <label className="label">Couleur</label>
              <input type="color" className="h-[38px] w-16 rounded-lg border border-zinc-300" value={draft.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Instructions supplémentaires (facultatif)</label>
            <textarea className="input min-h-20" value={draft.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="ex. Tu as 20 ans d'expérience en marketing." />
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setDraft(null)}>
              Annuler
            </button>
            <button className="btn" onClick={save}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {personas.map((p) => (
          <div key={p.id} className="card flex gap-4">
            <div className="mt-1 h-10 w-10 shrink-0 rounded-full" style={{ background: p.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{p.name}</h2>
                  <p className="text-sm text-zinc-600">{p.role || "Participant"}</p>
                </div>
                <div className="flex shrink-0">
                  <button className="btn-ghost !px-3 !py-1" onClick={() => setDraft(p)}>
                    Modifier
                  </button>
                  <button className="btn-danger" onClick={() => remove(p.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
              <p className="hint mt-2">
                {label(p.provider)} · {p.model}
              </p>
              <p className="hint">{TRAITS.map((t) => `${t.label} ${p.traits[t.key]}`).join(" · ")}</p>
            </div>
          </div>
        ))}
        {!personas.length && !draft && <p className="text-sm text-zinc-500">Aucune personnalité pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
