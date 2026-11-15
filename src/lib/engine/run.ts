import { and, asc, eq } from "drizzle-orm";
import { decrypt } from "../crypto";
import { getDb, schema, LOCAL_USER_ID } from "../db";
import type { PersonaSnapshot } from "../db/schema";
import { getProvider } from "../providers";
import { evaluationSchema, extractJson, synthesisSchema } from "./json";
import { nextTurn, type Turn } from "./plan";
import {
  FACILITATOR_SYSTEM,
  divergencePrompt,
  evaluationPrompt,
  exchangePrompt,
  synthesisPrompt,
  systemFor,
  type TranscriptEntry,
} from "./prompts";

const { sessions, seats, messages, ideas, ratings, providerKeys } = schema;

export async function loadSession(sessionId: string) {
  const db = await getDb();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, LOCAL_USER_ID)),
  });
  if (!session) return null;
  const [seatRows, messageRows, ideaRows, ratingRows] = await Promise.all([
    db.select().from(seats).where(eq(seats.sessionId, sessionId)).orderBy(asc(seats.position)),
    db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.createdAt)),
    db.select().from(ideas).where(eq(ideas.sessionId, sessionId)).orderBy(asc(ideas.position)),
    db.select().from(ratings).where(eq(ratings.sessionId, sessionId)),
  ]);
  return { session, seats: seatRows, messages: messageRows, ideas: ideaRows, ratings: ratingRows };
}

export type Loaded = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

export function currentTurn(data: Loaded): Turn | null {
  return nextTurn(data.session, data.seats, data.messages);
}

async function apiKeyFor(provider: string): Promise<string> {
  if (getProvider(provider).needsKey === false) return "";
  const db = await getDb();
  const row = await db.query.providerKeys.findFirst({
    where: and(eq(providerKeys.userId, LOCAL_USER_ID), eq(providerKeys.provider, provider)),
  });
  if (!row) throw new Error(`Aucune clé API enregistrée pour ${getProvider(provider).label}.`);
  return decrypt(row.encryptedKey);
}

function transcriptOf(data: Loaded): TranscriptEntry[] {
  const byId = new Map(data.seats.map((s) => [s.id, s]));
  return data.messages
    .filter((m) => !m.skipped && (m.phase === "divergence" || m.phase === "echange"))
    .map((m) => {
      const seat = byId.get(m.seatId);
      return {
        name: seat?.displayName ?? "?",
        role: seat?.persona?.role ?? "",
        isHuman: seat?.isHuman ?? false,
        phase: m.phase,
        round: m.round,
        content: m.content,
      };
    });
}

/** Tour d'une IA prêt à être joué : le flux de texte, puis l'enregistrement. */
export type AiTurn = {
  turn: Turn;
  seatName: string;
  stream: AsyncIterable<string>;
  save: (fullText: string) => Promise<void>;
};

export async function prepareAiTurn(data: Loaded, turn: Turn, signal?: AbortSignal): Promise<AiTurn> {
  const seat = data.seats.find((s) => s.id === turn.seatId);
  if (!seat?.persona) throw new Error("Siège IA introuvable.");
  const persona: PersonaSnapshot = seat.persona;
  const s = data.session;
  const transcript = transcriptOf(data);
  const provider = getProvider(persona.provider);
  const apiKey = await apiKeyFor(persona.provider);

  let system = systemFor(persona, s.maxWords, turn.phase);
  let prompt: string;
  let json = false;
  let evaluated: { number: number; id: string; title: string }[] = [];

  switch (turn.phase) {
    case "divergence":
      prompt = divergencePrompt(s);
      break;
    case "echange":
      prompt = exchangePrompt(s, turn.round, transcript);
      break;
    case "synthese":
      system = FACILITATOR_SYSTEM;
      prompt = synthesisPrompt(s, transcript, data.seats.map((x) => x.displayName));
      json = true;
      break;
    case "evaluation": {
      // Une IA ne note jamais les idées dont elle est l'autrice principale.
      const list = data.ideas
        .map((idea, i) => ({ ...idea, number: i + 1 }))
        .filter((idea) => !idea.authors.includes(seat.displayName));
      evaluated = list.map((i) => ({ number: i.number, id: i.id, title: i.title }));
      prompt = evaluationPrompt(s, list);
      json = true;
      break;
    }
  }

  const db = await getDb();
  const insertMessage = (content: string) =>
    db.insert(messages).values({ sessionId: s.id, seatId: seat.id, phase: turn.phase, round: turn.round, content });

  async function save(text: string) {
    if (turn.phase === "synthese") {
      const parsed = synthesisSchema.parse(extractJson(text));
      await db.insert(ideas).values(
        parsed.ideas.map((idea, position) => ({ sessionId: s.id, position, ...idea })),
      );
      const list = parsed.ideas.map((i, n) => `${n + 1}. **${i.title}** : ${i.description}`).join("\n");
      await insertMessage(`${parsed.summary}\n\n${list}`);
    } else if (turn.phase === "evaluation") {
      const parsed = evaluationSchema.parse(extractJson(text));
      const idByNumber = new Map(evaluated.map((e) => [e.number, e.id]));
      const rows = parsed.ratings
        .filter((r) => idByNumber.has(r.idea))
        .map(({ idea, comment, ...scores }) => ({
          ideaId: idByNumber.get(idea)!,
          sessionId: s.id,
          seatId: seat!.id,
          scores,
          comment,
        }));
      if (rows.length) await db.insert(ratings).values(rows);
      const titleByNumber = new Map(evaluated.map((e) => [e.number, e.title]));
      const summary = parsed.ratings
        .filter((r) => idByNumber.has(r.idea))
        .map((r) => `${titleByNumber.get(r.idea)} : ${((r.originalite + r.faisabilite + r.impact + r.cout) / 4).toFixed(1)}/5. ${r.comment}`)
        .join("\n");
      await insertMessage(summary || "Aucune idée à noter.");
    } else {
      await insertMessage(text.trim());
    }
    await markDoneIfFinished(s.id);
  }

  return {
    turn,
    seatName: seat.displayName,
    stream: provider.streamText({ apiKey, model: persona.model, system, prompt, json, signal }),
    save,
  };
}

export async function markDoneIfFinished(sessionId: string) {
  const fresh = await loadSession(sessionId);
  if (fresh && !currentTurn(fresh)) {
    const db = await getDb();
    await db.update(sessions).set({ status: "done" }).where(eq(sessions.id, sessionId));
  }
}

/** Empêche deux tours de la même session de tourner en même temps. */
const running = new Set<string>();
export function tryLock(sessionId: string): (() => void) | null {
  if (running.has(sessionId)) return null;
  running.add(sessionId);
  return () => running.delete(sessionId);
}
