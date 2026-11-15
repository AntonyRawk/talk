"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Session = { id: string; topic: string; status: "running" | "done"; createdAt: string };

export default function Home() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Session[]>("/api/sessions").then(setSessions).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sessions de brainstorm</h1>
          <p className="mt-1 text-sm text-zinc-600">Réunis plusieurs IA, chacune avec sa personnalité, autour d&apos;un même sujet.</p>
        </div>
        <Link href="/sessions/new" className="btn">
          Nouvelle session
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {sessions && !sessions.length && (
        <div className="card space-y-2 text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">Pour commencer :</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Ajoute au moins une clé dans <Link href="/keys" className="text-indigo-600 hover:underline">Clés API</Link>.
            </li>
            <li>
              Crée deux ou trois <Link href="/personas" className="text-indigo-600 hover:underline">personnalités</Link>.
            </li>
            <li>Lance une nouvelle session.</li>
          </ol>
        </div>
      )}

      <div className="space-y-2">
        {sessions?.map((s) => (
          <Link key={s.id} href={`/sessions/${s.id}`} className="card flex items-center justify-between !py-4 hover:border-indigo-300">
            <span className="font-medium">{s.topic}</span>
            <span className="flex items-center gap-3 text-xs text-zinc-500">
              {new Date(s.createdAt).toLocaleDateString("fr-CA")}
              <span className={`rounded-full px-2 py-0.5 ${s.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {s.status === "done" ? "Terminée" : "En cours"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
