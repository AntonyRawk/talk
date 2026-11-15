"use client";

import { useEffect, useState } from "react";
import { api, type ProviderStatus } from "@/lib/client";

export default function KeysPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<ProviderStatus[]>("/api/keys").then(setProviders).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function save(id: string) {
    setBusy(id);
    setError(null);
    try {
      await api("/api/keys", { method: "POST", json: { provider: id, apiKey: drafts[id] ?? "" } });
      setDrafts((d) => ({ ...d, [id]: "" }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    await api(`/api/keys?provider=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clés API</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Chaque fournisseur facture l&apos;usage de son API directement. Les clés sont vérifiées, puis chiffrées
          avant d&apos;être enregistrées ; elles ne sont jamais renvoyées au navigateur.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {providers.filter((p) => p.needsKey).map((p) => (
          <div key={p.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{p.label}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.configured ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                {p.configured ? `…${p.last4}` : "Non configurée"}
              </span>
            </div>
            <input
              type="password"
              className="input"
              placeholder={p.configured ? "Remplacer la clé" : "Colle ta clé ici"}
              value={drafts[p.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
            />
            <div className="flex items-center justify-between">
              <a href={p.keyHelpUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                Obtenir une clé
              </a>
              <div className="flex gap-2">
                {p.configured && (
                  <button className="btn-danger" onClick={() => remove(p.id)}>
                    Supprimer
                  </button>
                )}
                <button className="btn" disabled={!drafts[p.id] || busy === p.id} onClick={() => save(p.id)}>
                  {busy === p.id ? "Vérification…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
