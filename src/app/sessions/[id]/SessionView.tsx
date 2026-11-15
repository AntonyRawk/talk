"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Phase, PersonaSnapshot, Scores } from "@/lib/db/schema";
import { PHASE_LABELS, type Turn } from "@/lib/engine/plan";
import { CRITERIA } from "@/lib/scoring";

type Seat = { id: string; displayName: string; isHuman: boolean; persona: PersonaSnapshot | null };
type Message = { id: string; seatId: string; phase: Phase; round: number; content: string; skipped: boolean };
type Rating = { seatId: string | null; scores: Scores; comment: string };
type Idea = {
  id: string;
  title: string;
  description: string;
  authors: string[];
  ratings: Rating[];
  score: { ai: number | null; user: number | null; overall: number | null };
};
type Data = {
  session: { id: string; topic: string; context: string; rounds: number; status: "running" | "done" };
  seats: Seat[];
  messages: Message[];
  ideas: Idea[];
  next: Turn | null;
};
type Live = { seatId: string; phase: Phase; text: string };

const fmt = (n: number | null) => (n === null ? "–" : n.toFixed(1));
const ERROR_MARK = "[[ERREUR]]";

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [humanText, setHumanText] = useState("");
  const auto = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const d = await api<Data>(`/api/sessions/${id}`);
    setData(d);
    return d;
  }, [id]);

  const run = useCallback(async () => {
    if (auto.current) return;
    auto.current = true;
    setRunning(true);
    setError(null);
    try {
      while (auto.current) {
        const res = await fetch(`/api/sessions/${id}/step`, { method: "POST" });
        if (!res.headers.get("Content-Type")?.startsWith("text/plain")) {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Erreur");
          await refresh();
          break; // fin de session ou tour d'un humain
        }
        const seatId = res.headers.get("X-Turn-Seat") ?? "";
        const phase = (res.headers.get("X-Turn-Phase") ?? "echange") as Phase;
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let text = "";
        setLive({ seatId, phase, text });
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setLive({ seatId, phase, text });
        }
        setLive(null);
        await refresh();
        if (text.includes(ERROR_MARK)) throw new Error(text.slice(text.indexOf(ERROR_MARK) + ERROR_MARK.length).trim());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      auto.current = false;
      setRunning(false);
      setLive(null);
    }
  }, [id, refresh]);

  useEffect(() => {
    api<Data>(`/api/sessions/${id}`)
      .then((d) => {
        setData(d);
        // Venant de « Lancer la session » : on démarre directement.
        if (new URLSearchParams(window.location.search).get("auto") && d.next && !d.next.isHuman) run();
      })
      .catch((e) => setError(e.message));
  }, [id, run]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [live?.text, data?.messages.length]);

  async function sendHuman(skip: boolean) {
    try {
      await api(`/api/sessions/${id}/human`, { method: "POST", json: { content: humanText, skip } });
      setHumanText("");
      const d = await refresh();
      if (d.next && !d.next.isHuman) run();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    await api(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (!data) return <p className="text-sm text-zinc-500">{error ?? "Chargement…"}</p>;

  const seat = (seatId: string) => data.seats.find((s) => s.id === seatId);
  const nextSeat = data.next ? seat(data.next.seatId) : undefined;
  const waitingHuman = !running && data.next?.isHuman;

  // Regroupe les messages par étape (et par tour pour les échanges).
  const groups: { key: string; title: string; items: Message[] }[] = [];
  for (const m of data.messages) {
    const key = `${m.phase}:${m.phase === "echange" ? m.round : 0}`;
    const title = m.phase === "echange" ? `${PHASE_LABELS.echange}, tour ${m.round} sur ${data.session.rounds}` : PHASE_LABELS[m.phase];
    if (groups.at(-1)?.key !== key) groups.push({ key, title, items: [] });
    groups.at(-1)!.items.push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="hint hover:underline">
            ← Sessions
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{data.session.topic}</h1>
          {data.session.context && <p className="mt-1 max-w-2xl text-sm text-zinc-600">{data.session.context}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {data.seats.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.persona?.color ?? "#71717a" }} />
                {s.displayName}
                <span className="text-zinc-400">{s.isHuman ? "humain" : s.persona?.model}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {running ? (
            <button className="btn-ghost" onClick={() => (auto.current = false)}>
              Pause après ce tour
            </button>
          ) : (
            data.next &&
            !data.next.isHuman && (
              <button className="btn" onClick={run}>
                {data.messages.length ? "Reprendre" : "Démarrer"}
              </button>
            )
          )}
          <a className="btn-ghost" href={`/api/sessions/${id}/export`}>
            Exporter
          </a>
          <button className="btn-danger" onClick={remove}>
            Supprimer
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {data.ideas.length > 0 && <IdeasTable sessionId={id} ideas={data.ideas} onSaved={refresh} />}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.title}</h2>
            {g.items.map((m) => (
              <Bubble key={m.id} seat={seat(m.seatId)} text={m.skipped ? "A passé son tour." : m.content} muted={m.skipped} />
            ))}
          </section>
        ))}
        {live && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{PHASE_LABELS[live.phase]}</h2>
            <Bubble
              seat={seat(live.seatId)}
              text={live.phase === "synthese" || live.phase === "evaluation" ? (live.phase === "synthese" ? "Synthèse des idées en cours…" : "Évaluation des idées en cours…") : live.text || "…"}
              typing
            />
          </section>
        )}
      </div>

      {waitingHuman && nextSeat && (
        <div className="card space-y-3 border-indigo-300">
          <p className="text-sm font-medium">
            À toi, {nextSeat.displayName} ({data.next!.phase === "divergence" ? "propose tes idées" : `tour ${data.next!.round}`})
          </p>
          <textarea className="input min-h-28" value={humanText} onChange={(e) => setHumanText(e.target.value)} placeholder="Ta contribution…" />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => sendHuman(true)}>
              Passer mon tour
            </button>
            <button className="btn" disabled={!humanText.trim()} onClick={() => sendHuman(false)}>
              Envoyer
            </button>
          </div>
        </div>
      )}

      {data.session.status === "done" && <p className="text-center text-sm text-zinc-500">Session terminée. Tu peux noter les idées ci-dessus.</p>}
      <div ref={bottom} />
    </div>
  );
}

