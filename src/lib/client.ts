"use client";

/** Petit utilitaire fetch côté navigateur : renvoie le JSON ou lève l'erreur de l'API. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  return data as T;
}

export type ProviderStatus = {
  id: string;
  label: string;
  defaultModel: string;
  keyHelpUrl: string;
  needsKey: boolean;
  configured: boolean;
  last4: string | null;
};