function Bubble({ seat, text, typing, muted }: { seat?: Seat; text: string; typing?: boolean; muted?: boolean }) {
  return (
    <div className="flex gap-3">
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: seat?.persona?.color ?? "#71717a" }}
      >
        {seat?.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {seat?.displayName} {seat?.persona?.role && <span className="font-normal text-zinc-500">· {seat.persona.role}</span>}
        </p>
        <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${muted ? "italic text-zinc-400" : "text-zinc-800"} ${typing ? "animate-pulse" : ""}`}>
          {text.replace(/\*\*/g, "")}
        </p>
      </div>
    </div>
  );
}

function IdeasTable({ sessionId, ideas, onSaved }: { sessionId: string; ideas: Idea[]; onSaved: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="card !p-0">
      <h2 className="border-b border-zinc-200 px-5 py-3 font-medium">Idées retenues</h2>
      <ol>
        {ideas.map((idea, i) => (
          <li key={idea.id} className="border-b border-zinc-100 px-5 py-3 last:border-0">
            <div className="flex items-start gap-4">
              <span className="w-5 text-sm text-zinc-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{idea.title}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{idea.description}</p>
                {idea.authors.length > 0 && <p className="hint mt-1">Portée par {idea.authors.join(", ")}</p>}
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3 text-center text-xs">
                <Score label="IA" value={idea.score.ai} />
                <Score label="Toi" value={idea.score.user} />
                <Score label="Globale" value={idea.score.overall} strong />
              </div>
              <button className="btn-ghost !px-3 !py-1" onClick={() => setOpen(open === idea.id ? null : idea.id)}>
                Noter
              </button>
            </div>
            {open === idea.id && (
              <RateForm
                sessionId={sessionId}
                idea={idea}
                onSaved={() => {
                  setOpen(null);
                  onSaved();
                }}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Score({ label, value, strong }: { label: string; value: number | null; strong?: boolean }) {
  return (
    <div>
      <div className={strong ? "text-base font-semibold" : "text-sm"}>{fmt(value)}</div>
      <div className="text-zinc-400">{label}</div>
    </div>
  );
}

function RateForm({ sessionId, idea, onSaved }: { sessionId: string; idea: Idea; onSaved: () => void }) {
  const mine = idea.ratings.find((r) => r.seatId === null);
  const [scores, setScores] = useState<Scores>(mine?.scores ?? { originalite: 3, faisabilite: 3, impact: 3, cout: 3 });
  const [comment, setComment] = useState(mine?.comment ?? "");
  const aiComments = idea.ratings.filter((r) => r.seatId !== null && r.comment);

  async function save() {
    await api(`/api/sessions/${sessionId}/ratings`, { method: "POST", json: { ideaId: idea.id, scores, comment } });
    onSaved();
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-zinc-50 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {CRITERIA.map((c) => (
          <div key={c.key}>
            <label className="label">
              {c.label} : {scores[c.key]}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              className="w-full accent-indigo-600"
              value={scores[c.key]}
              onChange={(e) => setScores({ ...scores, [c.key]: Number(e.target.value) })}
            />
            <p className="hint">{c.hint}</p>
          </div>
        ))}
      </div>
      <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (facultatif)" />
      {aiComments.length > 0 && (
        <ul className="space-y-1 text-xs text-zinc-600">
          {aiComments.map((r, i) => (
            <li key={i}>• {r.comment}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button className="btn" onClick={save}>
          Enregistrer ma note
        </button>
      </div>
    </div>
  );
}
